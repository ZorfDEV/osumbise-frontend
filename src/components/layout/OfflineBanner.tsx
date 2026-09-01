import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { getOutboxCount } from '@/lib/offlineSync';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const check = () => getOutboxCount().then(setPendingCount);
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [isOnline]);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`px-4 py-1.5 text-center text-xs font-medium ${
        isOnline ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {isOnline
        ? `Synchronisation en cours — ${pendingCount} action(s) en attente`
        : `Hors ligne — les commandes continuent de fonctionner, elles seront synchronisées au retour de la connexion${
            pendingCount > 0 ? ` (${pendingCount} en attente)` : ''
          }`}
    </div>
  );
}
