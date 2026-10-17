export type EstablishmentType = 'BAR' | 'RESTAURANT' | 'HOTEL' | 'GROSSISTE' | 'EPICERIE';

export interface Establishment {
  id: string;
  name: string;
  type: EstablishmentType;
  address: string | null;
  logo: string | null;
  // Mentions légales facultatives (en-tête des factures)
  phone?: string | null;
  postalBox?: string | null;
  nif?: string | null;
  rc?: string | null;
}
