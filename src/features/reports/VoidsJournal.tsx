import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { ListSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import type { OrderVoid } from '@/features/pos/types';

type VoidRow = OrderVoid & { order: { id: string; table: { label: string } | null } };

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const isoDay = (d: Date) => d.toLocaleDateString('en-CA');

// Journal des annulations et articles retirés — contrôle du propriétaire :
// qui, quand, combien, et pour quel motif
export default function VoidsJournal() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDay(d);
  });
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [rows, setRows] = useState<VoidRow[] | null>(null);

  useEffect(() => {
    setRows(null);
    api
      .get('/orders/voids', { params: { from, to } })
      .then((res) => setRows(res.data.voids))
      .catch(() => setRows([]));
  }, [from, to]);

  const total = (rows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-heading-muted">
            <Undo2 size={16} />
            Annulations et articles retirés
          </h2>
          {rows && rows.length > 0 && (
            <p className="text-xs text-slate-500">
              {rows.length} opération{rows.length > 1 ? 's' : ''} · {fcfa(total)} non facturés
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="sr-only" htmlFor="voids-from">Du</label>
          <input id="voids-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input input-sm" />
          <span className="text-slate-500">au</span>
          <label className="sr-only" htmlFor="voids-to">Au</label>
          <input id="voids-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input input-sm" />
        </div>
      </div>

      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState compact icon={Undo2} title="Aucune annulation" description="Aucune commande annulée ni article retiré sur cette période." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-cards w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Opération</th>
                <th className="pb-2 font-medium">Motif</th>
                <th className="pb-2 font-medium">Par</th>
                <th className="pb-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Date" className="py-2 text-slate-600">
                    {new Date(r.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td data-label="Opération" className="py-2">
                    <Link to={`/pos/${r.order.id}`} className="text-slate-900 hover:underline">
                      {r.type === 'ORDER' ? 'Commande annulée' : `${r.quantity} × ${r.productName} retiré`}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {r.order.table ? `Table ${r.order.table.label}` : 'Comptoir'}
                      {r.wasPrepared ? ' · déjà préparé (perte de stock)' : ''}
                    </span>
                  </td>
                  <td data-label="Motif" className="py-2 text-slate-600">{r.reason}</td>
                  <td data-label="Par" className="py-2 text-slate-600">{r.user.name}</td>
                  <td data-label="Montant" className="py-2 text-right font-medium text-slate-900">{fcfa(Number(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
