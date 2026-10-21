import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuth } from '@/features/auth/AuthContext';
import { hotelInvoiceNo, invoiceNo } from './invoiceNumber';
import type { OrderStatus, PaymentMethod } from './types';

interface FoundOrder {
  id: string;
  number: number | null;
  status: OrderStatus;
  total: string;
  createdAt: string;
  table: { label: string } | null;
  customer: { name: string } | null;
  payments: { method: PaymentMethod }[];
}

interface FoundStay {
  id: string;
  number: number | null;
  guestName: string;
  status: string;
  checkInDate: string;
  room: { number: string; building?: string };
  total: number;
  balance: number;
}

interface FoundGroup {
  id: string;
  number: number | null;
  name: string;
  createdAt: string;
}

const PAID: OrderStatus[] = ['PAYEE', 'FERMEE'];
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const FRONT_DESK = ['OWNER', 'ADMIN', 'CASHIER'];

// Retrouver une facture : R0012 (point de vente), H0012 (hôtel), nom du
// client, du groupe ou numéro de table
export default function InvoiceSearch() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [orders, setOrders] = useState<FoundOrder[] | null>(null);
  const [stays, setStays] = useState<FoundStay[]>([]);
  const [groups, setGroups] = useState<FoundGroup[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setOrders(null);
      setStays([]);
      setGroups([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api
        .get('/orders/search', { params: { q: term } })
        .then((res) => setOrders(res.data.orders))
        .catch(() => setOrders([]));
      if (user && FRONT_DESK.includes(user.role)) {
        api
          .get('/hotel/search', { params: { q: term } })
          .then((res) => {
            setStays(res.data.stays);
            setGroups(res.data.groups);
          })
          .catch(() => {
            setStays([]);
            setGroups([]);
          });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q, user]);

  const orderStatus = (o: FoundOrder) => {
    if (o.status === 'ANNULEE') return { label: 'Annulée', cls: 'bg-slate-100 text-slate-600' };
    if (PAID.includes(o.status)) {
      return o.payments.some((p) => p.method === 'CREDIT')
        ? { label: 'Sur compte client', cls: 'bg-warning-soft text-warning-dark' }
        : { label: 'Payée', cls: 'bg-success-soft text-success-dark' };
    }
    return { label: 'Non payée', cls: 'bg-danger-soft text-danger-dark' };
  };
  const stayStatus = (s: FoundStay) => {
    if (s.status === 'CANCELLED') return { label: 'Annulée', cls: 'bg-slate-100 text-slate-600' };
    if (s.balance <= 0) return { label: 'Payée', cls: 'bg-success-soft text-success-dark' };
    return s.total - s.balance > 0
      ? { label: 'Avance versée', cls: 'bg-warning-soft text-warning-dark' }
      : { label: 'Non payée', cls: 'bg-danger-soft text-danger-dark' };
  };

  const count = (orders?.length ?? 0) + stays.length + groups.length;
  const row = 'flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50';
  const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mb-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une facture : R0012, H0012, client ou table"
          aria-label="Rechercher une facture"
          className="input w-full rounded-lg py-2.5 pl-9 shadow-sm"
        />
      </div>
      {orders !== null && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-surface">
          {count === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Aucune facture trouvée.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {orders.map((o) => {
                const st = orderStatus(o);
                return (
                  <li key={o.id}>
                    <Link to={PAID.includes(o.status) ? `/pos/${o.id}/receipt` : `/pos/${o.id}`} className={row}>
                      <span>
                        <span className="font-semibold text-heading">N° {invoiceNo(o)}</span>
                        <span className="text-slate-600">
                          {' '}
                          · {o.table ? `Table ${o.table.label}` : 'Comptoir'}
                          {o.customer ? ` · ${o.customer.name}` : ''}
                        </span>
                        <span className="block text-xs text-slate-500">{when(o.createdAt)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        <span className="font-medium text-heading">{fcfa(Number(o.total))}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {stays.map((s) => {
                const st = stayStatus(s);
                return (
                  <li key={s.id}>
                    <Link to={`/hotel/stays/${s.id}`} className={row}>
                      <span>
                        <span className="font-semibold text-heading">N° {hotelInvoiceNo(s)}</span>
                        <span className="text-slate-600">
                          {' '}
                          · Chambre {s.room.number}
                          {s.room.building ? ` (${s.room.building})` : ''} · {s.guestName}
                        </span>
                        <span className="block text-xs text-slate-500">Séjour · arrivée {new Date(s.checkInDate).toLocaleDateString('fr-FR')}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        <span className="font-medium text-heading">{fcfa(s.total)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {groups.map((g) => (
                <li key={g.id}>
                  <Link to={`/hotel/groups/${g.id}`} className={row}>
                    <span>
                      <span className="font-semibold text-heading">N° {hotelInvoiceNo(g)}</span>
                      <span className="text-slate-600"> · Groupe {g.name}</span>
                      <span className="block text-xs text-slate-500">Facture de groupe · {when(g.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
