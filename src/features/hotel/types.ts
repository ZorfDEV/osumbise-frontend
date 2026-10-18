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
  notes: string | null;
  isActive: boolean;
  // Séjours réservés ou en cours dont le départ n'est pas passé (3 max)
  stays: StaySummary[];
}

export interface TaxRate {
  category: RoomCategory;
  taxPerNight: number;
}

export interface StayListItem {
  id: string;
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
  lodging: number;
  tax: number;
  charges: number;
  total: number;
  paid: number;
  balance: number;
}

export interface StayDetail {
  id: string;
  // Réservation de groupe (facture unique)
  group?: { id: string; name: string } | null;
  // En-tête de la facture
  establishment?: {
    name: string;
    address: string | null;
    logo: string | null;
    phone?: string | null;
    postalBox?: string | null;
    nif?: string | null;
    rc?: string | null;
  };
  roomId: string;
  room: { id: string; number: string; building?: string; category: RoomCategory; floor: string | null };
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
  }[];
  orders: {
    id: string;
    createdAt: string;
    total: string;
    table: { label: string } | null;
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
