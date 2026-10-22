// Cuisine (plats : écran Cuisine) ou bar (boissons servies par le serveur)
export type PreparationArea = 'KITCHEN' | 'BAR';

export interface Category {
  id: string;
  name: string;
  preparationArea?: PreparationArea;
}

export type Unit = 'UNIT' | 'G' | 'KG' | 'ML' | 'CL' | 'L';

export type ProductType = 'VEGETARIEN' | 'SANS_SUCRE' | 'ALCOOLISE' | 'MUSULMAN';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: string;
  cost: string;
  // Taxe optionnelle (%) ajoutée au prix de vente hors taxe
  tva: string;
  // Contribution spéciale de solidarité (%)
  css?: string;
  // Prix TTC fixe : sellingPrice est taxes incluses (TVA et CSS déduites sur la facture)
  priceIncludesTax?: boolean;
  unit: Unit;
  stockCurrent: string;
  // Réserve (magasin), déstockée vers la vente
  stockReserve?: string;
  stockMin: string;
  isActive: boolean;
  categoryId: string;
  category?: { name: string };
  image: string | null;
  tag: string | null;
  tagStartsAt: string | null;
  tagEndsAt: string | null;
  type: ProductType | null;
  preparationArea?: PreparationArea;
  // Calculés côté backend (fenêtre de remise déjà résolue par rapport à "maintenant") :
  // à utiliser pour l'affichage plutôt que de recalculer tag/tagStartsAt/tagEndsAt ici
  effectivePrice: number;
  discountActive: boolean;
}

export interface RecipeItem {
  id: string;
  ingredientProductId: string;
  quantity: string;
  ingredientProduct: { id: string; name: string; unit: Unit };
}

export interface ProductDetail extends Product {
  recipeItems: RecipeItem[];
}
