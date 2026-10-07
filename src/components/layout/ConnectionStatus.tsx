import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { getOutboxActions, isSyncInProgress, syncOutbox } from '@/lib/offlineSync';
import { refreshOfflineCache, getCachedProducts } from '@/lib/offlineCache';
import type { OutboxAction } from '@/lib/db';

const POLL_MS = 3000;

const ACTION_LABELS: Record<OutboxAction['type'], string> = {
  createOrder: 'Nouvelle commande',
  addItem: 'Ajout d’article',
  updateItemQuantity: 'Changement de quantité',
  removeItem: 'Retrait d’article',
  updateStatus: 'Changement de statut',
};

const timeAgo = (ts: number) => {
  const min = Math.floor((Date.now() - ts) / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  return `il y a ${Math.floor(min / 60)} h`;
};

type State = 'online' | 'syncing' | 'offline';

const STYLES: Record<State, { dot: string; pill: string; label: string }> = {
  online: { dot: 'bg-success-accent', pill: 'text-slate-600', label: 'En ligne' },
  syncing: { dot: 'bg-warning-accent animate-pulse', pill: 'text-warning-dark', label: 'Synchronisation' },
  offline: { dot: 'bg-danger', pill: 'text-danger-dark', label: 'Hors ligne' },
};

// Pastille de connexion de la Topbar : état réseau + actions du POS en
// attente de synchronisation, avec le détail au clic.
export default function ConnectionStatus() {
  const isOnline = useOnlineStatus();
  const [actions, setActions] = useState<OutboxAction[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    getOutboxActions()
      .then(setActions)
      .catch(() => setActions([]));
    setIsSyncing(isSyncInProgress());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh, isOnline]);

  // Noms des produits pour détailler les ajouts (cache hors ligne)
  useEffect(() => {
    if (!isOpen) return;
    getCachedProducts()
      .then((products) => setProductNames(Object.fromEntries(products.map((p) => [p.id, p.name]))))
      .catch(() => {});
  }, [isOpen]);

  // Fermeture au clic à l'extérieur ou avec Échap
  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const pending = actions.length;
  const state: State = !isOnline ? 'offline' : pending > 0 || isSyncing ? 'syncing' : 'online';
  const style = STYLES[state];

  const syncNow = async () => {
    setIsSyncing(true);
    await syncOutbox();
    await refreshOfflineCache().catch(() => {});
    refresh();
  };

  const describe = (a: OutboxAction) => {
    const name = typeof a.payload.productId === 'string' ? productNames[a.payload.productId] : undefined;
    const qty = typeof a.payload.quantity === 'number' ? ` × ${a.payload.quantity}` : '';
    return name ? `${ACTION_LABELS[a.type]} : ${name}${qty}` : ACTION_LABELS[a.type];
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-label={`${style.label}${pending ? `, ${pending} action${pending > 1 ? 's' : ''} en attente` : ''}`}
        className={`flex h-9 items-center gap-2 rounded-full border border-slate-200 px-2.5 text-xs font-semibold transition-colors hover:bg-slate-50 sm:px-3 ${style.pill}`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="hidden sm:inline">{style.label}</span>
        {pending > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[0.7rem] text-slate-700">{pending}</span>}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="État de la connexion"
          className="absolute right-0 top-11 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-surface p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isOnline ? 'bg-success-soft text-success-dark' : 'bg-danger-soft text-danger-dark'
              }`}
            >
              {isOnline ? <Wifi size={18} /> : <CloudOff size={18} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-heading">{isOnline ? 'Connecté' : 'Pas de connexion'}</p>
              <p className="text-xs text-slate-500">
                {!isOnline
                  ? 'Les commandes continuent de fonctionner. Elles seront envoyées au retour de la connexion. L’encaissement reste indisponible.'
                  : pending > 0
                    ? 'Des actions faites hors ligne sont en cours d’envoi.'
                    : 'Toutes les actions sont enregistrées sur le serveur.'}
              </p>
            </div>
          </div>

          {pending > 0 && (
            <>
              <p className="mb-1 mt-4 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                En attente ({pending})
              </p>
              <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto text-sm">
                {actions.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-slate-700">{describe(a)}</span>
                    <span className="shrink-0 text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
              {isOnline && (
                <button onClick={syncNow} aria-busy={isSyncing} className="btn btn-secondary btn-sm mt-3 w-full">
                  {!isSyncing && <RefreshCw size={14} />}
                  {isSyncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
