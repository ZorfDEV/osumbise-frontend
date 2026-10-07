import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchPurchaseOrders, createPurchaseOrder } from './api';
import { fetchSuppliers } from '@/features/suppliers/api';
import { PurchaseOrder } from './types';
import { Supplier } from '@/features/suppliers/types';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ShoppingBag } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  COMMANDE: 'Commandée',
  RECU: 'Reçue',
  ANNULE: 'Annulée',
};

const STATUS_STYLES: Record<string, string> = {
  BROUILLON: 'bg-slate-100 text-slate-700',
  COMMANDE: 'bg-warning-soft text-warning-dark',
  RECU: 'bg-success-soft text-success-dark',
  ANNULE: 'bg-danger-soft text-danger-dark',
};

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supplierIdFilter = searchParams.get('supplierId') ?? undefined;

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSupplierId, setNewSupplierId] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );

  const load = () => {
    setIsLoading(true);
    Promise.all([
      fetchPurchaseOrders(supplierIdFilter ? { supplierId: supplierIdFilter } : undefined),
      fetchSuppliers(),
    ])
      .then(([o, s]) => {
        setOrders(o);
        setSuppliers(s);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    if (!user?.establishmentId) {
      api.get('/establishments').then((res) => {
        const list = res.data.establishments;
        if (list.length > 0) setEstablishmentId(list[0].id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supplierIdFilter]);

  const handleCreate = async () => {
    if (!newSupplierId) return;
    const po = await createPurchaseOrder({ supplierId: newSupplierId, establishmentId });
    navigate(`/purchase-orders/${po.id}`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-heading">Achats</h1>
        <div className="flex items-center gap-2">
          <select
            value={newSupplierId}
            onChange={(e) => setNewSupplierId(e.target.value)}
            className="input"
          >
            <option value="">— Fournisseur —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!newSupplierId}
            className="btn btn-primary"
          >
            Nouvelle commande
          </button>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
          <table className="table-cards w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Fournisseur</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium">Articles</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Fournisseur" className="px-4 py-2">
                    <Link
                      to={`/purchase-orders/${o.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {o.supplier.name}
                    </Link>
                  </td>
                  <td data-label="Statut" className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status]}`}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td data-label="Articles" className="px-4 py-2 text-slate-600">{o.items.length}</td>
                  <td data-label="Total" className="px-4 py-2 text-slate-600">
                    {Number(o.total).toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState compact icon={ShoppingBag} title="Aucune commande d’achat" description="Choisissez un fournisseur ci-dessus puis cliquez sur « Nouvelle commande »." />
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
