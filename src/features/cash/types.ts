export interface CashRegister {
  id: string;
  name: string;
  // Le backend ne renvoie que la session ouverte (le cas échéant), déjà filtrée
  sessions: { id: string; openedAt: string; openedById: string; openedBy?: { name: string } }[];
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
  openingBalance: string;
  closedAt: string | null;
  theoreticalBalance: string | null;
  actualBalance: string | null;
  discrepancy: string | null;
  movements: CashMovement[];
}
