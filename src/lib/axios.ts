import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // indispensable : envoie/reçoit le cookie JWT HttpOnly
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
