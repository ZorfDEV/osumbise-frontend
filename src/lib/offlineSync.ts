import { getDb, OutboxAction } from './db';
import { api, getActiveEstablishmentId } from './axios';

export const enqueueAction = async (
  action: Omit<OutboxAction, 'id' | 'createdAt'>
): Promise<OutboxAction> => {
  const db = await getDb();
  const entry: OutboxAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    establishmentId: getActiveEstablishmentId(),
  };
  await db.put('outbox', entry);
  return entry;
};

export const getOutboxCount = async (): Promise<number> => {
  const db = await getDb();
  return db.count('outbox');
};

// Actions en attente, de la plus ancienne à la plus récente (pastille de
// connexion de la Topbar)
export const getOutboxActions = async (): Promise<OutboxAction[]> => {
  const db = await getDb();
  return (await db.getAll('outbox')).sort((a, b) => a.createdAt - b.createdAt);
};

let isSyncing = false;
export const isSyncInProgress = () => isSyncing;

// Rejoue la file dans l'ordre chronologique. S'arrête à la première erreur
// plutôt que de continuer : les actions suivantes dépendent souvent de la
// précédente (ajouter un article à une commande dont la création vient
// d'échouer n'a pas de sens), donc mieux vaut réessayer plus tard en bloc.
export const syncOutbox = async () => {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    const db = await getDb();
    const actions = (await db.getAll('outbox')).sort((a, b) => a.createdAt - b.createdAt);

    // Remappe un id local (local-xxx) vers l'id réel renvoyé par le serveur
    // une fois que la commande correspondante a été créée pour de vrai
    const idMap = new Map<string, string>();

    for (const action of actions) {
      const realOrderId = idMap.get(action.localOrderId) ?? action.localOrderId;
      // Établissement d'origine de l'action (prioritaire sur l'établissement actif)
      const scoped = action.establishmentId ? { headers: { 'X-Establishment-Id': action.establishmentId } } : {};

      try {
        if (action.type === 'createOrder') {
          const res = await api.post('/orders', action.payload, scoped);
          const realId = res.data.order.id as string;
          idMap.set(action.localOrderId, realId);
          window.dispatchEvent(
            new CustomEvent('offline-order-remapped', {
              detail: { localId: action.localOrderId, realId },
            })
          );
        } else if (action.type === 'addItem') {
          await api.post(`/orders/${realOrderId}/items`, action.payload, scoped);
        } else if (action.type === 'updateItemQuantity') {
          await api.patch(`/orders/${realOrderId}/items/${action.payload.itemId}`, {
            quantity: action.payload.quantity,
          }, scoped);
        } else if (action.type === 'removeItem') {
          await api.delete(`/orders/${realOrderId}/items/${action.payload.itemId}`, scoped);
        } else if (action.type === 'updateStatus') {
          await api.patch(`/orders/${realOrderId}/status`, { status: action.payload.status }, scoped);
        }

        await db.delete('outbox', action.id);
      } catch (err) {
        console.error('Synchronisation interrompue sur une action, réessai plus tard :', err);
        break;
      }
    }
  } finally {
    isSyncing = false;
  }
};
