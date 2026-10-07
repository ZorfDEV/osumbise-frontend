import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Package, Search, Users2, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { NAV_ITEMS, isNavItemVisible } from '@/config/navigation';
import { fetchProducts } from '@/features/products/api';
import { fetchCustomers } from '@/features/customers/api';
import { getCachedProducts } from '@/lib/offlineCache';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Result {
  id: string;
  group: 'Pages' | 'Produits' | 'Clients';
  label: string;
  hint?: string;
  to: string;
  icon: LucideIcon;
}

const MAX_PER_GROUP = 5;

// Recherche insensible à la casse et aux accents ("cafe" trouve "Café")
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Sous-pages sans entrée de menu, rattachées à une page parente
const SUB_PAGES = [
  { to: '/categories', label: 'Catégories de produits', parent: '/products' },
  { to: '/tables/manage', label: 'Gérer les tables', parent: '/tables' },
];

export default function CommandPalette({ open, onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState<{ id: string; name: string }[] | null>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string | null }[] | null>(null);

  const visibleNav = useMemo(() => NAV_ITEMS.filter((item) => isNavItemVisible(item, user)), [user]);
  const canSee = (to: string) => visibleNav.some((item) => item.to === to);

  // Données chargées à la première ouverture seulement, et uniquement pour
  // les pages auxquelles l'utilisateur a accès.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    if (products === null && canSee('/products')) {
      fetchProducts()
        .then(setProducts)
        .catch(() => getCachedProducts().then(setProducts).catch(() => setProducts([])));
    }
    if (customers === null && canSee('/customers')) {
      fetchCustomers()
        .then(setCustomers)
        .catch(() => setCustomers([]));
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = normalize(query);
    const match = (s: string) => !q || normalize(s).includes(q);

    const pages: Result[] = [
      ...visibleNav.map((item) => ({
        id: `page:${item.to}`,
        group: 'Pages' as const,
        label: item.label,
        hint: item.section,
        to: item.to,
        icon: item.icon,
      })),
      ...SUB_PAGES.filter((p) => canSee(p.parent)).map((p) => ({
        id: `page:${p.to}`,
        group: 'Pages' as const,
        label: p.label,
        to: p.to,
        icon: visibleNav.find((item) => item.to === p.parent)!.icon,
      })),
    ].filter((r) => match(r.label));

    // Sans saisie, on ne propose que les pages (raccourci de navigation)
    if (!q) return pages;

    const productResults: Result[] = (products ?? [])
      .filter((p) => match(p.name))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({ id: `product:${p.id}`, group: 'Produits', label: p.name, to: `/products/${p.id}`, icon: Package }));

    const customerResults: Result[] = (customers ?? [])
      .filter((c) => match(c.name) || (!!c.phone && normalize(c.phone).includes(q)))
      .slice(0, MAX_PER_GROUP)
      .map((c) => ({
        id: `customer:${c.id}`,
        group: 'Clients',
        label: c.name,
        hint: c.phone ?? undefined,
        to: `/customers/${c.id}`,
        icon: Users2,
      }));

    return [...pages.slice(0, MAX_PER_GROUP), ...productResults, ...customerResults];
  }, [query, products, customers, visibleNav]);

  useEffect(() => setActiveIndex(0), [query]);

  // Garde l'élément actif visible pendant la navigation au clavier
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    navigate(r.to);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const isLoadingData =
    !!normalize(query) &&
    ((canSee('/products') && products === null) || (canSee('/customers') && customers === null));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh] print:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher une page, un produit, un client…"
            aria-label="Rechercher"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex] ? `cmd-${results[activeIndex].id}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm text-heading placeholder:text-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-[0.7rem] font-medium text-slate-500">Échap</kbd>
        </div>

        <ul id="command-results" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {results.map((r, i) => {
            const showGroup = i === 0 || results[i - 1].group !== r.group;
            const Icon = r.icon;
            return (
              <li key={r.id} role="presentation">
                {showGroup && (
                  <p className="px-4 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                    {r.group}
                  </p>
                )}
                <div
                  id={`cmd-${r.id}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(r)}
                  className={`mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    i === activeIndex ? 'bg-primary-50 text-heading' : 'text-slate-700'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.75} className="shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  {r.hint && <span className="shrink-0 text-xs text-slate-500">{r.hint}</span>}
                  {i === activeIndex && <CornerDownLeft size={14} className="shrink-0 text-slate-400" />}
                </div>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              {isLoadingData ? 'Recherche…' : `Aucun résultat pour « ${query.trim()} »`}
            </li>
          )}
        </ul>

        <div className="hidden items-center gap-4 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 sm:flex">
          <span>
            <kbd className="font-sans font-semibold">↑ ↓</kbd> naviguer
          </span>
          <span>
            <kbd className="font-sans font-semibold">Entrée</kbd> ouvrir
          </span>
        </div>
      </div>
    </div>
  );
}
