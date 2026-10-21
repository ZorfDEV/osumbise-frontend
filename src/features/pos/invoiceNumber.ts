import type { EstablishmentType } from '@/features/establishments/types';

// Numéros de facture faciles à retenir et à rechercher :
//   R0001 — ventes du point de vente (restaurant, bar, et le restaurant d'un hôtel)
//   H0001 — factures de l'hôtel (séjours et groupes, suite distincte)
//   E0001 / G0001 — ventes d'une épicerie / d'un grossiste
// Une commande créée hors ligne n'a pas encore de numéro : repère provisoire.

// Type de l'établissement actif, tenu à jour par ActiveEstablishmentContext :
// sert de préfixe quand la facture ne porte pas elle-même son établissement
let activeType: EstablishmentType | null = null;
export const setInvoiceEstablishmentType = (type: EstablishmentType | null) => {
  activeType = type;
};

export const orderPrefix = (type?: string | null) => (type === 'EPICERIE' ? 'E' : type === 'GROSSISTE' ? 'G' : 'R');

const pad = (n: number) => String(n).padStart(4, '0');

export const invoiceNo = (order: { id: string; number?: number | null; establishment?: { type?: string | null } | null }) =>
  order.number
    ? `${orderPrefix(order.establishment?.type ?? activeType)}${pad(order.number)}`
    : `#${order.id.replace('local-', '').slice(0, 6).toUpperCase()}`;

// Facture de l'hôtel (séjour ou groupe)
export const hotelInvoiceNo = (doc: { id: string; number?: number | null }) =>
  doc.number ? `H${pad(doc.number)}` : `#${doc.id.slice(0, 8).toUpperCase()}`;
