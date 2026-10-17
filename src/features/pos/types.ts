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
  // Taxe optionnelle (%)
  tva?: string;
  // Cuisine (plats) ou bar (boissons servies par le serveur)
  preparationArea?: 'KITCHEN' | 'BAR';
  categoryId: string;
  stockCurrent: string;
  stockMin: string;
  unit: string;
  tag: string | null;
  type: string;
  isActive: boolean;
  image: string | null;
  // Prix réellement facturable, remise en cours déjà appliquée par le backend
  effectivePrice: number;
  discountActive: boolean;
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
  // Taxe (%) figée sur la ligne, ajoutée au prix hors taxe
  taxRate?: string;
  note: string | null;
  product: { name: string; preparationArea?: 'KITCHEN' | 'BAR' };
}

export interface OrderVoid {
  id: string;
  type: 'ITEM' | 'ORDER';
  productName: string | null;
  quantity: number | null;
  amount: string;
  reason: string;
  wasPrepared: boolean;
  createdAt: string;
  user: { name: string };
}

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'TRANSFER' | 'CREDIT' | 'ROOM';

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
  customerId: string | null;
  customer?: { id: string; name: string; balance: string } | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  items: OrderItem[];
  payments?: Payment[];
  user?: { name: string };
  establishment?: {
    name: string;
    address: string | null;
    logo: string | null;
    phone?: string | null;
    postalBox?: string | null;
    nif?: string | null;
    rc?: string | null;
  };
  // Hôtel : séjour auquel la consommation a été imputée (paiement ROOM)
  stay?: { id: string; guestName: string; room: { number: string; building?: string } } | null;
  // Articles retirés / annulation, avec motif (propriétaire ou administrateur)
  voids?: OrderVoid[];
  createdAt?: string;
  updatedAt?: string;
}
