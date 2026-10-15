import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // indispensable : envoie/reçoit le cookie JWT HttpOnly
});

// --- Établissement actif (propriétaire multi-établissements) -------------
// Défini par ActiveEstablishmentProvider. Envoyé dans l'en-tête
// X-Establishment-Id : le backend limite alors toutes les données à cet
// établissement (vérifié côté serveur, voir tenant.middleware.ts). Ignoré
// par le backend pour les autres rôles, rattachés à un établissement fixe.
let activeEstablishmentId: string | null = null;
export const setActiveEstablishmentId = (id: string | null) => {
  activeEstablishmentId = id;
};
export const getActiveEstablishmentId = () => activeEstablishmentId;

// Pour un appel qui doit porter sur toute l'organisation (vue consolidée du
// tableau de bord, liste des établissements du sélecteur) :
//   api.get('/…', ALL_ESTABLISHMENTS)
export const ALL_ESTABLISHMENTS = { headers: { 'X-Establishment-Scope': 'all' } };

api.interceptors.request.use((config) => {
  if (config.headers['X-Establishment-Scope'] === 'all') {
    delete config.headers['X-Establishment-Scope'];
  } else if (activeEstablishmentId && !config.headers['X-Establishment-Id']) {
    // Un en-tête déjà fourni (rejeu d'une action hors ligne) est conservé
    config.headers['X-Establishment-Id'] = activeEstablishmentId;
  }
  return config;
});

// Si le cookie est absent ou expiré, un appel API renvoie 401 — on redirige
// vers /login, SAUF dans deux cas où ce 401 est parfaitement normal :
// - la vérification initiale /auth/me (c'est justement comme ça qu'on sait
//   qu'on n'est pas connecté, pas une session qui expire en cours d'usage)
// - une page déjà publique (/, /login, /register), qui n'a pas besoin d'être
//   authentifiée pour s'afficher
const PUBLIC_PATHS = ['/', '/login', '/register'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck = error.config?.url?.includes('/auth/me');
    const isPublicPage = PUBLIC_PATHS.includes(window.location.pathname);
    if (error.response?.status === 401 && !isAuthCheck && !isPublicPage) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
