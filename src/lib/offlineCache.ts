import { getDb } from './db';
import { fetchProducts, fetchCategories } from '@/features/products/api';
import { fetchTables } from '@/features/pos/api';

export const refreshOfflineCache = async () => {
  try {
    const [products, categories, tables] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchTables(),
    ]);

    const db = await getDb();
    await Promise.all([
      (async () => {
        const tx = db.transaction('products', 'readwrite');
        await tx.store.clear();
        await Promise.all(products.map((p) => tx.store.put(p)));
        await tx.done;
      })(),
      (async () => {
        const tx = db.transaction('categories', 'readwrite');
        await tx.store.clear();
        await Promise.all(categories.map((c) => tx.store.put(c)));
        await tx.done;
      })(),
      (async () => {
        const tx = db.transaction('tables', 'readwrite');
        await tx.store.clear();
        await Promise.all(tables.map((t) => tx.store.put(t)));
        await tx.done;
      })(),
    ]);
  } catch {
    // Pas grave si ça échoue (ex. réseau instable) : le cache existant reste
    // utilisable, on retentera au prochain passage en ligne
  }
};

export const getCachedProducts = async () => {
  const db = await getDb();
  return db.getAll('products');
};

export const getCachedCategories = async () => {
  const db = await getDb();
  return db.getAll('categories');
};

export const getCachedTables = async () => {
  const db = await getDb();
  return db.getAll('tables');
};
