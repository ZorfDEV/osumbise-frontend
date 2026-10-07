export interface Category {
  id: string;
  name: string;
}

export type Unit = 'UNIT' | 'G' | 'KG' | 'ML' | 'CL' | 'L';

export type ProductType = 'VEGETARIEN' | 'SANS_SUCRE' | 'ALCOOLISE' | 'MUSULMAN';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: string;
  cost: string;
  unit: Unit;
  stockCurrent: string;
  stockMin: string;
  isActive: boolean;
  categoryId: string;
  category?: { name: string };
  image: string | null;
  tag: string | null;
  tagStartsAt: string | null;
  tagEndsAt: string | null;
  type: ProductType | null;
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
