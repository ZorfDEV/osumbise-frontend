import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

// Fil d'Ariane des pages de détail. Sur mobile, seul le lien "retour" vers
// le niveau parent est affiché pour gagner de la place.
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const parent = [...items].reverse().find((c) => c.to);

  return (
    <nav aria-label="Fil d’Ariane" className="mb-3 text-sm print:hidden">
      {parent?.to && (
        <Link
          to={parent.to}
          className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-heading sm:hidden"
        >
          <ChevronLeft size={16} />
          {parent.label}
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-1 text-slate-500 sm:flex">
        {items.map((c, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {c.to && !isLast ? (
                <Link to={c.to} className="hover:text-heading hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'truncate font-medium text-heading' : ''}>
                  {c.label}
                </span>
              )}
              {!isLast && <ChevronRight size={14} className="shrink-0 text-slate-400" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
