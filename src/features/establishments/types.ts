export type EstablishmentType = 'BAR' | 'RESTAURANT' | 'HOTEL' | 'GROSSISTE' | 'EPICERIE';

export interface Establishment {
  id: string;
  name: string;
  type: EstablishmentType;
  address: string | null;
  logo: string | null;
}
