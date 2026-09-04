import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { fetchCategories, fetchProducts } from './api';
import {
  loadOrder,
  addOrderItem,
  updateOrderItemQuantity,
  advanceOrderStatus,
} from './offlineApi';
import { getCachedCategories, getCachedProducts } from '@/lib/offlineCache';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { useConfirm } from '@/lib/confirm';
import { useToast } from '@/lib/toast';
import { Order, Category, Product, OrderStatus } from './types';
import PaymentModal from './PaymentModal';

const STATUS_LABELS: Record<OrderStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE: 'En attente',
  EN_PREPARATION: 'En préparation',
  PRETE: 'Prête',
  SERVIE: 'Servie',
  PAYEE: 'Payée',
  FERMEE: 'Fermée',
  ANNULEE: 'Annulée',
};

// BROUILLON -> EN_ATTENTE -> EN_PREPARATION -> PRETE -> SERVIE, puis paiement
// via la modale dédiée (pas ce bouton). Correspond exactement au workflow de
// order.controller.ts côté backend. Toutes ces transitions fonctionnent hors
// ligne (mises en file) — seul le paiement (SERVIE -> PAYEE) ne le peut pas.
const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  BROUILLON: { label: 'Envoyer en cuisine', next: 'EN_ATTENTE' },
  EN_ATTENTE: { label: 'Marquer en préparation', next: 'EN_PREPARATION' },
  EN_PREPARATION: { label: 'Marquer prête', next: 'PRETE' },
  PRETE: { label: 'Marquer servie', next: 'SERVIE' },
};

const EDITABLE_STATUSES: OrderStatus[] = ['BROUILLON', 'EN_ATTENTE'];

const QUICK_PAYMENT_METHODS: {
  value: 'CASH' | 'MOBILE_MONEY' | 'CARD';
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: 'CASH', label: 'Espèces', icon: Banknote },
  { value: 'MOBILE_MONEY', label: 'Mobile', icon: Smartphone },
  { value: 'CARD', label: 'Carte', icon: CreditCard },
];

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

