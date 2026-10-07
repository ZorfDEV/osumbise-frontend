import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Smartphone,
  CreditCard,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  SearchX,
} from 'lucide-react';
import { fetchCategories, fetchProducts } from './api';
import { resolveProductImageUrl } from '@/features/products/api';
import {
  loadOrder,
  addOrderItem,
  updateOrderItemQuantity,
  advanceOrderStatus,
} from './offlineApi';
import { getCachedCategories, getCachedProducts } from '@/lib/offlineCache';
import { fetchCustomers } from '@/features/customers/api';
import { Customer } from '@/features/customers/types';
import { setOrderCustomer as attachOrderCustomer } from './api';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { useConfirm } from '@/lib/confirm';
import { useToast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import { Order, OrderItem, Category, Product, OrderStatus } from './types';
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

// Produits les plus ajoutés sur CE poste (localStorage) — fonctionne hors
// ligne et reflète les habitudes réelles de la caisse, sans dépendre de
// l'API des rapports (réservée aux managers).
const FREQUENT_KEY = 'osumbise:pos-frequent';
const FREQUENT_CATEGORY = '__frequent__';
const FREQUENT_LIMIT = 12;

const readFrequent = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(FREQUENT_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

// Bloc image produit réutilisé partout — pictogramme (première lettre) si
// aucune image n'a été renseignée sur la fiche produit
function ProductThumb({ name, image, className }: { name: string; image: string | null; className: string }) {
  if (image) {
    return <img src={resolveProductImageUrl(image)} alt={name} className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center bg-slate-100 font-semibold text-slate-400`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Rappel de raccourci clavier — visible uniquement sur grand écran
function Kbd({ children }: { children: string }) {
  return (
    <kbd className="hidden rounded border border-current px-1.5 py-0.5 font-sans text-[0.7rem] font-medium leading-none opacity-70 lg:inline">
      {children}
    </kbd>
  );
}

// Stepper −/+ : 40px minimum pour une utilisation au doigt sur tablette
function QuantityStepper({
  quantity,
  onChange,
  fullWidth = false,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  fullWidth?: boolean;
}) {
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95';
  return (
    <div
      className={`flex items-center justify-between gap-1 rounded-xl bg-slate-100 p-1 ${fullWidth ? 'w-full' : 'shrink-0'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label={quantity === 1 ? 'Retirer' : 'Diminuer la quantité'}
        className={btn}
      >
        <Minus size={16} />
      </button>
      <span className="min-w-[2rem] text-center text-base font-semibold text-heading">{quantity}</span>
      <button type="button" onClick={() => onChange(quantity + 1)} aria-label="Augmenter la quantité" className={btn}>
        <Plus size={16} />
      </button>
    </div>
  );
}

// Squelette à la forme de l'écran POS (recherche, catégories, grille, panier)
function PosSkeleton() {
  return (
    <div role="status" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <span className="sr-only">Chargement de la commande…</span>
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-11 rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-surface p-2">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="hidden h-96 rounded-xl lg:block" />
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
  const searchRef = useRef<HTMLInputElement>(null);
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | undefined>(undefined);
  const bumpTimerRef = useRef<number | undefined>(undefined);

  const [order, setOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'products' | 'cart'>('products');
  const [isPaying, setIsPaying] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD'>('CASH');
  const [error, setError] = useState<string | null>(null);
  const [frequent, setFrequent] = useState<Record<string, number>>(readFrequent);
  const [bumpedId, setBumpedId] = useState<string | null>(null);

  const reloadOrder = useCallback(() => {
    if (!orderId) return;
    loadOrder(orderId).then(setOrder);
  }, [orderId]);

  useEffect(() => {
    reloadOrder();

    // Si ce poste a déjà des favoris, on ouvre directement dessus : c'est là
    // que se trouvent les produits vendus le plus souvent.
    const startCategory = (cats: Category[]) => {
      setCategories(cats);
      const hasFrequent = Object.keys(readFrequent()).length > 0;
      setSelectedCategoryId((prev) => prev ?? (hasFrequent ? FREQUENT_CATEGORY : cats[0]?.id ?? null));
    };

    fetchCategories()
      .then(startCategory)
      .catch(() => getCachedCategories().then(startCategory));

    fetchProducts()
      .then((fetchedProducts) => {
        setProducts(
          fetchedProducts.map((product) => ({
            ...product,
            type: product.type ?? '',
          }))
        );
      })
      .catch(() =>
        getCachedProducts().then((cachedProducts) => {
          setProducts(
            cachedProducts.map((product) => ({
              ...product,
              type: product.type ?? '',
            }))
          );
        })
      );

    fetchCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]));
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

  // Raccourcis clavier (poste fixe) : un seul écouteur, la logique à jour est
  // lue via keyHandlerRef à chaque rendu pour éviter les closures périmées.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandlerRef.current?.(e);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(bumpTimerRef.current);
    };
  }, []);

  if (!order) {
    return <PosSkeleton />;
  }

  const isEditable = EDITABLE_STATUSES.includes(order.status);
  const total = Number(order.total);
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const nextAction = NEXT_ACTION[order.status];
  const canPay = order.status === 'SERVIE' && isOnline;
  const canAdvance = !!nextAction && order.items.length > 0;

  const handleSelectCustomer = async (customerId: string) => {
    await attachOrderCustomer(order.id, customerId || null);
    reloadOrder();
  };

  const rememberFrequent = (productId: string) => {
    setFrequent((prev) => {
      const next = { ...prev, [productId]: (prev[productId] ?? 0) + 1 };
      try {
        localStorage.setItem(FREQUENT_KEY, JSON.stringify(next));
      } catch {
        // stockage indisponible (navigation privée) : favoris non mémorisés
      }
      return next;
    });
  };

  const addToOrder = (product: Product, quantity: number) =>
    addOrderItem(
      order.id,
      {
        id: product.id,
        name: product.name,
        sellingPrice: product.sellingPrice,
        effectivePrice: product.effectivePrice,
      },
      quantity
    );

  const handleAddProduct = async (product: Product) => {
    if (!isEditable || Number(product.stockCurrent) <= 0) return;
    // Retour immédiat au toucher, sans attendre la réponse réseau
    navigator.vibrate?.(10);
    setBumpedId(product.id);
    window.clearTimeout(bumpTimerRef.current);
    bumpTimerRef.current = window.setTimeout(() => setBumpedId(null), 350);
    try {
      await addToOrder(product, 1);
      rememberFrequent(product.id);
      setError(null);
      reloadOrder();
    } catch {
      setError('Impossible d’ajouter ce produit');
      toast.error('Impossible d’ajouter ce produit');
    }
  };

  const handleQuantityChange = async (item: OrderItem, quantity: number) => {
    await updateOrderItemQuantity(order.id, item.id, quantity);
    reloadOrder();
    // Retrait d'un article : pas de confirmation, mais 5 s pour se rattraper
    if (quantity <= 0) {
      const product = products.find((p) => p.id === item.productId);
      toast.undoable(`${item.product.name} retiré de la commande`, {
        onCommit: () => {},
        onUndo: product
          ? () => {
              addToOrder(product, item.quantity).then(reloadOrder);
            }
          : undefined,
      });
    }
  };

  const handleNextStatus = async () => {
    if (!nextAction) return;
    await advanceOrderStatus(order.id, nextAction.next);
    reloadOrder();
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Annuler la commande',
      message: 'Annuler cette commande ?',
      confirmLabel: 'Annuler la commande',
      danger: true,
    });
    if (!ok) return;
    await advanceOrderStatus(order.id, 'ANNULEE');
    toast.info('Commande annulée');
    navigate('/tables');
  };

  const openPayment = (method: 'CASH' | 'MOBILE_MONEY' | 'CARD' = 'CASH') => {
    setDefaultPaymentMethod(method);
    setIsPaying(true);
  };

  // Action principale de l'écran (F2) : encaisser si la commande est servie,
  // sinon faire avancer le statut.
  const runPrimaryAction = () => {
    if (canPay) openPayment('CASH');
    else if (canAdvance) handleNextStatus();
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoryScrollRef.current;
    if (!container) return;
    container.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const frequentProducts = products
    .filter((p) => frequent[p.id])
    .sort((a, b) => frequent[b.id] - frequent[a.id])
    .slice(0, FREQUENT_LIMIT);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  // Une recherche porte sur tout le catalogue, quelle que soit la catégorie
  const filteredProducts = normalizedSearch
    ? products.filter((p) => p.name.toLowerCase().includes(normalizedSearch))
    : selectedCategoryId === FREQUENT_CATEGORY
      ? frequentProducts
      : products.filter((p) => !selectedCategoryId || p.categoryId === selectedCategoryId);

  const categoryCounts = categories.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = products.filter((p) => p.categoryId === c.id).length;
    return acc;
  }, {});

  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (isPaying) return;
    if (e.key === 'F2') {
      e.preventDefault();
      runPrimaryAction();
      return;
    }
    if (e.key === '/' && !isTypingTarget(e.target)) {
      e.preventDefault();
      setView('products');
      searchRef.current?.focus();
    }
  };

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const first = filteredProducts.find((p) => Number(p.stockCurrent) > 0);
      if (first) {
        handleAddProduct(first);
        setSearchQuery('');
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      searchRef.current?.blur();
    }
  };

  const selectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setSearchQuery('');
  };
  const isChipActive = (id: string | null) => !normalizedSearch && selectedCategoryId === id;
  const chipClass = (active: boolean) =>
    `flex shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border px-4 py-2 transition-all duration-200 ${
      active
        ? 'border-action bg-action text-white shadow-sm'
        : 'border-slate-200 bg-surface text-slate-700 hover:border-slate-300 hover:shadow-sm'
    }`;
  const chipCountClass = (active: boolean) => `text-xs ${active ? 'text-on-primary-soft' : 'text-slate-500'}`;
  const plural = (n: number) => `${n} article${n !== 1 ? 's' : ''}`;

  return (
    <div className="flex flex-col gap-3 pb-24 lg:pb-0">
      {error && <p className="text-sm text-danger">{error}</p>}
      {!isEditable && (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
          Cette commande n’est plus modifiable à ce stade ({STATUS_LABELS[order.status]}).
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Panneau produits */}
        <div className={`lg:col-span-2 ${view === 'products' ? 'block' : 'hidden'} lg:block`}>
          {/* Recherche — "/" pour y accéder, Entrée ajoute le 1er résultat */}
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Rechercher un produit..."
              enterKeyHint="done"
              aria-label="Rechercher un produit"
              className="input w-full rounded-lg py-2.5 pl-9 pr-12 shadow-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              <Kbd>/</Kbd>
            </span>
          </div>

          {/* Catégories : carrousel horizontal avec défilement doux, bords en
              dégradé et flèches (desktop) pour indiquer qu'on peut défiler */}
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-50 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-50 to-transparent" />

            <button
              onClick={() => scrollCategories('left')}
              aria-label="Défiler vers la gauche"
              className="absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-surface p-1 text-slate-500 shadow-sm transition hover:text-slate-900 sm:flex"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollCategories('right')}
              aria-label="Défiler vers la droite"
              className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-surface p-1 text-slate-500 shadow-sm transition hover:text-slate-900 sm:flex"
            >
              <ChevronRight size={16} />
            </button>

            <div
              ref={categoryScrollRef}
              className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-1 pb-1"
            >
              {frequentProducts.length > 0 && (
                <button onClick={() => selectCategory(FREQUENT_CATEGORY)} className={chipClass(isChipActive(FREQUENT_CATEGORY))}>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold">
                    <Star
                      size={14}
                      className={isChipActive(FREQUENT_CATEGORY) ? 'fill-current' : 'fill-warning-accent text-warning-accent'}
                    />
                    Fréquents
                  </span>
                  <span className={chipCountClass(isChipActive(FREQUENT_CATEGORY))}>{plural(frequentProducts.length)}</span>
                </button>
              )}
              <button onClick={() => selectCategory(null)} className={chipClass(isChipActive(null))}>
                <span className="text-sm font-semibold">Toutes</span>
                <span className={chipCountClass(isChipActive(null))}>{plural(products.length)}</span>
              </button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => selectCategory(c.id)} className={chipClass(isChipActive(c.id))}>
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className={chipCountClass(isChipActive(c.id))}>{plural(categoryCounts[c.id] ?? 0)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grille produits : toute la carte est cliquable pour ajouter. Sur
              mobile la page défile normalement ; sur desktop la grille défile
              seule pour garder la commande visible à côté. */}
          <div className="lg:h-[calc(100dvh-15rem)] lg:min-h-[24rem] lg:overflow-y-auto lg:pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((p) => {
                const cartItem = order.items.find((i) => i.productId === p.id);
                const outOfStock = Number(p.stockCurrent) <= 0;
                const lowStock = Number(p.stockCurrent) <= Number(p.stockMin);
                const canAdd = isEditable && !outOfStock;
                return (
                  <div
                    key={p.id}
                    role={canAdd ? 'button' : undefined}
                    tabIndex={canAdd ? 0 : undefined}
                    aria-label={canAdd ? `Ajouter ${p.name}` : undefined}
                    onClick={() => canAdd && handleAddProduct(p)}
                    onKeyDown={(e) => {
                      if (canAdd && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleAddProduct(p);
                      }
                    }}
                    className={`group relative flex select-none flex-col overflow-hidden rounded-2xl border bg-surface p-2 shadow-[0_3px_18px_rgba(20,40,30,.045)] transition-all duration-200 ${
                      canAdd ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]' : ''
                    } ${cartItem ? 'border-primary-600 ring-1 ring-primary-600' : 'border-slate-200'} ${
                      bumpedId === p.id ? 'animate-pos-bump' : ''
                    } ${outOfStock ? 'opacity-60' : ''}`}
                  >
                    <div className="relative overflow-hidden rounded-xl">
                      <ProductThumb
                        name={p.name}
                        image={p.image}
                        className="h-28 w-full text-2xl transition duration-300 group-hover:scale-[1.03]"
                      />
                      {p.tag && (
                        <span className="absolute left-2 top-2 rounded-md bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning-dark">
                          {p.tag}%
                        </span>
                      )}
                      {cartItem ? (
                        <span className="absolute right-2 top-2 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-action px-2 text-sm font-bold text-white shadow">
                          {cartItem.quantity}
                        </span>
                      ) : (
                        <span
                          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur ${
                            lowStock ? 'bg-danger-soft text-danger-dark' : 'bg-surface/90 text-slate-600'
                          }`}
                        >
                          {outOfStock ? 'Rupture' : `${Number(p.stockCurrent)} en stock`}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-2 pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-heading">{p.name}</h3>
                        {p.type && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                            {p.type}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                        {p.discountActive && (
                          <span className="text-xs text-slate-500 line-through">{formatFcfa(Number(p.sellingPrice))}</span>
                        )}
                        <span className="text-sm font-bold text-primary-700">
                          {formatFcfa(p.discountActive ? p.effectivePrice : Number(p.sellingPrice))}
                        </span>
                      </div>

                      {isEditable && cartItem && (
                        <div className="mt-auto pt-2">
                          <QuantityStepper
                            fullWidth
                            quantity={cartItem.quantity}
                            onChange={(q) => handleQuantityChange(cartItem, q)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    icon={SearchX}
                    title={normalizedSearch ? `Aucun résultat pour « ${searchQuery} »` : 'Aucun produit dans cette catégorie'}
                    description={
                      normalizedSearch ? 'Vérifiez l’orthographe ou cherchez une partie du nom.' : 'Choisissez une autre catégorie.'
                    }
                    action={
                      normalizedSearch
                        ? { label: 'Effacer la recherche', onClick: () => setSearchQuery('') }
                        : { label: 'Voir tous les produits', onClick: () => selectCategory(null) }
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panneau commande — collé à l'écran sur desktop pour que le total et
            l'action principale restent toujours visibles */}
        <div className={`${view === 'cart' ? 'block' : 'hidden'} lg:sticky lg:top-20 lg:block lg:self-start`}>
          <div className="flex flex-col rounded-xl border border-slate-200 bg-surface lg:h-[calc(100dvh-7rem)]">
            <div className="flex items-start justify-between border-b border-slate-100 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Commande</p>
                <h2 className="text-lg font-semibold text-heading-muted">
                  {order.table ? `Table ${order.table.label}` : 'Comptoir'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Statut : {STATUS_LABELS[order.status]}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-500">{plural(itemCount)}</span>
            </div>

            {customers.length > 0 && isEditable && (
              <div className="border-b border-slate-100 px-4 py-2.5">
                <label htmlFor="pos-customer" className="mb-1 block text-xs font-medium text-slate-500">
                  Client (vente à crédit)
                </label>
                <select
                  id="pos-customer"
                  value={order.customerId ?? ''}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="input input-sm w-full"
                >
                  <option value="">Vente anonyme</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!isEditable && order.customer && (
              <div className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                Client : <span className="font-medium text-slate-700">{order.customer.name}</span>
              </div>
            )}

            <div className="min-h-[8rem] flex-1 divide-y divide-slate-100 overflow-y-auto">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.product.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatFcfa(Number(item.unitPrice))} × {item.quantity} ={' '}
                      <span className="font-medium text-slate-700">{formatFcfa(Number(item.unitPrice) * item.quantity)}</span>
                    </p>
                  </div>
                  {isEditable ? (
                    <QuantityStepper quantity={item.quantity} onChange={(q) => handleQuantityChange(item, q)} />
                  ) : (
                    <span className="shrink-0 text-sm font-medium text-slate-900">
                      {formatFcfa(Number(item.unitPrice) * item.quantity)}
                    </span>
                  )}
                </div>
              ))}
              {order.items.length === 0 && (
                <EmptyState compact icon={ShoppingBag} title="Commande vide" description="Touchez un produit pour l’ajouter." />
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
              <div className="flex justify-between pt-1 text-lg font-semibold text-heading">
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
                          className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-slate-200 py-2.5 text-xs font-medium text-slate-600 transition hover:border-slate-400"
                        >
                          <m.icon size={18} strokeWidth={1.75} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => openPayment('CASH')} className="btn btn-primary w-full py-3 text-base font-semibold">
                      Encaisser <Kbd>F2</Kbd>
                    </button>
                  </>
                ) : (
                  <p className="rounded-md bg-warning-soft px-3 py-2 text-center text-xs text-warning-dark">
                    Encaissement indisponible hors ligne — reconnecte-toi pour finaliser le paiement
                  </p>
                )
              ) : nextAction ? (
                <button onClick={handleNextStatus} disabled={!canAdvance} className="btn btn-primary w-full py-3 text-base">
                  {nextAction.label} <Kbd>F2</Kbd>
                </button>
              ) : (
                <p className="text-center text-sm text-slate-500">{STATUS_LABELS[order.status]}</p>
              )}

              {isEditable && (
                <button
                  onClick={handleCancel}
                  className="mt-2 w-full py-2 text-center text-xs font-medium text-slate-500 transition hover:text-danger"
                >
                  Annuler la commande
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barre de commande fixe — mobile et tablette uniquement : total
          toujours visible, un seul geste pour passer d'une vue à l'autre. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(20,40,30,.08)] backdrop-blur print:hidden lg:hidden">
        {view === 'products' ? (
          <button onClick={() => setView('cart')} className="btn btn-primary w-full justify-between py-3 text-base">
            <span className="inline-flex items-center gap-2">
              <span className="relative">
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-[#4a6b5d]">
                    {itemCount}
                  </span>
                )}
              </span>
              <span className="ml-1">Voir la commande</span>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold">
              {formatFcfa(total)}
              <ChevronRight size={18} />
            </span>
          </button>
        ) : (
          <button onClick={() => setView('products')} className="btn btn-secondary w-full justify-between py-3 text-base">
            <span className="inline-flex items-center gap-1">
              <ChevronLeft size={18} />
              Ajouter des produits
            </span>
            <span className="font-semibold text-heading">{formatFcfa(total)}</span>
          </button>
        )}
      </div>

      {isPaying && (
        <PaymentModal
          orderId={order.id}
          total={total}
          defaultMethod={defaultPaymentMethod}
          hasCustomer={!!order.customerId}
          customerName={order.customer?.name}
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
