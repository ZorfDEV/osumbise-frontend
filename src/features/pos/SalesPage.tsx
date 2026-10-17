import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import { api } from '@/lib/axios';
import { ListSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import CancelSaleModal from './CancelSaleModal';
import type { OrderStatus, PaymentMethod } from './types';

interface Sale {
  id: string;
  status: OrderStatus;
  total: string;
  updatedAt: string;
  table: { label: string } | null;
  user: { name: string } | null;
  customer: { name: string } | null;
  payments: { method: PaymentMethod; amount: string; createdAt: string }[];
  voids: { reason: string }[];
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Compte client',
  ROOM: 'Sur la chambre',
};

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const isoDay = (d: Date) => d.toLocaleDateString('en-CA');

// Historique des ventes encaissées — retrouver une vente (commande de test,
// réclamation) et l'annuler. Propriétaire et administrateur.
export default function SalesPage() {
  const [from, setFrom] = useState(() => isoDay(new Date()));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [cancelling, setCancelling] = useState<Sale | null>(null);

  const load = useCallback(() => {
    setSales(null);
    api
      .get('/orders/sales', { params: { from, to } })
      .then((res) => setSales(res.data.orders))
      .catch(() => setSales([]));
  }, [from, to]);

  useEffect(load, [load]);

  const paid = (sales ?? []).filter((s) => s.status !== 'ANNULEE');
  const total = paid.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Ventes</h1>
          <p className="text-sm text-slate-500">
            {sales ? `${paid.length} vente${paid.length > 1 ? 's' : ''} encaissée${paid.length > 1 ? 's' : ''} · ${fcfa(total)}` : ' '}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="sr-only" htmlFor="sales-from">Du</label>
          <input id="sales-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input input-sm" />
          <span className="text-slate-500">au</span>
          <label className="sr-only" htmlFor="sales-to">Au</label>
          <input id="sales-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input input-sm" />
        </div>
      </div>

      {sales === null ? (
        <ListSkeleton />
      ) : sales.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Aucune vente" description="Aucune vente encaissée sur cette période." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
          <table className="table-cards w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Encaissée le</th>
                <th className="px-4 py-2 font-medium">Vente</th>
                <th className="px-4 py-2 font-medium">Paiement</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => {
                const cancelled = s.status === 'ANNULEE';
                const paidAt = s.payments[0]?.createdAt ?? s.updatedAt;
                return (
                  <tr key={s.id} className={cancelled ? 'bg-slate-50' : ''}>
                    <td data-label="Encaissée le" className="px-4 py-2 text-slate-600">
                      {new Date(paidAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td data-label="Vente" className="px-4 py-2">
                      <Link to={`/pos/${s.id}/receipt`} className="font-medium text-slate-900 hover:underline">
                        #{s.id.slice(0, 8).toUpperCase()} · {s.table ? `Table ${s.table.label}` : 'Comptoir'}
                      </Link>
                      <span className="block text-xs text-slate-500">
                        {s.user?.name ?? '—'}
                        {s.customer ? ` · ${s.customer.name}` : ''}
                      </span>
                      {cancelled && (
                        <span className="mt-1 inline-flex rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger-dark">
                          Annulée{s.voids[0] ? ` — ${s.voids[0].reason}` : ''}
                        </span>
                      )}
                    </td>
                    <td data-label="Paiement" className="px-4 py-2 text-slate-600">
                      {s.payments.map((p) => METHOD_LABELS[p.method] ?? p.method).join(' + ')}
                    </td>
                    <td data-label="Total" className={`px-4 py-2 text-right font-medium ${cancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {fcfa(Number(s.total))}
                    </td>
                    <td data-label="" className="px-4 py-2 text-right">
                      {!cancelled && (
                        <button onClick={() => setCancelling(s)} className="text-xs font-medium text-slate-500 hover:text-danger">
                          Annuler la vente
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cancelling && (
        <CancelSaleModal
          orderId={cancelling.id}
          total={Number(cancelling.total)}
          onClose={() => setCancelling(null)}
          onCancelled={() => {
            setCancelling(null);
            load();
          }}
        />
      )}
    </div>
  );
}
