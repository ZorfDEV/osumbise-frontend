import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { ALL_ESTABLISHMENTS, api, setActiveEstablishmentId } from '@/lib/axios';
import { AppLoader } from '@/components/ui/skeleton';
import { refreshOfflineCache } from '@/lib/offlineCache';
import type { Establishment, EstablishmentType } from './types';

// Établissement "actif" d'un propriétaire (OWNER) : il n'est rattaché à aucun
// établissement fixe et choisit, dans la Topbar, celui sur lequel il travaille.
// Toutes les requêtes portent alors l'en-tête X-Establishment-Id (lib/axios).
// Pour les autres rôles, l'établissement vient du compte : rien ne change.

interface EffectiveEstablishment {
  id: string | null;
  name: string | null;
  logo: string | null;
  type: EstablishmentType | null;
}

interface ActiveEstablishmentValue {
  // Liste des établissements (propriétaire uniquement, sinon vide)
  establishments: Establishment[];
  // Le propriétaire peut-il changer d'établissement ?
  canSwitch: boolean;
  // Établissement en cours, pour tous les rôles
  current: EffectiveEstablishment;
  setActive: (id: string) => void;
  // À appeler après une création ou une modification d'établissement
  reload: () => Promise<void>;
}

const ActiveEstablishmentContext = createContext<ActiveEstablishmentValue | undefined>(undefined);

const storageKey = (userId: string) => `osumbise:active-establishment:${userId}`;
// Dernière liste connue, utilisée hors ligne
const listKey = (userId: string) => `osumbise:establishments:${userId}`;

export function ActiveEstablishmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Peut choisir son établissement : le propriétaire, ou un administrateur à
  // qui il a donné accès à tous ses établissements
  const isOwner =
    !!user && ((user.role === 'OWNER' && !user.establishmentId) || (user.role === 'ADMIN' && !!user.multiEstablishment));
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  // Valeur courante lue par reload() sans le recréer à chaque changement
  const activeIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!isOwner);

  const apply = useCallback(
    (id: string | null) => {
      // Mis à jour AVANT le rendu des pages : leurs premiers appels API
      // portent déjà le bon établissement
      setActiveEstablishmentId(id);
      activeIdRef.current = id;
      setActiveIdState(id);
      if (user && id) {
        try {
          localStorage.setItem(storageKey(user.id), id);
        } catch {
          // stockage indisponible : le choix vaut pour cette session
        }
      }
    },
    [user]
  );

  const reload = useCallback(async () => {
    if (!isOwner || !user) return;
    const read = (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };
    let list: Establishment[];
    try {
      const res = await api.get('/establishments', ALL_ESTABLISHMENTS);
      list = res.data.establishments;
      try {
        localStorage.setItem(listKey(user.id), JSON.stringify(list));
      } catch {
        // stockage indisponible : pas de secours hors ligne
      }
    } catch {
      // Hors ligne (ou serveur injoignable) : dernière liste connue, pour que
      // le POS continue de fonctionner sur le bon établissement
      try {
        list = JSON.parse(read(listKey(user.id)) ?? '[]');
      } catch {
        list = [];
      }
    }
    setEstablishments(list);
    // On garde le choix précédent s'il existe toujours, sinon le premier
    const stored = read(storageKey(user.id));
    // Administrateur : son établissement de rattachement par défaut
    const current =
      list.find((e) => e.id === (activeIdRef.current ?? stored)) ??
      list.find((e) => e.id === user.establishmentId) ??
      list[0];
    apply(current?.id ?? null);
    setReady(true);
  }, [isOwner, user, apply]);

  useEffect(() => {
    if (!isOwner) {
      setActiveEstablishmentId(null);
      setReady(true);
      return;
    }
    setReady(false);
    reload();
  }, [isOwner, reload]);

  // Déconnexion / changement de compte : on ne laisse pas traîner l'en-tête
  useEffect(() => () => setActiveEstablishmentId(null), []);

  const value = useMemo<ActiveEstablishmentValue>(() => {
    const active = establishments.find((e) => e.id === activeId) ?? null;
    const current: EffectiveEstablishment = isOwner
      ? { id: active?.id ?? null, name: active?.name ?? null, logo: active?.logo ?? null, type: active?.type ?? null }
      : {
          id: user?.establishmentId ?? null,
          name: user?.establishment?.name ?? null,
          logo: user?.establishment?.logo ?? null,
          type: user?.establishmentType ?? null,
        };
    return {
      establishments,
      canSwitch: isOwner && establishments.length > 0,
      current,
      // Changement par l'utilisateur : la copie hors ligne du catalogue suit
      // le nouvel établissement (sinon, en cas de coupure, le POS afficherait
      // les produits de l'ancien)
      setActive: (id: string) => {
        apply(id);
        if (navigator.onLine) refreshOfflineCache();
      },
      reload,
    };
  }, [establishments, activeId, isOwner, user, apply, reload]);

  if (!ready) return <AppLoader />;

  return <ActiveEstablishmentContext.Provider value={value}>{children}</ActiveEstablishmentContext.Provider>;
}

export const useActiveEstablishment = () => {
  const ctx = useContext(ActiveEstablishmentContext);
  if (!ctx) throw new Error('useActiveEstablishment doit être utilisé dans <ActiveEstablishmentProvider>');
  return ctx;
};
