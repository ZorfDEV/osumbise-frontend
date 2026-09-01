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
      manifest: {
        name: 'Osumbise POS',
        short_name: 'Osumbise',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f172a',
        // Icônes réelles à fournir plus tard (192x192 et 512x512 minimum)
        // pour une installation PWA complète sur mobile
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
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
