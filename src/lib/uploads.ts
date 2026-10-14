import { api } from './axios';

// Les fichiers envoyés (images produits, logos) sont stockés côté backend avec
// un chemin relatif (ex. "/uploads/establishments/xxx.png") : on le résout
// contre la base de l'API, pas contre l'origine du frontend (elles diffèrent
// en production : osumbice.com / api.osumbice.com). Les URL absolues
// (anciens logos saisis à la main) sont renvoyées telles quelles.
export const resolveUploadUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}${path}`;
};
