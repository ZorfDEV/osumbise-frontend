import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { api } from '@/lib/axios';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { leaveOfflineDb, setOfflineUser } from '@/lib/db';
import { clearSession, readSession, saveSession } from '@/lib/sessionCache';
import { AuthUser } from './types';

// Au-delà, le réseau est considéré comme coupé (wifi sans internet…)
const VERIFY_TIMEOUT_MS = 6000;
const VERIFY_RETRY_MS = 15_000;

// Le serveur a répondu que la session n'existe plus ; toute autre erreur
// (coupure, redémarrage du serveur) ne dit rien de la session
const isSessionRejected = (err: unknown) =>
  isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 404);

const fetchMe = async (): Promise<AuthUser> => (await api.get('/auth/me', { timeout: VERIFY_TIMEOUT_MS })).data.user;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    organizationName: string;
    name: string;
    email: string;
    password: string;
    establishmentName: string;
    establishmentType: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);

  // Données hors ligne de l'utilisateur, ouvertes avant le rendu des pages
  const setUser = (next: AuthUser | null) => {
    setOfflineUser(next?.id ?? null);
    // Profil inchangé : même objet, pour ne pas recharger les pages ouvertes
    setUserState((prev) => (prev && next && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  };
  // Profil confirmé par le serveur (next) ou session terminée (null)
  const confirmUser = (next: AuthUser | null) => {
    if (next) saveSession(next);
    else clearSession();
    setUnverified(false);
    setUser(next);
  };
  const [isLoading, setIsLoading] = useState(true);
  // Application rouverte sans internet : profil de l'appareil, à confirmer dès
  // que le serveur répond
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    // Le cookie HttpOnly est déjà là si une session existe — cet appel sert
    // juste à récupérer les infos utilisateur et confirmer qu'elle est valide
    fetchMe()
      .then((me) => {
        confirmUser(me);
        getSocket(); // connexion temps réel dès qu'une session valide existe
      })
      .catch((err) => {
        const known = isSessionRejected(err) ? null : readSession();
        if (!known) {
          if (isSessionRejected(err)) clearSession();
          setUser(null);
          return;
        }
        setUser(known);
        setUnverified(true);
        getSocket(); // se connectera seul au retour du réseau
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session à confirmer : au retour du réseau, et régulièrement (l'appareil peut
  // se croire en ligne alors que le serveur est injoignable)
  useEffect(() => {
    if (!unverified) return;
    let cancelled = false;
    const verify = () => {
      fetchMe()
        .then((me) => !cancelled && confirmUser(me))
        .catch((err) => {
          if (cancelled || !isSessionRejected(err)) return;
          disconnectSocket();
          confirmUser(null);
        });
    };
    window.addEventListener('online', verify);
    const interval = setInterval(verify, VERIFY_RETRY_MS);
    return () => {
      cancelled = true;
      window.removeEventListener('online', verify);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unverified]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    confirmUser(res.data.user);
    getSocket();
  };

  const register = async (payload: {
    organizationName: string;
    name: string;
    email: string;
    password: string;
    establishmentName: string;
    establishmentType: string;
  }) => {
    const res = await api.post('/auth/register', payload);
    confirmUser(res.data.user);
    getSocket();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    await leaveOfflineDb();
    confirmUser(null);
    disconnectSocket();
  };

  // Appelé après une modification du profil (nom/email) depuis /settings,
  // pour que la sidebar/topbar reflètent le changement immédiatement
  const refreshProfile = async () => {
    confirmUser(await fetchMe());
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>');
  }
  return ctx;
};
