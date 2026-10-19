import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchMyCashSession } from '@/features/cash/api';
import { fetchCustomer, recordCustomerPayment } from './api';
import { CustomerDetail } from './types';
import { useToast } from '@/lib/toast';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';

const formatFcfa = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

const STAY_STATUS_LABELS = { RESERVED: 'Réservé', CHECKED_IN: 'En cours', CHECKED_OUT: 'Terminé', CANCELLED: 'Annulé' } as const;

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Crédit',
  ROOM: 'Sur la chambre',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Session de caisse ouverte : un règlement espèces/carte/mobile y entre
  const [cashSessionId, setCashSessionId] = useState<string | undefined>();

  useEffect(() => {
    fetchMyCashSession()
      .then((session) => setCashSessionId(session?.id))
      .catch(() => setCashSessionId(undefined));
  }, []);

  const load = useCallback(() => {
    if (!id) return;
    fetchCustomer(id).then(setCustomer);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!customer) {
    return <PageSkeleton />;
  }

  const handleRecordPayment = async () => {
    if (!id || !amount || Number(amount) <= 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await recordCustomerPayment(id, {
        amount: Number(amount),
        method,
        note: note.trim() || undefined,
        cashSessionId,
      });
      toast.success('Règlement enregistré');
      setAmount('');
      setNote('');
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Relevé : tout ce qui a été mis sur le compte (POS et hôtel), du plus récent
  const charges = [
    ...customer.orders
      .map((o) => ({
        id: o.id,
        date: o.createdAt,
        label: 'Consommation',
        to: `/pos/${o.id}/receipt`,
        amount: o.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      }))
      .filter((c) => c.amount > 0),
    ...(customer.stayPayments ?? []).map((p) => ({
      id: p.id,
      date: p.createdAt,
      label: `Séjour chambre ${p.stay.room.number}${p.stay.room.building ? ` (${p.stay.room.building})` : ''} — ${p.stay.guestName}`,
      to: `/hotel/stays/${p.stay.id}`,
      amount: Number(p.amount),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: 'Clients', to: '/customers' }, { label: customer.name }]} />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-heading">{customer.name}</h1>
          <p className="text-xs text-slate-500">
            {customer.phone ?? 'Aucun téléphone'}{' '}
            {customer.address ? `— ${customer.address}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Solde dû</p>
          <p
            className={`text-2xl font-bold ${
              Number(customer.balance) > 0 ? 'text-danger' : 'text-slate-900'
            }`}
          >
            {formatFcfa(Number(customer.balance))}
          </p>
          {customer.creditLimit && (
            <p className="text-xs text-slate-500">
              Plafond {formatFcfa(Number(customer.creditLimit))}
            </p>
          )}
        </div>
      </div>

      {/* Enregistrer un règlement */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-heading-muted">Enregistrer un règlement</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Montant</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input w-32 px-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Mode</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="input px-2"
            >
              <option value="CASH">Espèces</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CARD">Carte</option>
              <option value="TRANSFER">Virement</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Note (optionnel)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input w-full px-2"
            />
          </div>
          <button
            onClick={handleRecordPayment}
            disabled={isSubmitting} aria-busy={isSubmitting}
            className="btn btn-primary"
          >
            Enregistrer
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <p className="mt-2 text-xs text-slate-500">
          {cashSessionId
            ? 'Les règlements en espèces, carte ou Mobile Money entrent dans votre session de caisse.'
            : 'Vous n’avez pas de session de caisse ouverte : le règlement réduit le solde du client sans entrer en caisse.'}
        </p>
      </div>

      {/* Historique des ventes à crédit */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-heading-muted">Mis sur le compte</h2>
        {charges.length > 0 ? (
          <table className="table-cards w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium">Détail</th>
                <th className="py-1 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {charges.map((c) => (
                <tr key={c.id}>
                  <td data-label="Date" className="py-1.5 text-slate-600">
                    {new Date(c.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td data-label="Détail" className="py-1.5">
                    <Link to={c.to} className="text-slate-700 hover:underline">
                      {c.label}
                    </Link>
                  </td>
                  <td data-label="Montant" className="py-1.5 font-medium text-slate-700">{formatFcfa(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">Rien n’a encore été mis sur ce compte</p>
        )}
      </div>

      {/* Séjours à l'hôtel rattachés au client */}
      {(customer.stays ?? []).length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Séjours</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {(customer.stays ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link to={`/hotel/stays/${s.id}`} className="font-medium text-slate-900 hover:underline">
                  Chambre {s.room.number}
                  {s.room.building ? ` (${s.room.building})` : ''} — {s.guestName}
                </Link>
                <span className="text-xs text-slate-500">
                  {new Date(s.checkInDate).toLocaleDateString('fr-FR')} → {new Date(s.checkOutDate).toLocaleDateString('fr-FR')} ·{' '}
                  {STAY_STATUS_LABELS[s.status]} · {s.establishment.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Historique des règlements */}
      <div className="rounded-lg border border-slate-200 bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-heading-muted">Règlements reçus</h2>
        {customer.payments.length > 0 ? (
          <table className="table-cards w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium">Mode</th>
                <th className="py-1 font-medium">Montant</th>
                <th className="py-1 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customer.payments.map((p) => (
                <tr key={p.id}>
                  <td data-label="Date" className="py-1.5 text-slate-600">
                    {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td data-label="Mode" className="py-1.5 text-slate-600">{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td data-label="Montant" className="py-1.5 text-slate-600">{formatFcfa(Number(p.amount))}</td>
                  <td data-label="Note" className="py-1.5 text-slate-500">{p.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">Aucun règlement enregistré</p>
        )}
      </div>
    </div>
  );
}
