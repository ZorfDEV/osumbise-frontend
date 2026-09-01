export interface CashRegister {
  id: string;
  name: string;
  // Le backend ne renvoie que la session ouverte (le cas échéant), déjà filtrée
  sessions: { id: string }[];
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
  createdAt: string;
}

export interface CashSession {
  id: string;
  cashRegisterId: string;
  cashRegister?: { name: string };
  openedAt: string;
  openingBalance: string;
  closedAt: string | null;
  theoreticalBalance: string | null;
  actualBalance: string | null;
  discrepancy: string | null;
  movements: CashMovement[];
}
