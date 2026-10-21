import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { normalizeText } from '@/components/ui/list-toolbar';
import type { Product } from './types';

// Sélection d'un produit par recherche : on tape le nom ou le code (SKU),
// la liste se filtre ; flèches haut/bas + Entrée pour choisir au clavier
// (lecteur de code-barres compris : il « tape » le code puis Entrée).
export default function ProductPicker({
  id,
  products,
  value,
  onChange,
}: {
  id: string;
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = products.find((p) => p.id === value) ?? null;

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    const list = q
      ? products.filter((p) => normalizeText(p.name).includes(q) || (!!p.sku && normalizeText(p.sku).includes(q)))
      : products;
    // Code exact en premier (lecteur de code-barres)
    return [...list]
      .sort((a, b) => Number(!!b.sku && normalizeText(b.sku) === q) - Number(!!a.sku && normalizeText(a.sku) === q))
      .slice(0, 50);
  }, [products, query]);

  useEffect(() => setActive(0), [query]);

  // Clic en dehors : la liste se referme
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (p: Product) => {
    onChange(p.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (selected) {
    return (
      <div className="flex min-h-[2.75rem] items-center justify-between gap-2 rounded-lg border border-action bg-primary-50 px-3 py-2 text-sm">
        <span className="min-w-0">
          <span className="block truncate font-medium text-heading">{selected.name}</span>
          <span className="text-xs text-slate-600">
            {selected.sku ? `Code ${selected.sku} · ` : ''}stock {Number(selected.stockCurrent)} {selected.unit}
          </span>
        </span>
        <button type="button" onClick={() => onChange('')} aria-label="Changer de produit" className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-heading">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Nom ou code du produit"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className="input w-full pl-9"
      />
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-surface py-1 text-sm shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-slate-500">Aucun produit ne correspond.</li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 ${i === active ? 'bg-primary-50' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-heading">{p.name}</span>
                  {p.sku && <span className="text-xs text-slate-500">Code {p.sku}</span>}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {Number(p.stockCurrent)} {p.unit}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
