export interface Category {
  id: string;
  name: string;
}

// sellingPrice arrive en string : Prisma sérialise les champs Decimal en JSON
// comme des chaînes, pas des nombres — toujours passer par Number(...) avant
// tout calcul ou affichage
export interface Product {
  id: string;
  name: string;
  sellingPrice: string;
  categoryId: string;
  isActive: boolean;
  image: string | null;
}

export type TableStatus = 'FREE' | 'OCCUPIED' | 'PENDING_ORDER' | 'BILL_REQUESTED';

export interface DiningTable {
  id: string;
  label: string;
  zone: string | null;
  status: TableStatus;
}

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  FREE: 'Libre',
  OCCUPIED: 'Occupée',
  PENDING_ORDER: 'Commande en attente',
  BILL_REQUESTED: 'Addition demandée',
};

export type OrderStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE'
  | 'EN_PREPARATION'
  | 'PRETE'
  | 'SERVIE'
  | 'PAYEE'
  | 'FERMEE'
  | 'ANNULEE';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  note: string | null;
  product: { name: string };
}

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'TRANSFER' | 'CREDIT';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: string;
  createdAt: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  tableId: string | null;
  table: DiningTable | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  items: OrderItem[];
  payments?: Payment[];
  user?: { name: string };
  establishment?: { name: string; address: string | null; logo: string | null };
  createdAt?: string;
  updatedAt?: string;
}
