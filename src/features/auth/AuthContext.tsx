import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/axios';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { AuthUser } from './types';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Le cookie HttpOnly est déjà là si une session existe — cet appel sert
    // juste à récupérer les infos utilisateur et confirmer qu'elle est valide
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        getSocket(); // connexion temps réel dès qu'une session valide existe
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
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
    setUser(res.data.user);
    getSocket();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    disconnectSocket();
  };

  // Appelé après une modification du profil (nom/email) depuis /settings,
  // pour que la sidebar/topbar reflètent le changement immédiatement
  const refreshProfile = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.user);
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
