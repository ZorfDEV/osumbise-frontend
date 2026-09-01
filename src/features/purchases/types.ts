export type PurchaseOrderStatus = 'BROUILLON' | 'COMMANDE' | 'RECU' | 'ANNULE';

export interface PurchaseItem {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  product: { name: string; unit: string };
}

export interface PurchaseOrder {
  id: string;
  status: PurchaseOrderStatus;
  supplierId: string;
  supplier: { name: string };
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  receivedAt: string | null;
  items: PurchaseItem[];
}
