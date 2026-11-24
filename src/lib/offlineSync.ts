import { isAxiosError } from 'axios';
import { FailedAction, getDb, getOfflineUserId, OfflineDb, OutboxAction } from './db';
import { api, getActiveEstablishmentId, OFFLINE_CAPABLE } from './axios';

export const ACTION_FAILED_EVENT = 'offline-action-failed';
export const SYNCED_EVENT = 'offline-synced';
export const ORDER_REMAPPED_EVENT = 'offline-order-remapped';

const MAX_SERVER_ERRORS = 3;

export const isLocalId = (id: string) => id.startsWith('local-');

// Serveur injoignable (coupure, redémarrage) : seule raison de basculer hors
// ligne. Toute autre réponse est une vraie décision du serveur.
export const isOutage = (err: unknown) =>
  isAxiosError(err) && (!err.response || [502, 503, 504].includes(err.response.status));

const byDate = (a: OutboxAction, b: OutboxAction) => a.createdAt - b.createdAt;

// Horodatage strictement croissant : deux actions de la même milliseconde
// gardent leur ordre
let lastCreatedAt = 0;
const nextCreatedAt = () => {
  lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1);
  return lastCreatedAt;
};

// id : identifiant de l'action pour le serveur (clientRef). Le reprendre d'un
// envoi qui a échoué évite un doublon si le serveur l'avait reçu quand même.
export const enqueueAction = async (
  action: Omit<OutboxAction, 'id' | 'createdAt'> & { id?: string }
): Promise<OutboxAction> => {
  const db = await getDb();
  const entry: OutboxAction = {
    ...action,
    id: action.id ?? crypto.randomUUID(),
    createdAt: nextCreatedAt(),
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
  return (await db.getAll('outbox')).sort(byDate);
};

export const getFailedActions = async (): Promise<FailedAction[]> => {
  const db = await getDb();
  return (await db.getAll('failed')).sort(byDate);
};

// Id réel d'une commande créée hors ligne, une fois envoyée ; sinon id inchangé
export const resolveOrderId = async (orderId: string): Promise<string> => {
  if (!isLocalId(orderId)) return orderId;
  const db = await getDb();
  return (await db.get('idMap', orderId))?.realId ?? orderId;
};

// Actions en attente pour une commande, sous son id local ou réel
export const getPendingActions = async (orderId: string): Promise<OutboxAction[]> => {
  const realId = await resolveOrderId(orderId);
  const actions = await getOutboxActions();
  const ids = await Promise.all(actions.map((a) => resolveOrderId(a.localOrderId)));
  return actions.filter((_, i) => ids[i] === realId);
};

// --- Actions refusées ------------------------------------------------------

// Nouvel essai de toutes les actions refusées, dans leur ordre d'origine
export const retryFailedActions = async () => {
  const db = await getDb();
  const tx = db.transaction(['failed', 'outbox'], 'readwrite');
  for (const { message: _message, failedAt: _failedAt, ...action } of await tx.objectStore('failed').getAll()) {
    tx.objectStore('outbox').put({ ...action, attempts: 0 });
    tx.objectStore('failed').delete(action.id);
  }
  await tx.done;
  await syncOutbox();
};

// Abandon d'une action refusée ; abandonner une création abandonne la commande
export const ignoreFailedAction = async (id: string) => {
  const db = await getDb();
  const tx = db.transaction(['failed', 'orders'], 'readwrite');
  const failed = tx.objectStore('failed');
  const action = await failed.get(id);
  if (action) {
    failed.delete(id);
    if (action.type === 'createOrder') {
      for (const other of await failed.getAll()) {
        if (other.localOrderId === action.localOrderId) failed.delete(other.id);
      }
      tx.objectStore('orders').delete(action.localOrderId);
    }
  }
  await tx.done;
};

const moveToFailed = async (db: OfflineDb, action: OutboxAction, message: string) => {
  const tx = db.transaction(['outbox', 'failed'], 'readwrite');
  tx.objectStore('outbox').delete(action.id);
  tx.objectStore('failed').put({ ...action, message, failedAt: Date.now() });
  await tx.done;
};

// --- Envoi -----------------------------------------------------------------

const STATUS_FLOW = ['BROUILLON', 'EN_ATTENTE', 'EN_PREPARATION', 'PRETE', 'SERVIE', 'PAYEE', 'FERMEE'];

// Action déjà faite sur le serveur (réponse perdue au premier envoi) ?
const isAlreadyDone = async (action: OutboxAction, orderId: string, status: number) => {
  if (action.type === 'removeItem') return status === 404;
  if (action.type !== 'updateStatus' || status !== 409) return false;
  const target = String(action.payload.status);
  const current = (await api.get(`/orders/${orderId}`, OFFLINE_CAPABLE)).data.order.status as string;
  if (current === target) return true;
  return STATUS_FLOW.includes(target) && STATUS_FLOW.indexOf(current) > STATUS_FLOW.indexOf(target);
};

const send = async (action: OutboxAction, orderId: string): Promise<string | undefined> => {
  // Établissement d'origine de l'action (prioritaire sur l'établissement actif)
  const scoped = {
    ...OFFLINE_CAPABLE,
    ...(action.establishmentId ? { headers: { 'X-Establishment-Id': action.establishmentId } } : {}),
  };

  switch (action.type) {
    case 'createOrder':
      return (await api.post('/orders', { ...action.payload, clientRef: action.id }, scoped)).data.order.id;
    case 'addItem':
      await api.post(`/orders/${orderId}/items`, { ...action.payload, clientRef: action.id }, scoped);
      return;
    case 'updateItemQuantity':
      await api.patch(`/orders/${orderId}/items/${action.payload.itemId}`, { quantity: action.payload.quantity }, scoped);
      return;
    case 'removeItem':
      await api.delete(`/orders/${orderId}/items/${action.payload.itemId}`, scoped);
      return;
    case 'updateStatus':
      await api.patch(`/orders/${orderId}/status`, { status: action.payload.status }, scoped);
  }
};

const complete = async (db: OfflineDb, action: OutboxAction, realId?: string) => {
  const tx = db.transaction(['outbox', 'idMap', 'orders'], 'readwrite');
  tx.objectStore('outbox').delete(action.id);
  if (realId) {
    tx.objectStore('idMap').put({ localId: action.localOrderId, realId });
    // La copie locale reste disponible, sous son id réel, si le réseau recoupe
    const orders = tx.objectStore('orders');
    const local = await orders.get(action.localOrderId);
    if (local) orders.put({ ...local, id: realId });
    orders.delete(action.localOrderId);
  }
  await tx.done;
  if (realId) {
    window.dispatchEvent(new CustomEvent(ORDER_REMAPPED_EVENT, { detail: { localId: action.localOrderId, realId } }));
  }
};

// Copies locales des commandes envoyées remplacées par la version du serveur
// (vrais id de lignes, prix exacts), sauf si d'autres actions attendent
const refreshOrders = async (db: OfflineDb, orderIds: Set<string>) => {
  for (const id of orderIds) {
    if ((await getPendingActions(id)).length > 0) continue;
    const order = (await api.get(`/orders/${id}`, OFFLINE_CAPABLE)).data.order;
    await db.put('orders', order);
  }
};

// Envoie la file dans l'ordre chronologique. S'arrête si le serveur est
// injoignable (ou l'abonnement en lecture seule) pour reprendre plus tard ;
// une action refusée est mise de côté et les suivantes continuent.
const runSync = async (userId: string) => {
  const db = await getDb();
  if ((await db.count('outbox')) === 0) return;

  // Session du navigateur passée à un autre compte (autre onglet) : surtout ne
  // pas envoyer ces actions en son nom
  const me = await api.get('/auth/me', OFFLINE_CAPABLE);
  if (me.data.user.id !== userId) return;

  const touched = new Set<string>();
  const refused: FailedAction['message'][] = [];
  try {
    while (getOfflineUserId() === userId) {
      // Relue à chaque tour : l'écran a pu modifier ou ajouter une action
      const [action] = (await db.getAll('outbox')).sort(byDate);
      if (!action) break;

      const orderId = await resolveOrderId(action.localOrderId);
      if (action.type !== 'createOrder' && isLocalId(orderId)) {
        // Sa commande n'a pas pu être créée : l'action ne peut pas partir seule
        await moveToFailed(db, action, 'La création de cette commande n’a pas abouti');
        refused.push('La création de cette commande n’a pas abouti');
        continue;
      }

      try {
        const realId = await send(action, orderId);
        await complete(db, action, realId);
        touched.add(realId ?? orderId);
      } catch (err) {
        const status = isAxiosError(err) ? err.response?.status : undefined;
        // Coupure, session expirée, lecture seule, trop de requêtes : plus tard
        if (!status || [401, 402, 408, 429, 502, 503, 504].includes(status)) throw err;
        if (await isAlreadyDone(action, orderId, status)) {
          await complete(db, action);
          touched.add(orderId);
          continue;
        }
        if (status >= 500) {
          const attempts = (action.attempts ?? 0) + 1;
          if (attempts < MAX_SERVER_ERRORS) {
            await db.put('outbox', { ...action, attempts });
            throw err;
          }
        }
        const data = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined) : undefined;
        const message = data?.message ?? 'Action refusée par le serveur';
        await moveToFailed(db, action, message);
        refused.push(message);
        if (!isLocalId(orderId)) touched.add(orderId);
      }
    }
  } finally {
    await refreshOrders(db, touched).catch(() => undefined);
    if (touched.size > 0 || refused.length > 0) window.dispatchEvent(new CustomEvent(SYNCED_EVENT));
    if (refused.length > 0) {
      window.dispatchEvent(new CustomEvent(ACTION_FAILED_EVENT, { detail: { count: refused.length, message: refused[0] } }));
    }
  }
};

let running: Promise<void> | null = null;
export const isSyncInProgress = () => running !== null;

// Un seul envoi à la fois, y compris entre les onglets de ce navigateur
export const syncOutbox = (): Promise<void> => {
  if (running) return running;
  const userId = getOfflineUserId();
  if (!userId || !navigator.onLine) return Promise.resolve();

  const run = () => runSync(userId);
  running = (
    navigator.locks
      ? navigator.locks.request(`osumbise-sync-${userId}`, { ifAvailable: true }, (lock) => (lock ? run() : undefined))
      : run()
  )
    .then(() => undefined)
    .catch((err) => {
      console.error('Synchronisation interrompue, réessai plus tard :', err);
    })
    .finally(() => {
      running = null;
    });
  return running;
};

// Attend la fin d'un envoi en cours avant de modifier une action de la file
export const waitForSync = () => running ?? Promise.resolve();
