import type { AuthUser } from '@/features/auth/types';

// Dernier profil confirmé par le serveur, gardé sur l'appareil pour rouvrir
// l'application sans internet. Il ne donne aucun accès : c'est le cookie de
// session, vérifié par le serveur à chaque appel, qui autorise. Effacé à la
// déconnexion ou dès que le serveur refuse la session.
const KEY = 'osumbise:session';
// Durée d'une session côté serveur (COOKIE_MAX_AGE)
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const saveSession = (user: AuthUser) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ user, verifiedAt: Date.now() }));
  } catch {
    // stockage indisponible : pas de réouverture sans internet
  }
};

export const readSession = (): AuthUser | null => {
  try {
    const { user, verifiedAt } = JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {};
    const age = Date.now() - Number(verifiedAt);
    // Âge négatif : horloge de l'appareil reculée
    return user?.id && age >= 0 && age < MAX_AGE_MS ? user : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // stockage indisponible : rien n'y était
  }
};
