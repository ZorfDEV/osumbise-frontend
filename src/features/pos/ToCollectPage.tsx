import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { ListSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import { fetchCustomers } from '@/features/customers/api';
import type { Customer } from '@/features/customers/types';
import { fetchOrders } from './api';
import type { Order, OrderStatus } from './types';
import { invoiceNo } from './invoiceNumber';
import InvoiceSearch from './InvoiceSearch';

// « À encaisser » : ce qui attend un paiement — les commandes servies ou en
// cours pas encore réglées, et les comptes clients qui doivent de l'argent
const UNPAID: OrderStatus[] = ['BROUILLON', 'EN_ATTENTE', 'EN_PREPARATION', 'PRETE', 'SERVIE'];

const STATUS_LABELS: Partial<Record<OrderStatus, { label: string; badge: string }>> = {
  BROUILLON: { label: 'Brouillon', badge: 'bg-slate-100 text-slate-600' },
  EN_ATTENTE: { label: 'En attente', badge: 'bg-warning-soft text-warning-dark' },
  EN_PREPARATION: { label: 'En préparation', badge: 'bg-warning-soft text-warning-dark' },
  PRETE: { label: 'Prête', badge: 'bg-info-soft text-info-dark' },
  SERVIE: { label: 'Servie — à encaisser', badge: 'bg-danger-soft text-danger-dark' },
};

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const since = (iso?: string) => {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `il y a ${hours} h` : new Date(iso).toLocaleDateString('fr-FR');
};

export default function ToCollectPage() {
  const [tab, setTab] = useState<'orders' | 'accounts'>('orders');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);

  const load = useCallback(() => {
    fetchOrders({ status: UNPAID.join(',') })
      .then((list) => setOrders(list.filter((o) => o.items.length > 0)))
      .catch(() => setOrders([]));
    fetchCustomers()
      .then((list) => setCustomers(list.filter((c) => Number(c.balance) > 0).sort((a, b) => Number(b.balance) - Number(a.balance))))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    load();
    // Liste à jour quand une commande est créée, servie ou encaissée ailleurs
    const socket = getSocket();
    socket.on('order:created', load);
    socket.on('order:status_changed', load);
    socket.on('order:paid', load);
    return () => {
      socket.off('order:created', load);
      socket.off('order:status_changed', load);
      socket.off('order:paid', load);
    };
  }, [load]);

  const ordersTotal = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const accountsTotal = (customers ?? []).reduce((s, c) => s + Number(c.balance), 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-heading">À encaisser</h1>
      <p className="mb-4 text-sm text-slate-500">Les factures en attente de paiement, à valider quand le client vient régler.</p>

      <InvoiceSearch />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {[
          { v: 'orders' as const, label: `Commandes non payées${orders ? ` (${orders.length})` : ''}`, total: ordersTotal },
          { v: 'accounts' as const, label: `Comptes clients${customers ? ` (${customers.length})` : ''}`, total: accountsTotal },
        ].map((t) => (
          <button
            key={t.v}
            role="tab"
            aria-selected={tab === t.v}
            onClick={() => setTab(t.v)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              tab === t.v ? 'border-action bg-action text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label} · {fcfa(t.total)}
          </button>
        ))}
      </div>

      {tab === 'orders' ? (
        orders === null ? (
          <ListSkeleton />
        ) : orders.length === 0 ? (
          <EmptyState icon={HandCoins} title="Rien à encaisser" description="Toutes les commandes sont réglées." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
            <table className="table-cards w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Commande</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 text-right font-medium">Total TTC</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const st = STATUS_LABELS[o.status];
                  return (
                    <tr key={o.id}>
                      <td data-label="Commande" className="px-4 py-2">
                        <span className="font-medium text-heading">
                          N° {invoiceNo(o)} · {o.table ? `Table ${o.table.label}` : 'Comptoir'}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {o.items.reduce((s, i) => s + i.quantity, 0)} article(s) · {since(o.createdAt)}
                          {o.user ? ` · ${o.user.name}` : ''}
                          {o.customer ? ` · ${o.customer.name}` : ''}
                        </span>
                      </td>
                      <td data-label="Statut" className="px-4 py-2">
                        {st && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.badge}`}>{st.label}</span>}
                      </td>
                      <td data-label="Total TTC" className="px-4 py-2 text-right font-medium text-heading">{fcfa(Number(o.total))}</td>
                      <td data-label="" className="px-4 py-2 text-right">
                        <Link to={`/pos/${o.id}`} className="btn btn-secondary btn-sm">
                          {o.status === 'SERVIE' ? 'Encaisser' : 'Ouvrir'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : customers === null ? (
        <ListSkeleton />
      ) : customers.length === 0 ? (
        <EmptyState icon={HandCoins} title="Aucun compte à régler" description="Aucun client ne doit d’argent pour le moment." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
          <table className="table-cards w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 text-right font-medium">Solde dû</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td data-label="Client" className="px-4 py-2">
                    <span className="font-medium text-heading">{c.name}</span>
                    <span className="block text-xs text-slate-500">
                      {c.phone ?? 'Aucun téléphone'}
                      {c.creditLimit ? ` · plafond ${fcfa(Number(c.creditLimit))}` : ''}
                    </span>
                  </td>
                  <td data-label="Solde dû" className="px-4 py-2 text-right font-semibold text-danger-dark">{fcfa(Number(c.balance))}</td>
                  <td data-label="" className="px-4 py-2 text-right">
                    <Link to={`/customers/${c.id}`} className="btn btn-secondary btn-sm">
                      Relevé et règlement
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
