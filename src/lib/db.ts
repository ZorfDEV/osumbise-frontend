import { deleteDB, openDB, DBSchema, IDBPDatabase } from 'idb';
import { Order } from '@/features/pos/types';
import { Product } from '@/features/products/types';
import { Category } from '@/features/products/types';
import { DiningTable } from '@/features/pos/types';

export interface OutboxAction {
  id: string;
  type: 'createOrder' | 'addItem' | 'updateItemQuantity' | 'removeItem' | 'updateStatus';
  // Id de la commande côté client au moment où l'action a été mise en file —
  // peut être un id local (local-xxx) tant que createOrder n'a pas encore
  // été rejouée avec succès
  localOrderId: string;
  payload: Record<string, unknown>;
  createdAt: number;
  // Établissement actif (propriétaire) au moment de l'action : rejoué tel
  // quel, même si le propriétaire a changé d'établissement entre-temps
  establishmentId?: string | null;
  // Essais ayant échoué sur une erreur interne du serveur
  attempts?: number;
}

// Action refusée par le serveur : mise de côté et signalée, sans bloquer la file
export interface FailedAction extends OutboxAction {
  message: string;
  failedAt: number;
}

// Commande créée hors ligne (local-xxx) et son id réel, gardés sur l'appareil :
// une synchronisation interrompue reprend où elle s'était arrêtée
export interface OrderIdMapping {
  localId: string;
  realId: string;
}

interface OsumbiseDB extends DBSchema {
  products: { key: string; value: Product };
  categories: { key: string; value: Category };
  tables: { key: string; value: DiningTable };
  orders: { key: string; value: Order };
  outbox: { key: string; value: OutboxAction };
  failed: { key: string; value: FailedAction };
  idMap: { key: string; value: OrderIdMapping };
}

export type OfflineDb = IDBPDatabase<OsumbiseDB>;

// Une base par utilisateur : sur un poste partagé, personne ne voit ni n'envoie
// sous son nom les commandes hors ligne d'un autre. Elles attendent le retour
// de leur auteur sur cet appareil.
const LEGACY_NAME = 'osumbise-offline';
const dbName = (userId: string) => `${LEGACY_NAME}-${userId}`;

let currentUserId: string | null = null;
let dbPromise: Promise<OfflineDb> | null = null;

export const getOfflineUserId = () => currentUserId;

// Appelé par AuthContext à chaque connexion, changement de compte, déconnexion
export const setOfflineUser = (userId: string | null) => {
  if (userId === currentUserId) return;
  dbPromise?.then((db) => db.close()).catch(() => undefined);
  currentUserId = userId;
  dbPromise = null;
};

// Ancienne base, commune à tous les utilisateurs du poste : ce qui attendait
// encore d'être envoyé revient au premier connecté (comme avant), puis elle
// est supprimée
const adoptLegacyDb = async (db: OfflineDb) => {
  const known = await indexedDB.databases?.();
  if (known && !known.some((d) => d.name === LEGACY_NAME)) return;

  const legacy = await openDB(LEGACY_NAME);
  try {
    if (legacy.objectStoreNames.contains('outbox') && legacy.objectStoreNames.contains('orders')) {
      const [actions, orders] = await Promise.all([legacy.getAll('outbox'), legacy.getAll('orders')]);
      if (actions.length > 0) {
        const tx = db.transaction(['outbox', 'orders'], 'readwrite');
        for (const a of actions) tx.objectStore('outbox').put(a as OutboxAction);
        for (const o of orders) tx.objectStore('orders').put(o as Order);
        await tx.done;
        await legacy.clear('outbox');
      }
    }
  } finally {
    legacy.close();
  }
  // Sans attendre : un autre onglet resté ouvert peut retarder la suppression
  deleteDB(LEGACY_NAME).catch(() => undefined);
};

const open = async (userId: string): Promise<OfflineDb> => {
  const db = await openDB<OsumbiseDB>(dbName(userId), 1, {
    upgrade(database) {
      database.createObjectStore('products', { keyPath: 'id' });
      database.createObjectStore('categories', { keyPath: 'id' });
      database.createObjectStore('tables', { keyPath: 'id' });
      database.createObjectStore('orders', { keyPath: 'id' });
      database.createObjectStore('outbox', { keyPath: 'id' });
      database.createObjectStore('failed', { keyPath: 'id' });
      database.createObjectStore('idMap', { keyPath: 'localId' });
    },
    // Suppression demandée par un autre onglet (déconnexion)
    blocking(_current, _blocked, event) {
      (event.target as IDBDatabase).close();
      if (currentUserId === userId) dbPromise = null;
    },
  });
  await adoptLegacyDb(db).catch((err) => console.error('Reprise des anciennes données hors ligne impossible :', err));
  return db;
};

export const getDb = (): Promise<OfflineDb> => {
  if (!currentUserId) return Promise.reject(new Error('Données hors ligne : aucun utilisateur connecté'));
  if (!dbPromise) {
    const opening = open(currentUserId);
    dbPromise = opening;
    // Un échec d'ouverture ne doit pas rester en mémoire
    opening.catch(() => {
      if (dbPromise === opening) dbPromise = null;
    });
  }
  return dbPromise;
};

// Déconnexion : les données de l'utilisateur quittent l'appareil, sauf s'il
// reste des actions à envoyer ou refusées (il les retrouvera en se reconnectant)
export const leaveOfflineDb = async () => {
  const userId = currentUserId;
  if (!userId) return;
  let keep = true;
  try {
    const db = await getDb();
    keep = (await db.count('outbox')) > 0 || (await db.count('failed')) > 0;
    db.close();
  } catch {
    // base inaccessible : rien à supprimer
  }
  setOfflineUser(null);
  if (!keep) deleteDB(dbName(userId)).catch(() => undefined);
};
