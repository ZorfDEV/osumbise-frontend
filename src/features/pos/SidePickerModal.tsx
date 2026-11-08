import { UtensilsCrossed, X } from 'lucide-react';
import type { Product } from './types';

// Choix de l'accompagnement quand le serveur touche un plat qui en propose
// (Poisson braisé -> Riz, Banane…). Inclus dans le prix du plat.
export default function SidePickerModal({
  product,
  onPick,
  onClose,
}: {
  product: Product;
  onPick: (side: { id: string; name: string } | null) => void;
  onClose: () => void;
}) {
  const sides = product.sides ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={`Accompagnement de ${product.name}`}>
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-heading">
            <UtensilsCrossed size={18} />
            {product.name}
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">Choisissez l’accompagnement (inclus dans le prix).</p>
        <div className="grid grid-cols-2 gap-2">
          {sides.map((s) => (
            <button key={s.id} onClick={() => onPick(s)} className="btn btn-secondary justify-center py-4 text-base">
              {s.name}
            </button>
          ))}
        </div>
        {!product.sideRequired && (
          <button onClick={() => onPick(null)} className="mt-3 w-full text-sm font-medium text-slate-500 hover:text-slate-800">
            Sans accompagnement
          </button>
        )}
      </div>
    </div>
  );
}
