import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Origine du serveur temps réel, déduite de VITE_API_URL :
// - vide ou relative ("/api") : même origine que la page, relayée par le
//   proxy Vite en dev (voir vite.config.ts) ou par le serveur en production ;
// - absolue ("https://api.osumbice.com/api") : origine de l'API, quand le
//   frontend et le backend sont servis sur deux sous-domaines.
const socketOrigin = (): string | undefined => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl || !/^https?:\/\//.test(apiUrl)) return undefined;
  return new URL(apiUrl).origin;
};

export const getSocket = (): Socket => {
  if (!socket) {
    // withCredentials : le cookie HttpOnly de session accompagne la connexion,
    // comme pour les appels API (le backend l'exige pour authentifier)
    const origin = socketOrigin();
    socket = origin ? io(origin, { withCredentials: true }) : io({ withCredentials: true });
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
