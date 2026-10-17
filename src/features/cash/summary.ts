import type { CashSession } from './types';

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
