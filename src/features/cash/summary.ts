import type { CashSession, SessionOrder } from './types';

// Quantités totales vendues par produit sur les factures de la session
// (les ventes annulées ensuite sont exclues)
export const productTotals = (orders: SessionOrder[] = []) => {
  const map = new Map<string, { name: string; quantity: number }>();
  for (const o of orders) {
    if (o.status === 'ANNULEE') continue;
    for (const i of o.items) {
      const entry = map.get(i.product.id) ?? { name: i.product.name, quantity: 0 };
      entry.quantity += i.quantity;
      map.set(i.product.id, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
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
