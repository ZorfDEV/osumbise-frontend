import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { ListSkeleton } from '@/components/ui/skeleton';

interface Row {
  id: string;
  cashier: { id: string; name: string };
  register: string;
  openedAt: string;
  closedAt: string | null;
  sales: number;
  cash: number;
  mobile: number;
  card: number;
  total: number;
  discrepancy: number | null;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Récapitulatif par caissière (responsables) : total des ventes théorique de
// chaque session du jour = espèces + Mobile Money + carte, et écart à la clôture
export default function DailyCashierSummary() {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    setRows(null);
    api
      .get('/cash-sessions/daily', { params: { date } })
      .then((res) => setRows(res.data.sessions))
      .catch(() => setRows([]));
  }, [date]);

  const sum = (k: 'cash' | 'mobile' | 'card' | 'total') => (rows ?? []).reduce((s, r) => s + r[k], 0);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-heading-muted">Récapitulatif par caissière</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Jour" className="input input-sm" />
      </div>
      {rows === null ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune session ouverte ce jour-là.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-cards w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Caissière</th>
                <th className="py-2 pr-3 text-right font-medium">Espèces</th>
                <th className="py-2 pr-3 text-right font-medium">Mobile Money</th>
                <th className="py-2 pr-3 text-right font-medium">Carte</th>
                <th className="py-2 pr-3 text-right font-medium">Total ventes</th>
                <th className="py-2 text-right font-medium">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Caissière" className="py-2 pr-3">
                    <Link to={`/cash/${r.id}`} className="font-medium text-heading hover:underline">
                      {r.cashier.name}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {r.register} · {time(r.openedAt)} → {r.closedAt ? time(r.closedAt) : 'en cours'} · {r.sales} vente{r.sales > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td data-label="Espèces" className="py-2 pr-3 text-right text-slate-700">{fcfa(r.cash)}</td>
                  <td data-label="Mobile Money" className="py-2 pr-3 text-right text-slate-700">{fcfa(r.mobile)}</td>
                  <td data-label="Carte" className="py-2 pr-3 text-right text-slate-700">{fcfa(r.card)}</td>
                  <td data-label="Total ventes" className="py-2 pr-3 text-right font-semibold text-heading">{fcfa(r.total)}</td>
                  <td
                    data-label="Écart"
                    className={`py-2 text-right font-medium ${r.discrepancy === null ? 'text-slate-400' : r.discrepancy === 0 ? 'text-success-dark' : 'text-danger-dark'}`}
                  >
                    {r.discrepancy === null ? '—' : fcfa(r.discrepancy)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold text-heading">
                <td data-label="" className="py-2 pr-3">Total du jour</td>
                <td data-label="Espèces" className="py-2 pr-3 text-right">{fcfa(sum('cash'))}</td>
                <td data-label="Mobile Money" className="py-2 pr-3 text-right">{fcfa(sum('mobile'))}</td>
                <td data-label="Carte" className="py-2 pr-3 text-right">{fcfa(sum('card'))}</td>
                <td data-label="Total ventes" className="py-2 pr-3 text-right">{fcfa(sum('total'))}</td>
                <td data-label="" className="py-2" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
