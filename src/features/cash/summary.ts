import type { CashSession, SessionOrder } from './types';

// Produits vendus dans la session : quantité totale et montant TTC par
// produit (« Poisson braisé + Riz » compté à part de « + Banane »), ventes
// annulées exclues, les plus vendus en premier
export const productSales = (orders: SessionOrder[] = []) => {
  const map = new Map<string, { name: string; quantity: number; amount: number }>();
  for (const o of orders) {
    if (o.status === 'ANNULEE') continue;
    for (const i of o.items) {
      const name = i.sideProduct ? `${i.product.name} + ${i.sideProduct.name}` : i.product.name;
      const entry = map.get(name) ?? { name, quantity: 0, amount: 0 };
      entry.quantity += i.quantity;
      entry.amount += itemTtcTotal(i);
      map.set(name, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
};

// Montant TTC d'une ligne de facture (quantité × prix de vente TTC) : prix
// TTC fixe tel quel, prix HT + TVA + CSS sinon. Hors remise de la facture.
export const itemTtcTotal = (i: SessionOrder['items'][number]) => {
  const gross = i.quantity * Number(i.unitPrice ?? 0);
  if (i.priceIncludesTax) return Math.round(gross);
  return Math.round((gross * (100 + Number(i.taxRate ?? 0) + Number(i.cssRate ?? 0))) / 100);
};

// Ventes de la session hors tiroir et hors carte/Mobile Money
export const otherMethodsTotal = (orders: SessionOrder[] = []) =>
  orders
    .filter((o) => o.status !== 'ANNULEE')
    .flatMap((o) => o.payments)
    .filter((p) => ['CREDIT', 'ROOM', 'TRANSFER'].includes(p.method))
    .reduce((sum, p) => sum + Number(p.amount), 0);

// Synthèse d'une session à partir de ses mouvements — même règle que le
// backend : seuls espèces, dépenses, remboursements et ajustements touchent
// le tiroir ; carte et Mobile Money sont comptés dans les ventes seulement.
export const summarizeSession = (session: CashSession) => {
  const sum = (type: string) =>
    session.movements.filter((m) => m.type === type).reduce((total, m) => total + Number(m.amount), 0);

  const cashSales = sum('SALE_CASH');
  const cardSales = sum('SALE_CARD');
  const mobileSales = sum('SALE_MOBILE_MONEY');
  const expenses = sum('EXPENSE');
  const refunds = sum('REFUND');
  const adjustments = sum('ADJUSTMENT');
  const openingBalance = Number(session.openingBalance);
  // Nombre de ventes : commandes distinctes encaissées dans la session
  const salesCount = new Set(
    session.movements.filter((m) => m.type.startsWith('SALE_')).map((m) => m.orderId ?? m.id)
  ).size;

  return {
    openingBalance,
    cashSales,
    cardSales,
    mobileSales,
    totalSales: cashSales + cardSales + mobileSales,
    expenses,
    refunds,
    adjustments,
    salesCount,
    theoretical:
      session.theoreticalBalance !== null
        ? Number(session.theoreticalBalance)
        : openingBalance + cashSales + expenses + refunds + adjustments,
  };
};

// Rapport de clôture, partie hôtel : « STD : 2 × 35 500 = 71 000 »
export const ROOM_CATEGORY_SHORT: Record<string, string> = { STANDARD: 'STD', VIP: 'VIP', SUITE: 'SUITE' };
export const HOTEL_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
  TRANSFER: 'Virement',
  CREDIT: 'Compte client',
};
// Taxe de séjour des nuitées vendues, ajoutée au total chambres comme sur la facture
export const hotelRoomsTax = (hotel?: { rooms: { tax?: number }[] }) =>
  (hotel?.rooms ?? []).reduce((sum, r) => sum + (r.tax ?? 0), 0);
// Remises de séjour sur l'hébergement, déduites du total chambres
export const hotelRoomsDiscount = (hotel?: { rooms: { discount?: number }[] }) =>
  (hotel?.rooms ?? []).reduce((sum, r) => sum + (r.discount ?? 0), 0);
export const hotelRoomsTotal = (hotel?: { rooms: { amount: number; tax?: number; discount?: number }[] }) =>
  (hotel?.rooms ?? []).reduce((sum, r) => sum + r.amount, 0) - hotelRoomsDiscount(hotel) + hotelRoomsTax(hotel);
