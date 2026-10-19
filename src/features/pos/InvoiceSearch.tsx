import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '@/lib/axios';
import { invoiceNo } from './invoiceNumber';
import type { OrderStatus, PaymentMethod } from './types';

interface Found {
  id: string;
  number: number | null;
  status: OrderStatus;
  total: string;
  createdAt: string;
  table: { label: string } | null;
  customer: { name: string } | null;
  payments: { method: PaymentMethod }[];
}

const PAID: OrderStatus[] = ['PAYEE', 'FERMEE'];
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

// Retrouver une facture : par numéro (12 ou 0012), nom du client ou table
export default function InvoiceSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Found[] | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      return;
    }
    const timer = window.setTimeout(() => {
      api
        .get('/orders/search', { params: { q: term } })
        .then((res) => setResults(res.data.orders))
        .catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const statusOf = (o: Found) => {
    if (o.status === 'ANNULEE') return { label: 'Annulée', cls: 'bg-slate-100 text-slate-600' };
    if (PAID.includes(o.status)) {
      return o.payments.some((p) => p.method === 'CREDIT')
        ? { label: 'Sur compte client', cls: 'bg-warning-soft text-warning-dark' }
        : { label: 'Payée', cls: 'bg-success-soft text-success-dark' };
    }
    return { label: 'Non payée', cls: 'bg-danger-soft text-danger-dark' };
  };

  return (
    <div className="mb-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une facture : numéro (ex. 0012), client ou table"
          aria-label="Rechercher une facture"
          className="input w-full rounded-lg py-2.5 pl-9 shadow-sm"
        />
      </div>
      {results !== null && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-surface">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Aucune facture trouvée.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {results.map((o) => {
                const st = statusOf(o);
                const paid = PAID.includes(o.status);
                return (
                  <li key={o.id}>
                    <Link
                      to={paid ? `/pos/${o.id}/receipt` : `/pos/${o.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-semibold text-heading">N° {invoiceNo(o)}</span>
                        <span className="text-slate-600">
                          {' '}
                          · {o.table ? `Table ${o.table.label}` : 'Comptoir'}
                          {o.customer ? ` · ${o.customer.name}` : ''}
                        </span>
                        <span className="block text-xs text-slate-500">{new Date(o.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        <span className="font-medium text-heading">{fcfa(Number(o.total))}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
