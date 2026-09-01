import { useEffect } from 'react';
import { syncOutbox } from './offlineSync';
import { refreshOfflineCache } from './offlineCache';

export default function OfflineSyncManager() {
  useEffect(() => {
    // Au chargement de l'app : utile si une coupure a eu lieu lors d'une
    // session précédente et que des actions attendent toujours en file
    if (navigator.onLine) {
      syncOutbox().then(() => refreshOfflineCache());
    }

    const handleOnline = () => {
      syncOutbox().then(() => refreshOfflineCache());
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
}
