import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [10, 20, 50, 100];

// Pagination côté navigateur : la liste complète reste chargée (recherche et
// tri portent sur tout), seule une tranche est affichée.
// `resetKey` : toute valeur qui change quand les filtres changent (recherche,
// catégorie…) — on revient alors à la page 1.
export function usePagination<T>(items: T[], { pageSize: initialSize = 20, resetKey }: { pageSize?: number; resetKey?: unknown } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const anchorRef = useRef<HTMLDivElement>(null);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Retour à la page 1 quand les filtres ou la taille de page changent
  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  // La liste a rétréci (suppression, filtre) : on reste dans les bornes
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);

  const goTo = (p: number) => {
    setPage(Math.min(Math.max(1, p), pageCount));
    // Ramène le haut de la liste à l'écran, sans saut brutal
    anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return { pageItems, page, pageCount, pageSize, setPageSize, total, goTo, anchorRef };
}

// Numéros affichés : 1 … 4 5 6 … 12 (toujours la première, la dernière et
// les voisines de la page courante)
const pageNumbers = (page: number, count: number): (number | '…')[] => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
};

interface Props {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // "produits", "dépenses"… pour le libellé "1–20 sur 57 produits"
  itemLabel?: string;
}

export function Pagination({ page, pageCount, pageSize, total, onPageChange, onPageSizeChange, itemLabel = 'éléments' }: Props) {
  // Rien à paginer : on n'encombre pas l'écran
  if (total <= PAGE_SIZES[0]) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn =
    'flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-slate-500" aria-live="polite">
        <span className="font-medium text-heading">
          {from.toLocaleString('fr-FR')}–{to.toLocaleString('fr-FR')}
        </span>{' '}
        sur {total.toLocaleString('fr-FR')} {itemLabel}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Page précédente"
          className={`${btn} border-slate-200 bg-surface text-slate-600 hover:bg-slate-50`}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Numéros sur grand écran, "page X / Y" sur mobile */}
        <span className="px-2 text-slate-600 sm:hidden">
          {page} / {pageCount}
        </span>
        {pageNumbers(page, pageCount).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} aria-hidden="true" className="hidden px-1 text-slate-400 sm:inline">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={`${btn} hidden sm:flex ${
                p === page ? 'border-action bg-action text-white' : 'border-slate-200 bg-surface text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          aria-label="Page suivante"
          className={`${btn} border-slate-200 bg-surface text-slate-600 hover:bg-slate-50`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <label className="flex items-center gap-2 text-slate-500">
        Afficher
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="input input-sm w-auto">
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        par page
      </label>
    </nav>
  );
}
