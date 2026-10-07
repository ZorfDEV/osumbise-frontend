import type { ReactNode } from 'react';
import { BrandMark } from './brand-logo';

// Squelettes de chargement : des blocs gris animés qui ont la forme du
// contenu à venir, pour que la page ne "saute" pas à l'arrivée des données.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

const Busy = ({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) => (
  <div role="status" aria-live="polite" className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

// Liste ou tableau : une rangée par ligne attendue
export function ListSkeleton({ rows = 5, label = 'Chargement…' }: { rows?: number; label?: string }) {
  return (
    <Busy label={label} className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5" />
            <Skeleton className={`h-3 ${i % 2 ? 'w-1/3' : 'w-1/2'}`} />
          </div>
          <Skeleton className="h-3.5 w-16 shrink-0" />
        </div>
      ))}
    </Busy>
  );
}

// Grille de cartes (tables, cuisine, produits)
export function CardGridSkeleton({ count = 6, label = 'Chargement…' }: { count?: number; label?: string }) {
  return (
    <Busy label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-surface p-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </Busy>
  );
}

// Page de détail ou tableau de bord : titre, rangée d'indicateurs, deux blocs
export function PageSkeleton({ label = 'Chargement…' }: { label?: string }) {
  return (
    <Busy label={label} className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-slate-200 bg-surface p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-slate-200 bg-surface p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

// Démarrage de l'application (vérification de la session) : écran de marque
// plutôt qu'un texte isolé au milieu de la page.
export function AppLoader() {
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <BrandMark className="h-14 w-14" title="" />
      <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary-600" />
      </div>
      <span className="sr-only">Chargement d’Osumbise…</span>
    </div>
  );
}
