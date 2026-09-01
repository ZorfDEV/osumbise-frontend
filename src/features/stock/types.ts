export type MovementType = 'ENTREE' | 'SORTIE_VENTE' | 'PERTE' | 'CASSE' | 'AJUSTEMENT';

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: string;
  stockBefore: string;
  stockAfter: string;
  reason: string | null;
  createdAt: string;
  product: { name: string; unit: string };
  user: { name: string } | null;
}

export interface StockAlert {
  id: string;
  name: string;
  unit: string;
  stockCurrent: string;
  stockMin: string;
  severity: 'RUPTURE' | 'FAIBLE';
}
