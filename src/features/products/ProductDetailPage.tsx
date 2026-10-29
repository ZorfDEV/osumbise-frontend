import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchProduct,
  fetchProducts,
  fetchCategories,
  updateProduct,
  uploadProductImage,
  resolveProductImageUrl,
  addRecipeItem,
  updateRecipeItem,
  removeRecipeItem,
} from './api';
import { ProductDetail, Product, Category } from './types';
import ProductForm, { PRODUCT_TYPE_LABELS } from './ProductForm';
import { useToast } from '@/lib/toast';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { Pencil, Trash2, RotateCcw, Plus } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    fetchProduct(id).then(setProduct);
  }, [id]);

  useEffect(() => {
    reload();
    fetchProducts().then(setAllProducts);
    fetchCategories().then(setCategories);
  }, [reload]);

  if (!product) {
    return <PageSkeleton />;
  }

  const handleToggleActive = async () => {
    if (!id) return;
    if (product.isActive && !window.confirm(`Supprimer le produit « ${product.name} » ?`)) return;
    await updateProduct(id, { isActive: !product.isActive });
    toast.success(product.isActive ? 'Produit supprimé' : 'Produit réactivé');
    reload();
  };

  const handleAddIngredient = async () => {
    if (!id || !newIngredientId) return;
    setError(null);
    try {
      await addRecipeItem(id, newIngredientId, newQuantity);
      toast.success('Ingrédient ajouté à la recette');
      setNewIngredientId('');
      setNewQuantity(1);
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur lors de l\u2019ajout';
      setError(message);
      toast.error(message);
    }
  };

  const handleUpdateIngredientQuantity = (itemId: string, value: number) => {
    if (!id || value <= 0) return;
    updateRecipeItem(id, itemId, value).then(() => {
      toast.success('Quantité mise à jour');
      reload();
    });
  };

  const handleRemoveIngredient = (itemId: string) => {
    if (!id) return;
    removeRecipeItem(id, itemId).then(() => {
      toast.success('Ingrédient retiré de la recette');
      reload();
    });
  };

  const ingredientOptions = allProducts.filter((p) => p.id !== product.id);

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: 'Produits', to: '/products' }, { label: product.name }]} />

      {isEditing ? (
        <>
          <h1 className="mb-4 text-2xl font-semibold text-heading">Modifier {product.name}</h1>
          <ProductForm
            categories={categories}
            defaultValues={{
              categoryId: product.categoryId,
              name: product.name,
              sku: product.sku ?? '',
              sellingPrice: Number(product.sellingPrice),
              cost: Number(product.cost),
              tva: Number(product.tva ?? 0),
              css: Number(product.css ?? 0),
              priceIncludesTax: !!product.priceIncludesTax,
              isSellable: product.isSellable !== false,
              unit: product.unit,
              stockMin: product.isComposed ? 0 : Number(product.stockMin),
              tag: product.tag !== null ? Number(product.tag) : undefined,
              tagStartsAt: product.tagStartsAt ? product.tagStartsAt.slice(0, 10) : undefined,
              tagEndsAt: product.tagEndsAt ? product.tagEndsAt.slice(0, 10) : undefined,
              type: product.type ?? undefined,
              preparationArea: product.preparationArea ?? 'KITCHEN',
            }}
            currentImageUrl={resolveProductImageUrl(product.image)}
            isComposed={product.isComposed}
            submitLabel="Enregistrer"
            onSubmit={async (data, imageFile) => {
              if (!id) return;
              await updateProduct(id, data);
              if (imageFile) {
                await uploadProductImage(id, imageFile);
              }
              toast.success('Produit mis à jour');
              setIsEditing(false);
              reload();
            }}
            onCancel={() => setIsEditing(false)}
          />
        </>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-heading">{product.name}</h1>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setIsEditing(true)} className="btn btn-edit btn-sm">
                <Pencil size={14} />
                Modifier
              </button>
              {product.isActive ? (
                <button onClick={handleToggleActive} className="btn btn-danger btn-sm">
                  <Trash2 size={14} />
                  Supprimer
                </button>
              ) : (
                <button onClick={handleToggleActive} className="btn btn-primary btn-sm">
                  <RotateCcw size={14} />
                  Réactiver
                </button>
              )}
            </div>
          </div>
          <p className="mb-6 text-sm text-slate-500">{product.category?.name}</p>

          <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-surface p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Prix de vente</p>
              {product.discountActive ? (
                <p className="font-medium text-slate-900">
                  <span className="mr-1 text-slate-500 line-through">
                    {Number(product.sellingPrice).toLocaleString('fr-FR')}
                  </span>
                  {product.effectivePrice.toLocaleString('fr-FR')} FCFA
                </p>
              ) : (
                <p className="font-medium text-slate-900">
                  {Number(product.sellingPrice).toLocaleString('fr-FR')} FCFA
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Prix d’achat</p>
              <p className="font-medium text-slate-900">
                {Number(product.cost).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Stock de vente</p>
              <p className="font-medium text-slate-900">{Number(product.stockCurrent)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Réserve (magasin)</p>
              <p className="font-medium text-slate-900">{Number(product.stockReserve ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Seuil d’alerte</p>
              <p className="font-medium text-slate-900">
                {product.isComposed ? 'Sur les ingrédients' : Number(product.stockMin)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Vendu en caisse</p>
              <p className="font-medium text-slate-900">
                {product.isSellable === false ? 'Non (ingrédient)' : 'Oui'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Statut</p>
              <p className="font-medium text-slate-900">
                {product.isActive ? 'Actif' : 'Désactivé'}
              </p>
            </div>
            {product.tag !== null && (
              <div>
                <p className="text-xs text-slate-500">Remise</p>
                <p className="font-medium text-slate-900">
                  {Number(product.tag)}%{' '}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.discountActive
                        ? 'bg-success-soft text-success-dark'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {product.discountActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                {(product.tagStartsAt || product.tagEndsAt) && (
                  <p className="text-xs text-slate-500">
                    {product.tagStartsAt
                      ? new Date(product.tagStartsAt).toLocaleDateString('fr-FR')
                      : '…'}
                    {' → '}
                    {product.tagEndsAt
                      ? new Date(product.tagEndsAt).toLocaleDateString('fr-FR')
                      : '…'}
                  </p>
                )}
              </div>
            )}
            {product.type && (
              <div>
                <p className="text-xs text-slate-500">Type</p>
                <p className="font-medium text-slate-900">{PRODUCT_TYPE_LABELS[product.type]}</p>
              </div>
            )}
          </div>
        </>
      )}

      {!isEditing && (
        <>
          <div className="rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-1 text-sm font-semibold text-heading-muted">Recette</h2>
            <p className="mb-4 text-xs text-slate-500">
              Ingrédients décrémentés du stock à chaque vente de ce produit. Sans recette, le
              produit se décrémente lui-même (article "simple").
            </p>

            <ul className="mb-4 divide-y divide-slate-100">
              {product.recipeItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-900">{item.ingredientProduct.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={Number(item.quantity)}
                      onBlur={(e) => handleUpdateIngredientQuantity(item.id, Number(e.target.value))}
                      className="input input-sm w-20"
                    />
                    <span className="text-xs text-slate-500">{item.ingredientProduct.unit}</span>
                    <button
                      onClick={() => handleRemoveIngredient(item.id)}
                      aria-label="Retirer cet ingrédient"
                      className="text-slate-500 hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {product.recipeItems.length === 0 && (
                <li className="py-2 text-sm text-slate-500">Aucun ingrédient — produit simple</li>
              )}
            </ul>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newIngredientId}
                onChange={(e) => setNewIngredientId(e.target.value)}
                className="input px-2"
              >
                <option value="">— Ingrédient —</option>
                {ingredientOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                className="input w-24 px-2"
              />
              <button
                onClick={handleAddIngredient}
                className="btn btn-primary px-3"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {product.isActive
              ? '« Supprimer » retire le produit du POS et de la liste ; ses ventes et mouvements de stock passés restent dans l’historique, et il reste réactivable.'
              : 'Ce produit est supprimé : il n’apparaît plus au POS. « Réactiver » le remet en vente.'}
          </p>
        </>
      )}
    </div>
  );
}
