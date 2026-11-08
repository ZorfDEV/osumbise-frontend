import { useState } from 'react';
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { saveProductSides } from './api';
import type { Product, ProductDetail } from './types';

// Accompagnements proposés avec un plat (Poisson braisé -> Riz, Banane…) :
// au POS, le serveur en choisit un ; il est inclus dans le prix du plat
// (non facturé), affiché « Poisson braisé + Riz » et décompté du stock.
export default function ProductSidesCard({
  product,
  allProducts,
  onChanged,
}: {
  product: ProductDetail;
  allProducts: Product[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const sides = product.sides ?? [];
  const [newSideId, setNewSideId] = useState('');
  const [saving, setSaving] = useState(false);

  const options = allProducts.filter((p) => p.isActive && p.id !== product.id && !sides.some((s) => s.id === p.id));

  const save = async (sideProductIds: string[], sideRequired: boolean, message: string) => {
    setSaving(true);
    try {
      await saveProductSides(product.id, { sideProductIds, sideRequired });
      toast.success(message);
      onChanged();
    } catch {
      toast.error('Impossible d’enregistrer les accompagnements');
    } finally {
      setSaving(false);
    }
  };

  const add = () => {
    const side = allProducts.find((p) => p.id === newSideId);
    if (!side) return;
    setNewSideId('');
    save([...sides.map((s) => s.id), side.id], !!product.sideRequired, `${side.name} ajouté aux accompagnements`);
  };

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-surface p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-heading-muted">
        <UtensilsCrossed size={16} />
        Accompagnements
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Proposés au serveur quand il choisit ce plat (riz, banane, pommes de terre…). Inclus dans le prix du plat : ils ne
        sont pas facturés, mais figurent sur la facture et le bon de cuisine (« {product.name} + Riz ») et sont décomptés
        du stock.
      </p>

      <ul className="mb-4 divide-y divide-slate-100">
        {sides.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-900">{s.name}</span>
            <button
              onClick={() =>
                save(
                  sides.filter((x) => x.id !== s.id).map((x) => x.id),
                  !!product.sideRequired,
                  `${s.name} retiré des accompagnements`
                )
              }
              disabled={saving}
              aria-label={`Retirer ${s.name}`}
              className="btn btn-danger btn-sm"
            >
              <Trash2 size={14} />
              Retirer
            </button>
          </li>
        ))}
        {sides.length === 0 && <li className="py-2 text-sm text-slate-500">Aucun accompagnement proposé</li>}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <select value={newSideId} onChange={(e) => setNewSideId(e.target.value)} className="input px-2" aria-label="Accompagnement à ajouter">
          <option value="">— Accompagnement —</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={add} disabled={!newSideId || saving} className="btn btn-primary px-3">
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {sides.length > 0 && (
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={!!product.sideRequired}
            disabled={saving}
            onChange={(e) =>
              save(
                sides.map((s) => s.id),
                e.target.checked,
                e.target.checked ? 'Accompagnement obligatoire' : 'Accompagnement facultatif'
              )
            }
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="font-medium text-heading">Accompagnement obligatoire</span>
            <span className="block text-xs text-slate-500">Le serveur doit en choisir un ; sinon il peut servir le plat sans.</span>
          </span>
        </label>
      )}
    </div>
  );
}
