// Détail des taxes d'une commande, pour le panier et la facture :
// Total HT, puis une ligne par taxe et par taux (TVA 18 %, CSS 1 %…),
// puis Total TTC. Même calcul que le serveur (order.service.ts) : chaque
// taxe est calculée sur la base HT des articles à ce taux, arrondie au franc.

export interface TaxLine {
  label: string;
  rate: number;
  amount: number;
}

type TaxedItem = { quantity: number; unitPrice: string; taxRate?: string; cssRate?: string };

export const taxBreakdown = (items: TaxedItem[]): TaxLine[] => {
  const bases = new Map<string, { label: string; rate: number; base: number }>();
  const add = (label: string, rate: number, base: number) => {
    if (!rate) return;
    const key = `${label}-${rate}`;
    const current = bases.get(key) ?? { label, rate, base: 0 };
    current.base += base;
    bases.set(key, current);
  };
  for (const item of items) {
    const base = item.quantity * Number(item.unitPrice);
    add('TVA', Number(item.taxRate ?? 0), base);
    add('CSS', Number(item.cssRate ?? 0), base);
  }
  return [...bases.values()]
    .map((b) => ({ label: b.label, rate: b.rate, amount: Math.round((b.base * b.rate) / 100) }))
    .sort((a, b) => (a.label === b.label ? b.rate - a.rate : a.label === 'TVA' ? -1 : 1));
};

export const taxTotal = (items: TaxedItem[]) => taxBreakdown(items).reduce((sum, t) => sum + t.amount, 0);

// « TVA 18 % » / « CSS 1 % »
export const taxLabel = (t: TaxLine) => `${t.label} ${t.rate.toLocaleString('fr-FR')} %`;
