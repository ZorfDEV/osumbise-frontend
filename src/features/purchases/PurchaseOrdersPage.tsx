import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchPurchaseOrders, createPurchaseOrder } from './api';
import { fetchSuppliers } from '@/features/suppliers/api';
import { PurchaseOrder } from './types';
import { Supplier } from '@/features/suppliers/types';

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  COMMANDE: 'Commandée',
  RECU: 'Reçue',
  ANNULE: 'Annulée',
};

const STATUS_STYLES: Record<string, string> = {
  BROUILLON: 'bg-slate-100 text-slate-700',
  COMMANDE: 'bg-amber-100 text-amber-700',
  RECU: 'bg-green-100 text-green-700',
  ANNULE: 'bg-red-100 text-red-700',
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
        <h1 className="text-2xl font-semibold text-slate-900">Achats</h1>
        <div className="flex items-center gap-2">
          <select
            value={newSupplierId}
            onChange={(e) => setNewSupplierId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Nouvelle commande
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
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
                  <td className="px-4 py-2">
                    <Link
                      to={`/purchase-orders/${o.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {o.supplier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status]}`}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{o.items.length}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {Number(o.total).toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Aucune commande d’achat
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
