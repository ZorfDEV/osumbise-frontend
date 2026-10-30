import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import {
  fetchCategories,
  createCategory,
  fetchProducts,
  createProduct,
  updateProduct,
  uploadProductImage,
  resolveProductImageUrl,
} from './api';
import { Category, Product, Unit } from './types';
import ProductForm, { PRODUCT_TYPE_LABELS } from './ProductForm';
import { useToast } from '@/lib/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Package, Tags, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import ListToolbar, { normalizeText } from '@/components/ui/list-toolbar';
import { Pagination, usePagination } from '@/components/ui/pagination';

type ProductSort = 'name' | 'price-asc' | 'price-desc' | 'stock-asc';
const PRODUCT_SORTS: { value: ProductSort; label: string }[] = [
  { value: 'name', label: 'Nom (A → Z)' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'stock-asc', label: 'Stock le plus bas' },
];

const UNIT_LABELS: Record<Unit, string> = {
  UNIT: 'unité',
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  CL: 'cl',
  L: 'l',
};

export default function ProductsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ProductSort>('name');
  // Produits supprimés (désactivés) : masqués sauf demande
  const [showDeleted, setShowDeleted] = useState(false);
  const [onlyIngredients, setOnlyIngredients] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );

  const load = () => {
    setIsLoading(true);
    Promise.all([fetchCategories(), fetchProducts()])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    // Un OWNER n'a pas d'établissement fixe : on prend le premier de son
    // organisation, comme sur TablesPage
    if (!user?.establishmentId) {
      api.get('/establishments').then((res) => {
        const list = res.data.establishments;
        if (list.length > 0) setEstablishmentId(list[0].id);
      });
    }
  }, [user]);

  // Le formulaire ne se ferme qu'en cas de succès ; un refus du serveur
  // (nom trop court, droits, établissement…) est affiché au lieu d'être ignoré
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim(), establishmentId);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Création de la catégorie impossible');
      return;
    }
    toast.success('Catégorie créée');
    setNewCategoryName('');
    setShowCategoryForm(false);
    load();
  };

  // Suppression = désactivation (ventes et mouvements passés conservés),
  // annulable quelques secondes comme pour les catégories
  const handleDelete = (p: Product) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: false } : x)));
    toast.undoable(`Produit « ${p.name} » supprimé`, {
      onUndo: () => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: true } : x))),
      onCommit: async () => {
        try {
          await updateProduct(p.id, { isActive: false });
        } catch {
          toast.error('Suppression impossible');
          load();
        }
      },
    });
  };

  const handleRestore = async (p: Product) => {
    await updateProduct(p.id, { isActive: true });
    toast.success(`Produit « ${p.name} » réactivé`);
    load();
  };

  const deletedCount = products.filter((p) => !p.isActive).length;
  const ingredientCount = products.filter((p) => p.isActive && p.isSellable === false).length;
  const q = normalizeText(query);
  const filtered = products
    .filter((p) => showDeleted || p.isActive)
    .filter((p) => !onlyIngredients || p.isSellable === false)
    .filter((p) => !selectedCategoryId || p.categoryId === selectedCategoryId)
    .filter((p) => !q || normalizeText(p.name).includes(q) || (!!p.sku && normalizeText(p.sku).includes(q)))
    .sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return Number(a.sellingPrice) - Number(b.sellingPrice);
        case 'price-desc':
          return Number(b.sellingPrice) - Number(a.sellingPrice);
        case 'stock-asc':
          return Number(a.stockCurrent) - Number(b.stockCurrent);
        default:
          return a.name.localeCompare(b.name, 'fr');
      }
    });
  const isFiltering = !!q || !!selectedCategoryId || onlyIngredients;

  const pager = usePagination(filtered, { resetKey: `${query}|${selectedCategoryId}|${sort}|${showDeleted}|${onlyIngredients}` });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-heading">Produits</h1>
        <div className="flex flex-wrap gap-2">
        {/* Même couleur que le badge « Ajustement » du stock */}
        <Link to="/categories" className="btn bg-warning-soft text-warning-dark hover:brightness-95">
          <Tags size={16} />
          Gérer les catégories
        </Link>
        {/* Même couleur que le statut « Actif » */}
        <button
          onClick={() => setShowCategoryForm((s) => !s)}
          className="btn bg-success-soft text-success-dark hover:brightness-95"
        >
          <Plus size={16} />
          Nouvelle catégorie
        </button>
        <button
          onClick={() => setShowForm((s) => !s)}
          className={showForm ? 'btn btn-secondary' : 'btn btn-primary'}
        >
          {!showForm && <Plus size={16} />}
          {showForm ? 'Annuler' : 'Nouveau produit'}
        </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <ProductForm
            categories={categories}
            submitLabel="Créer le produit"
            onSubmit={async (data, imageFile) => {
              const product = await createProduct({ ...data, establishmentId });
              if (imageFile) {
                await uploadProductImage(product.id, imageFile);
              }
              toast.success('Produit créé');
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <ListToolbar
        id="products"
        query={query}
        onQueryChange={setQuery}
        placeholder="Rechercher un produit ou une référence"
        sort={sort}
        onSortChange={setSort}
        sortOptions={PRODUCT_SORTS}
        resultCount={isFiltering ? filtered.length : undefined}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
            !selectedCategoryId
              ? 'border-action bg-action text-white'
              : 'border-slate-300 text-slate-600'
          }`}
        >
          Toutes
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategoryId(c.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
              selectedCategoryId === c.id
                ? 'border-action bg-action text-white'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            {c.name}
          </button>
        ))}
        {ingredientCount > 0 && (
          <label className="ml-auto flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={onlyIngredients} onChange={(e) => setOnlyIngredients(e.target.checked)} />
            Ingrédients seulement ({ingredientCount})
          </label>
        )}
        {deletedCount > 0 && (
          <label className={`${ingredientCount > 0 ? '' : 'ml-auto '}flex items-center gap-1 text-xs text-slate-500`}>
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            Afficher les produits supprimés ({deletedCount})
          </label>
        )}
      </div>

      {showCategoryForm && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-surface p-3">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="Nom de la catégorie"
            autoFocus
            className="input flex-1"
          />
          <button
            onClick={handleAddCategory}
            className="btn btn-primary px-3"
          >
            <Plus size={16} />
            Ajouter
          </button>
          <button
            onClick={() => setShowCategoryForm(false)}
            className="text-sm text-slate-500 hover:text-slate-600"
          >
            Annuler
          </button>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : (
      <>
        {/* Ancre : le changement de page ramène ici, sous la barre du haut */}
        <div ref={pager.anchorRef} aria-hidden="true" className="scroll-mt-20" />
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
          <table className="table-cards w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2" />
                <th className="px-4 py-2 font-medium">Nom</th>
                <th className="px-4 py-2 font-medium">Catégorie</th>
                <th className="px-4 py-2 font-medium">Prix</th>
                <th className="px-4 py-2 font-medium">Stock</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pager.pageItems.map((p) => (
                <tr key={p.id}>
                  <td data-label="" data-thumb className="px-4 py-2">
                    {p.image ? (
                      <img
                        src={resolveProductImageUrl(p.image)}
                        alt={p.name}
                        className="h-8 w-8 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-300">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td data-label="Nom" className="px-4 py-2">
                    <Link
                      to={`/products/${p.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.isSellable === false && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        Ingrédient
                      </span>
                    )}
                    {p.type && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {PRODUCT_TYPE_LABELS[p.type]}
                      </span>
                    )}
                  </td>
                  <td data-label="Catégorie" className="px-4 py-2 text-slate-600">{p.category?.name ?? '—'}</td>
                  <td data-label="Prix" className="px-4 py-2 text-slate-600">
                    {p.discountActive ? (
                      <>
                        <span className="mr-2 text-slate-500 line-through">
                          {Number(p.sellingPrice).toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="font-medium text-primary-700">
                          {p.effectivePrice.toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="ml-1 text-xs text-primary-600">-{Number(p.tag)}%</span>
                      </>
                    ) : (
                      `${Number(p.sellingPrice).toLocaleString('fr-FR')} FCFA`
                    )}
                    {p.priceIncludesTax && <span className="ml-1 text-xs text-slate-500">TTC</span>}
                  </td>
                  <td data-label="Stock" className="px-4 py-2 text-slate-600">
                    {p.isComposed ? (
                      <span className="text-xs text-slate-500">Préparé à la commande</span>
                    ) : (
                      <>
                        {Number(p.stockCurrent)} {UNIT_LABELS[p.unit]}
                        {Number(p.stockReserve ?? 0) > 0 && <span className="block text-xs text-slate-500">Réserve : {Number(p.stockReserve)}</span>}
                        {Number(p.stockCurrent) <= Number(p.stockMin) && (
                          <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-dark">
                            Stock bas
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td data-label="Statut" className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.isActive ? 'bg-success-soft text-success-dark' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.isActive ? 'Actif' : 'Supprimé'}
                    </span>
                  </td>
                  <td data-label="" className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {p.isActive ? (
                        <>
                          <Link to={`/products/${p.id}`} className="btn btn-edit btn-sm">
                            <Pencil size={14} />
                            Modifier
                          </Link>
                          <button onClick={() => handleDelete(p)} className="btn btn-danger btn-sm">
                            <Trash2 size={14} />
                            Supprimer
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleRestore(p)} className="btn btn-primary btn-sm">
                          <RotateCcw size={14} />
                          Réactiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    {products.length === 0 ? (
                      <EmptyState compact icon={Package} title="Aucun produit pour l’instant" description="Ajoutez vos produits pour pouvoir les vendre au point de vente." action={{ label: 'Créer un produit', onClick: () => setShowForm(true) }} />
                    ) : (
                      <EmptyState compact icon={Package} title={q ? `Aucun produit ne correspond à « ${query.trim()} »` : 'Aucun produit dans cette catégorie'} action={{ label: 'Réinitialiser les filtres', onClick: () => { setQuery(''); setSelectedCategoryId(null); } }} />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pager.page}
          pageCount={pager.pageCount}
          pageSize={pager.pageSize}
          total={pager.total}
          onPageChange={pager.goTo}
          onPageSizeChange={pager.setPageSize}
          itemLabel="produits"
        />
      </>
      )}
    </div>
  );
}
