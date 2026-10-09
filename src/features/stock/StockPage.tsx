import { useEffect, useState } from 'react';
import { fetchMovements, fetchAlerts } from './api';
import { fetchProducts } from '@/features/products/api';
import { StockMovement, StockAlert, MovementType } from './types';
import { Product } from '@/features/products/types';
import StockMovementForm from './StockMovementForm';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Archive } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import ListToolbar, { normalizeText } from '@/components/ui/list-toolbar';
import { Pagination, usePagination } from '@/components/ui/pagination';

type MovementSort = 'recent' | 'oldest';
const MOVEMENT_SORTS: { value: MovementSort; label: string }[] = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
];

const MOVEMENT_LABELS: Record<MovementType, string> = {
  ENTREE: 'Entrée',
  SORTIE_VENTE: 'Sortie (vente)',
  PERTE: 'Perte',
  CASSE: 'Casse',
  AJUSTEMENT: 'Ajustement',
};

const MOVEMENT_STYLES: Record<MovementType, string> = {
  ENTREE: 'text-success-dark bg-success-soft',
  SORTIE_VENTE: 'text-slate-700 bg-slate-100',
  PERTE: 'text-danger-dark bg-danger-soft',
  CASSE: 'text-danger-dark bg-danger-soft',
  AJUSTEMENT: 'text-warning-dark bg-warning-soft',
};

type FormMode = 'ENTREE' | 'PERTE' | 'CASSE' | 'AJUSTEMENT';

export default function StockPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<FormMode | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | 'ALL'>('ALL');
  const [sort, setSort] = useState<MovementSort>('recent');

  const q = normalizeText(query);
  const visibleMovements = movements
    .filter((m) => typeFilter === 'ALL' || m.type === typeFilter)
    .filter((m) => !q || normalizeText(m.product.name).includes(q) || (!!m.reason && normalizeText(m.reason).includes(q)))
    .sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'oldest' ? diff : -diff;
    });
  const isFiltering = !!q || typeFilter !== 'ALL';

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

  const pager = usePagination(visibleMovements, { resetKey: `${query}|${typeFilter}|${sort}` });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-heading">Stock</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveForm('ENTREE')}
            className="btn btn-primary px-3"
          >
            + Entrée
          </button>
          <button
            onClick={() => setActiveForm('PERTE')}
            className="btn btn-secondary px-3"
          >
            Perte
          </button>
          <button
            onClick={() => setActiveForm('CASSE')}
            className="btn btn-secondary px-3"
          >
            Casse
          </button>
          <button
            onClick={() => setActiveForm('AJUSTEMENT')}
            className="btn btn-secondary px-3"
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
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning-soft p-4">
          <h2 className="mb-2 text-sm font-semibold text-warning-dark">Alertes de stock</h2>
          <ul className="space-y-1 text-sm">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="text-warning-dark">{a.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.severity === 'RUPTURE'
                      ? 'bg-danger-soft text-danger-dark'
                      : 'bg-warning-soft text-warning-dark'
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

      {!isLoading && movements.length > 0 && (
        <ListToolbar
          id="stock"
          query={query}
          onQueryChange={setQuery}
          placeholder="Rechercher un produit ou un motif"
          sort={sort}
          onSortChange={setSort}
          sortOptions={MOVEMENT_SORTS}
          resultCount={isFiltering ? visibleMovements.length : undefined}
        >
          <label htmlFor="stock-type" className="sr-only">
            Type de mouvement
          </label>
          <select
            id="stock-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MovementType | 'ALL')}
            className="input w-auto"
          >
            <option value="ALL">Tous les types</option>
            {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => (
              <option key={t} value={t}>
                {MOVEMENT_LABELS[t]}
              </option>
            ))}
          </select>
        </ListToolbar>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : (
      <>
        {/* Ancre : le changement de page ramène ici, sous la barre du haut */}
        <div ref={pager.anchorRef} aria-hidden="true" className="scroll-mt-20" />
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
          <table className="table-cards w-full text-left text-sm">
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
              {pager.pageItems.map((m) => (
                <tr key={m.id}>
                  <td data-label="Date" className="px-4 py-2 text-slate-600">
                    {new Date(m.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td data-label="Produit" className="px-4 py-2 text-slate-900">{m.product.name}</td>
                  <td data-label="Type" className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${MOVEMENT_STYLES[m.type]}`}
                    >
                      {MOVEMENT_LABELS[m.type]}
                    </span>
                  </td>
                  <td data-label="Quantité" className="px-4 py-2 text-slate-600">
                    {Number(m.quantity)} {m.product.unit}
                  </td>
                  <td data-label="Stock après" className="px-4 py-2 text-slate-600">{Number(m.stockAfter)}</td>
                  <td data-label="Motif" className="px-4 py-2 text-slate-500">{m.reason ?? '—'}</td>
                  <td data-label="Par" className="px-4 py-2 text-slate-500">{m.user?.name ?? '—'}</td>
                </tr>
              ))}
              {visibleMovements.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    {movements.length === 0 ? (
                      <EmptyState compact icon={Archive} title="Aucun mouvement de stock" description="Les entrées, pertes et ajustements enregistrés apparaîtront ici." />
                    ) : (
                      <EmptyState
                        compact
                        icon={Archive}
                        title="Aucun mouvement ne correspond à ces filtres"
                        action={{
                          label: 'Réinitialiser les filtres',
                          onClick: () => {
                            setQuery('');
                            setTypeFilter('ALL');
                          },
                        }}
                      />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pager.page}
          pageCount={pager.pageCount}
          pageSize={pager.pageSize}
          total={pager.total}
          onPageChange={pager.goTo}
          onPageSizeChange={pager.setPageSize}
          itemLabel="mouvements"
        />
      </>
      )}
    </div>
  );
}
