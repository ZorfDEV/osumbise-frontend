import { getDb, OutboxAction } from '@/lib/db';
import { enqueueAction, getPendingActions, isLocalId, isOutage, resolveOrderId, syncOutbox, waitForSync } from '@/lib/offlineSync';
import * as api from './api';
import { Order } from './types';
import { computeOrderTotals } from './taxes';

const getCachedOrder = async (orderId: string): Promise<Order> => {
  const db = await getDb();
  const order = (await db.get('orders', orderId)) ?? (await db.get('orders', await resolveOrderId(orderId)));
  if (!order) throw new Error('Commande indisponible hors connexion');
  return order;
};

const saveOrderLocally = async (order: Order) => {
  const db = await getDb();
  await db.put('orders', order);
};

// Commande reçue du serveur, gardée pour le hors ligne : un stockage plein ou
// bloqué ne doit pas faire échouer une opération réussie
const cacheOrder = (order: Order) => saveOrderLocally(order).catch(() => undefined);

// La commande peut-elle être modifiée directement sur le serveur ? Seulement si
// rien n'attend pour elle dans la file : l'ordre des actions doit être respecté.
const onlineOrderId = async (orderId: string): Promise<string | null> => {
  if (!navigator.onLine) return null;
  try {
    if ((await getPendingActions(orderId)).length > 0) await syncOutbox();
    const id = await resolveOrderId(orderId);
    return isLocalId(id) || (await getPendingActions(orderId)).length > 0 ? null : id;
  } catch {
    // Stockage local indisponible : rien ne peut attendre, on travaille en ligne
    return isLocalId(orderId) ? null : orderId;
  }
};

// Des actions de cette commande ne sont pas encore sur le serveur (encaissement
// impossible tant que le total n'est pas complet)
export const hasUnsentActions = async (orderId: string): Promise<boolean> => (await onlineOrderId(orderId)) === null;

const recalculateLocalTotals = (order: Order) => {
  // Même calcul que le serveur (orderTotals.ts) : prix HT ou prix TTC fixe,
  // remise, TVA et CSS arrondies au franc
  const { subtotal, discount, tax, total } = computeOrderTotals(
    order.items.map((i) => ({
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      taxRate: Number(i.taxRate ?? 0),
      cssRate: Number(i.cssRate ?? 0),
      priceIncludesTax: !!i.priceIncludesTax,
    })),
    { amount: Number(order.discount), rate: order.discountRate != null ? Number(order.discountRate) : null }
  );
  order.subtotal = String(subtotal);
  order.discount = String(discount);
  order.tax = String(tax);
  order.total = String(total);
};

// --- Lecture ---------------------------------------------------------------

export const loadOrder = async (orderId: string): Promise<Order> => {
  // Stockage local indisponible : on lit simplement le serveur
  const id = await resolveOrderId(orderId).catch(() => orderId);
  // Des actions en attente : la version locale les contient, pas le serveur
  const pending = await getPendingActions(orderId).then((list) => list.length > 0, () => false);
  if (navigator.onLine && !isLocalId(id) && !pending) {
    try {
      const order = await api.fetchOrder(id);
      await cacheOrder(order);
      return order;
    } catch {
      // Bascule sur secours hors ligne juste en dessous
    }
  }
  return getCachedOrder(orderId).catch((err) => {
    // Modifiée en ligne depuis un autre écran : rien en cache, on lit le serveur
    if (navigator.onLine && !isLocalId(id)) return api.fetchOrder(id);
    throw err;
  });
};

// --- Création ----------------------------------------------------------

export const createOrder = async (payload: {
  tableId?: string;
  customerId?: string;
  establishmentId?: string;
  // Suite d'une facture déjà payée (même table, même client)
  followsOrderId?: string;
}): Promise<Order> => {
  const ref = crypto.randomUUID();
  if (navigator.onLine) {
    try {
      const order = await api.createOrder({ ...payload, clientRef: ref });
      await cacheOrder(order);
      return order;
    } catch (err) {
      // Un refus du serveur n'est pas une coupure
      if (!isOutage(err)) throw err;
      // Bascule sur secours hors ligne juste en dessous
    }
  }

  const localId = `local-${ref}`;
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
  await enqueueAction({ id: ref, type: 'createOrder', localOrderId: localId, payload });
  return localOrder;
};

// --- Lignes de commande ------------------------------------------------

