export type RoomCategory = 'STANDARD' | 'VIP' | 'SUITE';
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'OUT_OF_SERVICE';
export type StayStatus = 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
export type StayPaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'TRANSFER' | 'CREDIT';

export interface StaySummary {
  id: string;
  guestName: string;
  status: StayStatus;
  checkInDate: string;
  checkOutDate: string;
  // Réservation de groupe
  group?: { id: string; name: string } | null;
  // Séjour en cours : état de la facture
  billing?: { total: number; paid: number; balance: number } | null;
}

export interface Room {
  id: string;
  number: string;
  // "" = aucun bâtiment
  building: string;
  category: RoomCategory;
  floor: string | null;
  capacity: number;
  nightlyRate: string;
  status: RoomStatus;
  // Hors service : motif et date
  outOfServiceReason?: string | null;
  outOfServiceAt?: string | null;
  notes: string | null;
  isActive: boolean;
  // Séjours réservés ou en cours dont le départ n'est pas passé (3 max)
  stays: StaySummary[];
}

// TVA et CSS (%) ajoutées au prix HT de la nuitée, par type de chambre
export interface TaxRate {
  category: RoomCategory;
  tva: number;
  css: number;
}

// TVA et CSS d'une nuitée HT (arrondies au franc, comme le serveur)
export const lodgingTaxes = (lodging: number, rate?: TaxRate) => {
  const vat = Math.round((lodging * (rate?.tva ?? 0)) / 100);
  const css = Math.round((lodging * (rate?.css ?? 0)) / 100);
  return { vat, css, total: lodging + vat + css };
};

// « 18 % »
export const pct = (n: number | string) => `${Number(n).toLocaleString('fr-FR')} %`;

export interface StayListItem {
  id: string;
  // Numéro de facture de l'hôtel (H0001)
  number?: number | null;
  roomId: string;
  room: { id: string; number: string; building?: string; category: RoomCategory };
  guestName: string;
  guestPhone: string | null;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  status: StayStatus;
  nightlyRate: string;
  taxPerNight: string;
  payments: { amount: string }[];
  group?: { id: string; name: string } | null;
}

export interface StayTotals {
  nights: number;
  // Hébergement HT
  lodging: number;
  // Ancienne taxe de séjour fixe (séjours enregistrés avant TVA/CSS)
  tax: number;
  // TVA et CSS sur l'hébergement (après remise)
  vat?: number;
  css?: number;
  taxRate?: number;
  cssRate?: number;
  charges: number;
  // Prestations de l'hôtel (pressing, room service…)
  services: number;
  // Remise accordée (hors taxe de séjour)
  discount: number;
  total: number;
  paid: number;
  balance: number;
}

export interface StayDetail {
  id: string;
  // Numéro de facture de l'hôtel (H0001)
  number?: number | null;
  customerId?: string | null;
  // Client enregistré (compte client)
  customer?: { id: string; name: string; phone: string | null; balance: string; creditLimit: string | null } | null;
  // Réservation de groupe (facture unique)
  group?: { id: string; name: string } | null;
  // En-tête de la facture
  establishment?: {
    name: string;
    address: string | null;
    logo: string | null;
    phone?: string | null;
    email?: string | null;
    postalBox?: string | null;
    nif?: string | null;
    rc?: string | null;
  };
  roomId: string;
  room: { id: string; number: string; building?: string; category: RoomCategory; floor: string | null; status?: RoomStatus };
  // Prestations ajoutées à la facture (pressing, room service…)
  charges?: {
    id: string;
    label: string;
    category: string;
    quantity: number;
    unitPrice: string;
    note: string | null;
    createdAt: string;
    user: { name: string };
  }[];
  guestName: string;
  guestPhone: string | null;
  guestIdNumber: string | null;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  nightlyRate: string;
  taxPerNight: string;
  discountRate?: string | null;
  discountReason?: string | null;
  status: StayStatus;
  notes: string | null;
  user: { name: string };
  payments: {
    id: string;
    method: StayPaymentMethod;
    amount: string;
    note: string | null;
    createdAt: string;
    user: { name: string };
    // Méthode CREDIT : compte client débité
    customer?: { id: string; name: string } | null;
    // Espèces remises et monnaie rendue
    cashReceived?: string | null;
    changeGiven?: string;
  }[];
  orders: {
    id: string;
    createdAt: string;
    total: string;
    table: { label: string } | null;
    establishment?: { name: string };
    items: { id: string; quantity: number; unitPrice: string; product: { name: string } }[];
    payments: { method: string; amount: string }[];
  }[];
  totals: StayTotals;
}

export interface StayPayload {
  roomId: string;
  guestName: string;
  guestPhone?: string;
  guestIdNumber?: string;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  nightlyRate?: number;
  checkInNow?: boolean;
  // Client enregistré ; null le détache
  customerId?: string | null;
}

export interface RoomPayload {
  number: string;
  building?: string;
  category: RoomCategory;
  floor?: string;
  capacity: number;
  nightlyRate: number;
  notes?: string;
}