// Bloc image produit réutilisé partout — pictogramme (première lettre) si
// aucune image n'a été renseignée sur la fiche produit
function ProductThumb({ name, image, className }: { name: string; image: string | null; className: string }) {
  if (image) {
    return <img src={image} alt={name} className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center bg-slate-100 font-semibold text-slate-300`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PosOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const confirm = useConfirm();
  const toast = useToast();
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'products' | 'cart'>('products');
  const [isPaying, setIsPaying] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD'>('CASH');
  const [error, setError] = useState<string | null>(null);

  const reloadOrder = useCallback(() => {
    if (!orderId) return;
    loadOrder(orderId).then(setOrder);
  }, [orderId]);

  useEffect(() => {
    reloadOrder();

    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setSelectedCategoryId((prev) => prev ?? cats[0].id);
      })
      .catch(() =>
        getCachedCategories().then((cats) => {
          setCategories(cats);
          if (cats.length > 0) setSelectedCategoryId((prev) => prev ?? cats[0].id);
        })
      );

    fetchProducts()
      .then(setProducts)
      .catch(() => getCachedProducts().then(setProducts));
  }, [reloadOrder]);

  // Si cette commande a été créée hors ligne (id local-xxx) et vient d'être
  // synchronisée, on bascule discrètement l'URL vers le vrai id serveur
  useEffect(() => {
    const handler = (e: Event) => {
      const { localId, realId } = (e as CustomEvent).detail;
      if (localId === orderId) {
        navigate(`/pos/${realId}`, { replace: true });
      }
    };
    window.addEventListener('offline-order-remapped', handler);
    return () => window.removeEventListener('offline-order-remapped', handler);
  }, [orderId, navigate]);

  if (!order) {
    return <p className="text-sm text-slate-500">Chargement...</p>;
  }

  const isEditable = EDITABLE_STATUSES.includes(order.status);
  const total = Number(order.total);
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  const handleAddProduct = async (product: Product) => {
    if (!orderId) return;
    try {
      await addOrderItem(
        orderId,
        { id: product.id, name: product.name, sellingPrice: product.sellingPrice },
        1
      );
      reloadOrder();
    } catch {
      setError('Impossible d’ajouter ce produit');
      toast.error('Impossible d’ajouter ce produit');
    }
  };

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    if (!orderId) return;
    await updateOrderItemQuantity(orderId, itemId, quantity);
    reloadOrder();
  };

  const handleNextStatus = async () => {
    if (!orderId) return;
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    await advanceOrderStatus(orderId, action.next);
    reloadOrder();
  };

  const handleCancel = async () => {
    if (!orderId) return;
    const ok = await confirm({
      title: 'Annuler la commande',
      message: 'Annuler cette commande ?',
      confirmLabel: 'Annuler la commande',
      danger: true,
    });
    if (!ok) return;
    await advanceOrderStatus(orderId, 'ANNULEE');
    toast.info('Commande annulée');
    navigate('/tables');
  };

  const openPayment = (method: 'CASH' | 'MOBILE_MONEY' | 'CARD' = 'CASH') => {
    setDefaultPaymentMethod(method);
    setIsPaying(true);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoryScrollRef.current;
    if (!container) return;
    container.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategoryId || p.categoryId === selectedCategoryId;
    const matchesSearch = !normalizedSearch || p.name.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });
  const categoryCounts = categories.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = products.filter((p) => p.categoryId === c.id).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isEditable && (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
          Cette commande n’est plus modifiable à ce stade ({STATUS_LABELS[order.status]}).
        </p>
      )}

      {/* Bascule Produits/Commande — mobile et tablette uniquement, la grille
          passe à 3 colonnes côte à côte seulement à partir de lg: */}
      <div className="flex justify-end gap-1 rounded-md border border-slate-300 p-1 lg:hidden">
        <button
          onClick={() => setView('products')}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            view === 'products' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Produits
        </button>
        <button
          onClick={() => setView('cart')}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            view === 'cart' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Commande
        </button>
      </div>

        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
      <div className="col-span-2 gap-4 reach cath prod">
        <div className="flex flex-col gap-4">
                {/* Panneau produits */}
                <div className={`${view === 'products' ? 'block' : 'hidden'} lg:block`}>
                  {/* Barre de recherche */}
                  <div className="relative mb-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un produit..."
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                    />
                  </div>
        
                  {/* Catégories : carrousel horizontal avec défilement doux, bords en
                      dégradé et flèches (desktop) pour indiquer qu'on peut défiler */}
                  <div className="relative w-auto ">
                    <div className="relative mb-4">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-50 to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-50 to-transparent" />
        
                    <button
                      onClick={() => scrollCategories('left')}
                      aria-label="Défiler vers la gauche"
                      className="absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition hover:text-slate-900 sm:flex"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => scrollCategories('right')}
                      aria-label="Défiler vers la droite"
                      className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition hover:text-slate-900 sm:flex"
                    >
                      <ChevronRight size={16} />
                    </button>
        
                    <div
                      ref={categoryScrollRef}
                      className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-1 pb-1"
                    >
                      <button
                        onClick={() => setSelectedCategoryId(null)}
                        className={`flex shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border px-4 py-2 transition-all duration-200 ${
                          !selectedCategoryId
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <span className="text-sm font-semibold">Toutes</span>
                        <span
                          className={`text-[11px] ${!selectedCategoryId ? 'text-slate-300' : 'text-slate-400'}`}
                        >
                          {products.length} article{products.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCategoryId(c.id)}
                          className={`flex shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border px-4 py-2 transition-all duration-200 ${
                            selectedCategoryId === c.id
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <span className="text-sm font-semibold">{c.name}</span>
                          <span
                            className={`text-[11px] ${
                              selectedCategoryId === c.id ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {categoryCounts[c.id] ?? 0} article{(categoryCounts[c.id] ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  </div>
        
                  {/* Grille produits : image, nom, prix, bouton ajouter ou compteur si déjà au panier */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
                    {filteredProducts.map((p) => {
                      const cartItem = order.items.find((i) => i.productId === p.id);
                      return (
                        <div
                          key={p.id}
                          className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                            cartItem ? 'border-slate-900' : 'border-slate-200'
                          }`}
                        >
                          <ProductThumb name={p.name} image={p.image} className="h-24 w-full sm:h-28" />
                          <div className="p-3">
                            <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {formatFcfa(Number(p.sellingPrice))}
                            </p>
        
                            {isEditable &&
                              (cartItem ? (
                                <div className="mt-2 flex items-center justify-between rounded-md bg-slate-100 p-1">
                                  <button
                                    onClick={() => handleQuantityChange(cartItem.id, cartItem.quantity - 1)}
                                    className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                                  >
                                    −
                                  </button>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {cartItem.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleQuantityChange(cartItem.id, cartItem.quantity + 1)}
                                    className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddProduct(p)}
                                  className="mt-2 w-full rounded-md bg-slate-900 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                                >
                                  Ajouter
                                </button>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <p className="col-span-full text-sm text-slate-400">
                        {normalizedSearch
                          ? `Aucun résultat pour "${searchQuery}"`
                          : 'Aucun produit dans cette catégorie'}
                      </p>
                    )}
                  </div>
                </div>
         </div>
         </div>

          <div className="col-span-1 gap-4">
            {/* Panneau commandes */}
        <div className={`${view === 'cart' ? 'block' : 'hidden'} lg:block`}>
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between border-b border-slate-100 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Commande
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  {order.table ? `Table ${order.table.label}` : 'Comptoir'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Statut : {STATUS_LABELS[order.status]}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                {itemCount} article{itemCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <ProductThumb
                    name={item.product.name}
                    image={null}
                    className="h-10 w-10 shrink-0 rounded-lg text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFcfa(Number(item.unitPrice))} × {item.quantity}
                    </p>
                  </div>
                  {isEditable ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="h-6 w-6 rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-50"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="h-6 w-6 rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-50"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-sm font-medium text-slate-900">
                      {formatFcfa(Number(item.unitPrice) * item.quantity)}
                    </span>
                  )}
                </div>
              ))}
              {order.items.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-400">
                  Aucun article — touchez un produit pour l’ajouter
                </p>
              )}
            </div>

            <div className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Sous-total</span>
                <span>{formatFcfa(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Taxe</span>
                <span>{formatFcfa(Number(order.tax))}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatFcfa(total)}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4">
              {order.status === 'SERVIE' ? (
                isOnline ? (
                  <>
                    <div className="mb-3 flex justify-center gap-2">
                      {QUICK_PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => openPayment(m.value)}
                          className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-400"
                        >
                          <m.icon size={18} strokeWidth={1.75} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => openPayment('CASH')}
                      className="w-full rounded-md bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Encaisser
                    </button>
                  </>
                ) : (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                    Encaissement indisponible hors ligne — reconnecte-toi pour finaliser le
                    paiement
                  </p>
                )
              ) : NEXT_ACTION[order.status] ? (
                <button
                  onClick={handleNextStatus}
                  disabled={order.items.length === 0}
                  className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {NEXT_ACTION[order.status]!.label}
                </button>
              ) : (
                <p className="text-center text-sm text-slate-500">{STATUS_LABELS[order.status]}</p>
              )}

              {isEditable && (
                <button
                  onClick={handleCancel}
                  className="mt-2 w-full text-center text-xs font-medium text-slate-400 transition hover:text-red-600"
                >
                  Annuler la commande
                </button>
              )}
            </div>
          </div>
        </div>
         </div>
      </div>
     {isPaying && (
             <PaymentModal
               orderId={order.id}
               total={total}
               defaultMethod={defaultPaymentMethod}
               onClose={() => setIsPaying(false)}
               onPaid={() => {
                 setIsPaying(false);
                 toast.success('Paiement encaissé avec succès');
                 navigate(`/pos/${order.id}/receipt`);
               }}
             />
           )}
    </div>
  );
}
