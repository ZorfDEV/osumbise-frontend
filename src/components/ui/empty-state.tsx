import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface Action {
  label: string;
  // Lien vers une page, ou action dans la page (ouvrir un formulaire…)
  to?: string;
  onClick?: () => void;
}

interface Props {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: Action;
  // compact : dans une carte ou un panneau ; sinon bloc pleine largeur
  compact?: boolean;
}

// État vide utile : dire ce qui manque et proposer l'action qui le résout,
// plutôt qu'un simple "Aucun …".
export default function EmptyState({ icon: Icon, title, description, action, compact }: Props) {
  return (
    <div
      className={`flex flex-col items-center gap-2 text-center ${
        compact ? 'px-4 py-6' : 'rounded-lg border border-dashed border-slate-300 bg-surface px-6 py-12'
      }`}
    >
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-heading">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action &&
        (action.to ? (
          <Link to={action.to} className="btn btn-primary mt-2">
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="btn btn-primary mt-2">
            {action.label}
          </button>
        ))}
    </div>
  );
}
