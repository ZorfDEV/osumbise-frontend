import { useEffect, useState } from 'react';
import { fetchMovements, fetchAlerts } from './api';
import { fetchProducts } from '@/features/products/api';
import { StockMovement, StockAlert, MovementType } from './types';
import { Product } from '@/features/products/types';
import StockMovementForm from './StockMovementForm';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  ENTREE: 'Entrée',
  SORTIE_VENTE: 'Sortie (vente)',
  PERTE: 'Perte',
  CASSE: 'Casse',
  AJUSTEMENT: 'Ajustement',
};

const MOVEMENT_STYLES: Record<MovementType, string> = {
  ENTREE: 'text-green-700 bg-green-100',
  SORTIE_VENTE: 'text-slate-700 bg-slate-100',
  PERTE: 'text-red-700 bg-red-100',
  CASSE: 'text-red-700 bg-red-100',
  AJUSTEMENT: 'text-amber-700 bg-amber-100',
};

type FormMode = 'ENTREE' | 'PERTE' | 'CASSE' | 'AJUSTEMENT';

export default function StockPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<FormMode | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([fetchAlerts(), fetchMovements(), fetchProducts()])
      .then(([a, m, p]) => {
        setAlerts(a);
        setMovements(m);
        setProducts(p.filter((prod) => prod.isActive));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Stock</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveForm('ENTREE')}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Entrée
          </button>
          <button
            onClick={() => setActiveForm('PERTE')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Perte
          </button>
          <button
            onClick={() => setActiveForm('CASSE')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Casse
          </button>
          <button
            onClick={() => setActiveForm('AJUSTEMENT')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ajustement
          </button>
        </div>
      </div>

      {activeForm && (
        <StockMovementForm
          mode={activeForm}
          products={products}
          onDone={() => {
            setActiveForm(null);
            load();
          }}
          onCancel={() => setActiveForm(null)}
        />
      )}

      {alerts.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">Alertes de stock</h2>
          <ul className="space-y-1 text-sm">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="text-amber-900">{a.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.severity === 'RUPTURE'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {a.severity === 'RUPTURE' ? 'Rupture' : 'Stock faible'} —{' '}
                  {Number(a.stockCurrent)} {a.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Produit</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Quantité</th>
                <th className="px-4 py-2 font-medium">Stock après</th>
                <th className="px-4 py-2 font-medium">Motif</th>
                <th className="px-4 py-2 font-medium">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(m.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-2 text-slate-900">{m.product.name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${MOVEMENT_STYLES[m.type]}`}
                    >
                      {MOVEMENT_LABELS[m.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {Number(m.quantity)} {m.product.unit}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{Number(m.stockAfter)}</td>
                  <td className="px-4 py-2 text-slate-500">{m.reason ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{m.user?.name ?? '—'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Aucun mouvement
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
