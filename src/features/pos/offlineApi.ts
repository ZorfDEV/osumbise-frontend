import { getDb } from '@/lib/db';
import { enqueueAction } from '@/lib/offlineSync';
import * as api from './api';
import { Order } from './types';

const isLocalId = (id: string) => id.startsWith('local-');

const getCachedOrder = async (orderId: string): Promise<Order | null> => {
  const db = await getDb();
  return (await db.get('orders', orderId)) ?? null;
};

const saveOrderLocally = async (order: Order) => {
  const db = await getDb();
  await db.put('orders', order);
};

const recalculateLocalTotals = (order: Order) => {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0
  );
  order.subtotal = String(subtotal);
  order.total = String(subtotal - Number(order.discount) + Number(order.tax));
};

// --- Lecture ---------------------------------------------------------------

export const loadOrder = async (orderId: string): Promise<Order> => {
  if (navigator.onLine && !isLocalId(orderId)) {
    try {
      const order = await api.fetchOrder(orderId);
      await saveOrderLocally(order);
      return order;
    } catch {
      // Bascule sur secours hors ligne juste en dessous
    }
  }

  const cached = await getCachedOrder(orderId);
  if (!cached) {
    throw new Error('Commande introuvable, y compris dans le cache local');
  }
  return cached;
};

// --- Création ----------------------------------------------------------

export const createOrder = async (payload: {
  tableId?: string;
  customerId?: string;
  establishmentId?: string;
}): Promise<Order> => {
  if (navigator.onLine) {
    try {
      const order = await api.createOrder(payload);
      await saveOrderLocally(order);
      return order;
    } catch {
      // Bascule sur secours hors ligne juste en dessous
    }
  }

  const localId = `local-${crypto.randomUUID()}`;
  const localOrder: Order = {
    id: localId,
    status: 'BROUILLON',
    tableId: payload.tableId ?? null,
    table: null,
    customerId: payload.customerId ?? null,
    subtotal: '0',
    discount: '0',
    tax: '0',
    total: '0',
    items: [],
  };
  await saveOrderLocally(localOrder);
  await enqueueAction({ type: 'createOrder', localOrderId: localId, payload });
  return localOrder;
};

// --- Lignes de commande ------------------------------------------------

export const addOrderItem = async (
  orderId: string,
  product: { id: string; name: string; sellingPrice: string; effectivePrice?: number },
  quantity: number
): Promise<void> => {
  if (navigator.onLine && !isLocalId(orderId)) {
    try {
      await api.addOrderItem(orderId, { productId: product.id, quantity });
      return;
    } catch {
      // Bascule sur mise à jour locale + file d'attente juste en dessous
    }
  }

  const order = await getCachedOrder(orderId);
  if (!order) return;

  const existing = order.items.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    order.items.push({
      id: `local-item-${crypto.randomUUID()}`,
      productId: product.id,
      quantity,
      // Approximation hors ligne : reprend la remise vue au dernier chargement
      // du catalogue (offlineCache) ; le serveur recalcule la valeur exacte
      // au moment de la synchro (addOrderItem, order.controller.ts)
      unitPrice: String(product.effectivePrice ?? product.sellingPrice),
      note: null,
      product: { name: product.name },
    });
  }
  recalculateLocalTotals(order);
  await saveOrderLocally(order);

  await enqueueAction({
    type: 'addItem',
    localOrderId: orderId,
    payload: { productId: product.id, quantity },
  });
};

export const updateOrderItemQuantity = async (
  orderId: string,
  itemId: string,
  quantity: number
): Promise<void> => {
  if (navigator.onLine && !isLocalId(orderId) && !itemId.startsWith('local-item-')) {
    try {
      if (quantity <= 0) {
        await api.removeOrderItem(orderId, itemId);
      } else {
        await api.updateOrderItem(orderId, itemId, quantity);
      }
      return;
    } catch {
      // Bascule sur mise à jour locale + file d'attente juste en dessous
    }
  }

  const order = await getCachedOrder(orderId);
  if (!order) return;

  if (quantity <= 0) {
    order.items = order.items.filter((i) => i.id !== itemId);
    if (!itemId.startsWith('local-item-')) {
      await enqueueAction({ type: 'removeItem', localOrderId: orderId, payload: { itemId } });
    }
  } else {
    const item = order.items.find((i) => i.id === itemId);
    if (item) item.quantity = quantity;
    if (!itemId.startsWith('local-item-')) {
      await enqueueAction({
        type: 'updateItemQuantity',
        localOrderId: orderId,
        payload: { itemId, quantity },
      });
    }
  }
  recalculateLocalTotals(order);
  await saveOrderLocally(order);
};

// --- Statut --------------------------------------------------------------

export const advanceOrderStatus = async (orderId: string, status: string): Promise<void> => {
  if (navigator.onLine && !isLocalId(orderId)) {
    try {
      await api.updateOrderStatus(orderId, status);
      return;
    } catch {
      // Bascule sur mise à jour locale + file d'attente juste en dessous
    }
  }

  const order = await getCachedOrder(orderId);
  if (!order) return;
  order.status = status as Order['status'];
  await saveOrderLocally(order);

  await enqueueAction({ type: 'updateStatus', localOrderId: orderId, payload: { status } });
};

// Utilisé par TablesPage pour retrouver la commande d'une table occupée
// quand la liste live (fetchOrders) est inaccessible hors ligne
const ACTIVE_ORDER_STATUSES = ['BROUILLON', 'EN_ATTENTE', 'EN_PREPARATION', 'PRETE', 'SERVIE'];

export const findLocalActiveOrderForTable = async (tableId: string): Promise<Order | null> => {
  const db = await getDb();
  const all = await db.getAll('orders');
  return (
    all.find((o) => o.tableId === tableId && ACTIVE_ORDER_STATUSES.includes(o.status)) ?? null
  );
};
