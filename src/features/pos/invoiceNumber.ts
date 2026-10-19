// Numéro de facture affiché : 0001, 0002… (4 chiffres minimum). Une commande
// créée hors ligne n'a pas encore de numéro : on montre un repère provisoire.
export const invoiceNo = (order: { id: string; number?: number | null }) =>
  order.number ? String(order.number).padStart(4, '0') : `#${order.id.replace('local-', '').slice(0, 6).toUpperCase()}`;
