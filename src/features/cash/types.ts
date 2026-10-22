export interface CashRegister {
  id: string;
  name: string;
  // Le backend ne renvoie que la session ouverte (le cas échéant), déjà filtrée
  sessions: { id: string; openedAt: string; plannedCloseAt?: string | null; openedById: string; openedBy?: { name: string } }[];
  // Verrouillée par le propriétaire : aucune ouverture de session possible
  isLocked?: boolean;
  lockedReason?: string | null;
  lockedAt?: string | null;
}

export type CashMovementType =
  | 'SALE_CASH'
  | 'SALE_CARD'
  | 'SALE_MOBILE_MONEY'
  | 'EXPENSE'
  | 'REFUND'
  | 'ADJUSTMENT';

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: string;
  note: string | null;
  orderId?: string | null;
  createdAt: string;
}

export interface CashSession {
  id: string;
  cashRegisterId: string;
  cashRegister?: {
    name: string;
    // En-tête du rapport de clôture
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
  };
  openedById?: string;
  openedBy?: { name: string };
  closedBy?: { name: string } | null;
  openedAt: string;
  // Fin de service prévue, indiquée à l'ouverture
  plannedCloseAt?: string | null;
  openingBalance: string;
  closedAt: string | null;
  theoreticalBalance: string | null;
  actualBalance: string | null;
  discrepancy: string | null;
  movements: CashMovement[];
  // Factures encaissées dans la session (détail du rapport de clôture)
  orders?: SessionOrder[];
  // Hôtel : chambres des séjours encaissés dans la session (nuitées × tarif,
  // par catégorie) et versements par mode de paiement
  hotel?: SessionHotel;
}

export interface SessionHotel {
  rooms: { category: 'STANDARD' | 'VIP' | 'SUITE'; nightlyRate: number; nights: number; amount: number }[];
  payments: { method: string; amount: number }[];
}

export interface SessionOrder {
  id: string;
  number: number | null;
  status: string;
  total: string;
  table: { label: string } | null;
  customer: { name: string } | null;
  items: { quantity: number; product: { id: string; name: string } }[];
  payments: { method: string; amount: string }[];
}
