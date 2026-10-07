import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Ne met en cache QUE l'app shell (JS/CSS/HTML) : /api et /socket.io
      // doivent toujours être tentés en direct, jamais servis depuis le
      // cache du Service Worker — c'est offlineApi.ts qui gère leur secours
      // (IndexedDB), pas lui.
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
      },
      // Fichiers de public/ à mettre en cache pour l'app installée
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png'],
      // Seul manifeste de l'app : le plugin le génère et l'injecte dans
      // index.html (ne pas ajouter de <link rel="manifest"> à la main)
      manifest: {
        name: 'Osumbise POS',
        short_name: 'Osumbise',
        description: 'Point de vente pour bars, restaurants, hôtels, épiceries et grossistes — même hors ligne.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#4A6B5D',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // écoute sur 0.0.0.0 — accessible depuis d'autres appareils du réseau, pas seulement localhost
    port: 5173,
    proxy: {
      // Le navigateur voit localhost:5173 comme seule origine — Vite relaie
      // silencieusement vers le backend. C'est ce qui évite tout problème de
      // cookie HttpOnly cross-origin/SameSite en dev (cf. la mise en place de
      // cookie-parser, plus tôt) : le cookie posé par le backend est vu par
      // le navigateur comme venant de la même origine que la page.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Sans ça, la connexion WebSocket de Socket.IO échouerait silencieusement
      // en dev (elle n'est pas sous /api, donc pas couverte par la règle du dessus)
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
