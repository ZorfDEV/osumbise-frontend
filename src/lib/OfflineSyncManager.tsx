import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { ACTION_FAILED_EVENT, getOutboxCount, syncOutbox } from './offlineSync';
import { refreshOfflineCache } from './offlineCache';
import { useToast } from './toast';

const RETRY_MS = 30_000;

export default function OfflineSyncManager() {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    // À la connexion : utile si une coupure a eu lieu lors d'une session
    // précédente et que des actions attendent toujours en file
    const syncAndRefresh = () => {
      syncOutbox().then(() => refreshOfflineCache());
    };
    if (navigator.onLine) syncAndRefresh();

    // Serveur injoignable alors que l'appareil se croit en ligne : pas
    // d'événement « online » à attendre, on réessaie régulièrement
    const interval = setInterval(() => {
      getOutboxCount()
        .then((count) => (count > 0 ? syncOutbox() : undefined))
        .catch(() => undefined);
    }, RETRY_MS);

    window.addEventListener('online', syncAndRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', syncAndRefresh);
    };
  }, [userId]);

  useEffect(() => {
    const onFailed = (e: Event) => {
      const { count, message } = (e as CustomEvent<{ count: number; message: string }>).detail;
      toast.error(
        count > 1
          ? `${count} actions faites hors ligne ont été refusées. Voir la pastille de connexion.`
          : `Action hors ligne refusée : ${message}`
      );
    };
    window.addEventListener(ACTION_FAILED_EVENT, onFailed);
    return () => window.removeEventListener(ACTION_FAILED_EVENT, onFailed);
  }, [toast]);

  return null;
}
