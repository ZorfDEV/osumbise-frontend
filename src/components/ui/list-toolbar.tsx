import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<S extends string> {
  id: string;
  query: string;
  onQueryChange: (q: string) => void;
  placeholder: string;
  sort: S;
  onSortChange: (s: S) => void;
  sortOptions: Option<S>[];
  // Filtres propres à la page (liste déroulante, puces…)
  children?: ReactNode;
  // Nombre de résultats affichés, annoncé quand un filtre est actif
  resultCount?: number;
}

// Barre de recherche + tri des longues listes (produits, stock…)
export default function ListToolbar<S extends string>({
  id,
  query,
  onQueryChange,
  placeholder,
  sort,
  onSortChange,
  sortOptions,
  children,
  resultCount,
}: Props<S>) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-56">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="input w-full pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {children}
      <label htmlFor={`${id}-sort`} className="sr-only">
        Trier par
      </label>
      <select
        id={`${id}-sort`}
        value={sort}
        onChange={(e) => onSortChange(e.target.value as S)}
        className="input w-auto"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {resultCount !== undefined && (
        <span role="status" className="w-full text-xs text-slate-500 sm:w-auto">
          {resultCount} résultat{resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

// Comparaison de texte insensible à la casse et aux accents
export const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
