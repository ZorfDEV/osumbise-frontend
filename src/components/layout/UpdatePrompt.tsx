import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

// L'application est installée (Service Worker) : elle garde sa version en
// mémoire. Un poste de caisse reste ouvert toute la journée, donc on vérifie
// les mises à jour régulièrement, et on propose de recharger plutôt que de le
// faire d'office (pour ne pas couper un encaissement en cours).
const CHECK_EVERY_MS = 15 * 60 * 1000;

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onRegisteredSW: (_url, registration) => {
        if (!registration) return;
        timer = window.setInterval(() => {
          if (navigator.onLine) registration.update().catch(() => undefined);
        }, CHECK_EVERY_MS);
      },
    });
    return () => window.clearInterval(timer);
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-[90] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-info-dark shadow-lg lg:bottom-6"
    >
      <RefreshCw size={18} className="shrink-0" />
      <p className="flex-1 text-sm font-medium">Nouvelle version d’Osumbice disponible.</p>
      <button onClick={() => updateRef.current?.(true)} className="btn btn-primary btn-sm">
        Mettre à jour
      </button>
    </div>
  );
}
