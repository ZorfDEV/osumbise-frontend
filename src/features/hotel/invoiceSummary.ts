import type { StayPaymentMethod } from './types';

export interface SummaryLine {
  label: string;
  amount: number;
}

// Argent réellement versé (remboursements déduits) et part mise sur un compte
// client, pas encore payée
export const splitPayments = (payments: { method: StayPaymentMethod; amount: string }[]) => {
  const sum = (list: { amount: string }[]) => list.reduce((total, p) => total + Number(p.amount), 0);
  return {
    advance: sum(payments.filter((p) => p.method !== 'CREDIT')),
    onAccount: sum(payments.filter((p) => p.method === 'CREDIT')),
  };
};

// Bas de facture : avance versée, part mise sur un compte client (pas encore
// payée) et reste à payer. Remboursements déduits de l'avance.
export const invoiceSummary = (
  payments: { method: StayPaymentMethod; amount: string }[],
  balance: number
): SummaryLine[] => {
  const { advance, onAccount } = splitPayments(payments);
  const due = Math.round(balance);
  const lines: SummaryLine[] = [];
  const settled = due <= 0 && onAccount <= 0;
  if (advance > 0) lines.push({ label: settled ? 'TOTAL VERSÉ' : 'AVANCE VERSÉE', amount: advance });
  if (onAccount > 0) lines.push({ label: 'RESTE SUR COMPTE CLIENT', amount: onAccount });
  if (due > 0) lines.push({ label: 'RESTE À PAYER', amount: due });
  else if (due < 0) lines.push({ label: 'TROP-PERÇU', amount: -due });
  else if (settled) lines.push({ label: 'SOLDÉ', amount: 0 });
  return lines;
};