export const addOrderItem = async (
  orderId: string,
  product: {
    id: string;
    name: string;
    sellingPrice: string;
    effectivePrice?: number;
    tva?: string;
    css?: string;
    priceIncludesTax?: boolean;
    preparationArea?: 'KITCHEN' | 'BAR';
  },
  quantity: number,
  // Accompagnement choisi avec le plat (riz, banane…)
  side: { id: string; name: string } | null = null
): Promise<void> => {
  const ref = crypto.randomUUID();
  const onlineId = await onlineOrderId(orderId);
  if (onlineId) {
    try {
      await api.addOrderItem(onlineId, { productId: product.id, quantity, sideProductId: side?.id ?? null, clientRef: ref });
      return;
    } catch (err) {
      if (!isOutage(err)) throw err;
      // Bascule sur mise à jour locale + file d'attente juste en dessous
    }
  }

  const order = await getCachedOrder(orderId);

  // Même plat ET même accompagnement : on augmente la quantité, mais seulement
  // d'une ligne pas encore envoyée (le serveur, lui, créera une ligne à part)
  const existing = order.items.find(
    (i) => i.id.startsWith('local-item-') && i.productId === product.id && (i.sideProductId ?? null) === (side?.id ?? null)
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    order.items.push({
      id: `local-item-${ref}`,
      productId: product.id,
      quantity,
      // Approximation hors ligne : reprend la remise vue au dernier chargement
      // du catalogue (offlineCache) ; le serveur recalcule la valeur exacte
      // au moment de la synchro (addOrderItem, order.controller.ts)
      unitPrice: String(product.effectivePrice ?? product.sellingPrice),
      taxRate: product.tva ?? '0',
      cssRate: product.css ?? '0',
      priceIncludesTax: !!product.priceIncludesTax,
      sideProductId: side?.id ?? null,
      sideProduct: side,
      note: null,
      product: { name: product.name, preparationArea: product.preparationArea },
    });
  }
  recalculateLocalTotals(order);
  await saveOrderLocally(order);

  await enqueueAction({
    id: ref,
    type: 'addItem',
    localOrderId: order.id,
    payload: { productId: product.id, quantity, sideProductId: side?.id ?? null },
  });
};

// Ligne ajoutée hors ligne et pas encore envoyée : on corrige ses ajouts dans
// la file, sinon la quantité d'origine (ou l'article retiré) partirait quand même
const rewritePendingAdds = async (
  orderId: string,
  item: { productId: string; sideProductId?: string | null },
  quantity: number
) => {
  // Un envoi en cours pourrait être en train d'expédier cet ajout
  await waitForSync();
  const adds = (await getPendingActions(orderId)).filter(
    (a: OutboxAction) =>
      a.type === 'addItem' &&
      a.payload.productId === item.productId &&
      (a.payload.sideProductId ?? null) === (item.sideProductId ?? null)
  );
  if (adds.length === 0) throw new Error('Cet article vient d’être envoyé : réessayez');

  const db = await getDb();
  const tx = db.transaction('outbox', 'readwrite');
  const [first, ...others] = adds;
  for (const a of others) tx.store.delete(a.id);
  if (quantity <= 0) tx.store.delete(first.id);
  else tx.store.put({ ...first, payload: { ...first.payload, quantity } });
  await tx.done;
};

export const updateOrderItemQuantity = async (
  orderId: string,
  itemId: string,
  quantity: number
): Promise<void> => {
  const isLocalItem = itemId.startsWith('local-item-');
  const onlineId = isLocalItem ? null : await onlineOrderId(orderId);
  if (onlineId) {
    try {
      if (quantity <= 0) {
        await api.removeOrderItem(onlineId, itemId);
      } else {
        await api.updateOrderItem(onlineId, itemId, quantity);
      }
      return;
    } catch (err) {
      if (!isOutage(err)) throw err;
      // Bascule sur mise à jour locale + file d'attente juste en dessous
    }
  }

  if (isLocalItem) await waitForSync();
  const order = await getCachedOrder(orderId);
  const item = order.items.find((i) => i.id === itemId);
  if (!item) throw new Error('Cet article vient d’être envoyé : réessayez');

  if (isLocalItem) {
    await rewritePendingAdds(orderId, item, quantity);
  } else if (quantity <= 0) {
    await enqueueAction({ type: 'removeItem', localOrderId: order.id, payload: { itemId } });
  } else {
    await enqueueAction({ type: 'updateItemQuantity', localOrderId: order.id, payload: { itemId, quantity } });
  }

  if (quantity <= 0) order.items = order.items.filter((i) => i.id !== itemId);
  else item.quantity = quantity;
  recalculateLocalTotals(order);
  await saveOrderLocally(order);
};

// --- Statut --------------------------------------------------------------

export const advanceOrderStatus = async (orderId: string, status: string): Promise<void> => {
  const onlineId = await onlineOrderId(orderId);
  if (onlineId) {
    try {
      await api.updateOrderStatus(onlineId, status);
      return;
    } catch (err) {
      if (!isOutage(err)) throw err;
      // Bascule sur mise à jour locale + file d'attente juste en dessous
    }
  }

  const order = await getCachedOrder(orderId);
  order.status = status as Order['status'];
  await saveOrderLocally(order);

  await enqueueAction({ type: 'updateStatus', localOrderId: order.id, payload: { status } });
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

// Commande prise hors ligne pour cette table et pas encore envoyée : le plan de
// salle, lui, affiche toujours la table libre
export const findUnsentOrderForTable = async (tableId: string): Promise<Order | null> => {
  const db = await getDb();
  const all = await db.getAll('orders');
  return (
    all.find((o) => isLocalId(o.id) && o.tableId === tableId && ACTIVE_ORDER_STATUSES.includes(o.status)) ?? null
  );
};
