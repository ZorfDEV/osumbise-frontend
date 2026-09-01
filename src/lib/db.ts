import { openDB, DBSchema, IDBPDatabase } from 'idb';
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
}

interface OsumbiseDB extends DBSchema {
  products: { key: string; value: Product };
  categories: { key: string; value: Category };
  tables: { key: string; value: DiningTable };
  orders: { key: string; value: Order };
  outbox: { key: string; value: OutboxAction };
}

let dbPromise: Promise<IDBPDatabase<OsumbiseDB>> | null = null;

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<OsumbiseDB>('osumbise-offline', 1, {
      upgrade(db) {
        db.createObjectStore('products', { keyPath: 'id' });
        db.createObjectStore('categories', { keyPath: 'id' });
        db.createObjectStore('tables', { keyPath: 'id' });
        db.createObjectStore('orders', { keyPath: 'id' });
        db.createObjectStore('outbox', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};
