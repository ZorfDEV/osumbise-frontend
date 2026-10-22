export type MovementType = 'ENTREE' | 'SORTIE_VENTE' | 'PERTE' | 'CASSE' | 'AJUSTEMENT' | 'TRANSFERT' | 'CORRECTION';
// Stock touché : vente (bar, rayon) ou réserve (magasin)
export type StockLocation = 'SALES' | 'RESERVE';

export interface StockMovement {
  id: string;
  type: MovementType;
  location?: StockLocation;
  // Entrée déjà corrigée (une seule correction possible)
  corrected?: boolean;
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
  stockReserve?: string;
  stockMin: string;
  severity: 'RUPTURE' | 'FAIBLE';
}
