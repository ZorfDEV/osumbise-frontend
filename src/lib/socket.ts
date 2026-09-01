import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    // Pas d'URL explicite : se connecte à la même origine que la page,
    // relayée par le proxy Vite en dev (voir vite.config.ts) — le cookie
    // HttpOnly est donc transmis automatiquement, comme pour les appels API
    socket = io({ withCredentials: true });
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
