import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Banknote, DoorClosed, DoorOpen, Printer, Users, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/confirm';
import { getSocket } from '@/lib/socket';
import { PrintPortal, printTicket, usePrintSettings } from '@/lib/print';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { fetchCustomers } from '@/features/customers/api';
import type { Customer } from '@/features/customers/types';
import { fetchMyCashSession } from '@/features/cash/api';
import { apiError } from './api';
import { addStayGroupPayment, checkInStayGroup, checkOutStayGroup, fetchStayGroup, type StayGroupDetail } from './groupApi';
import { CATEGORY_LABELS, fcfa, formatDay, roomName, STAY_PAYMENT_LABELS, STAY_STATUS } from './labels';
import GroupInvoiceTicket from './GroupInvoiceTicket';
import { hotelInvoiceNo } from '@/features/pos/invoiceNumber';
import type { StayPaymentMethod } from './types';

const METHODS: StayPaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'CARD', 'TRANSFER', 'CREDIT'];

// Versement pour tout le groupe : réparti automatiquement sur ses chambres
function GroupPaymentDialog({ group, onClose, onPaid }: { group: StayGroupDetail; onClose: () => void; onPaid: (g: StayGroupDetail) => void }) {
  const toast = useToast();
  const [method, setMethod] = useState<StayPaymentMethod>(group.customer ? 'CREDIT' : 'CASH');
  const [amount, setAmount] = useState(String(Math.max(0, Math.round(group.totals.balance))));
  const [note, setNote] = useState('');
  const [cashSessionId, setCashSessionId] = useState<string | undefined>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(group.customer?.id ?? '');
  const [saving, setSaving] = useState(false);
  const isCredit = method === 'CREDIT';

  useEffect(() => {
    fetchMyCashSession()
      .then((s) => setCashSessionId(s?.id))
      .catch(() => setCashSessionId(undefined));
    fetchCustomers()
      .then((list) => setCustomers(list.filter((c) => c.isActive)))
      .catch(() => setCustomers([]));
  }, []);

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return toast.error('Saisissez un montant');
    if (isCredit && !customerId) return toast.error('Choisissez le compte client à débiter');
    setSaving(true);
    try {
      const updated = await addStayGroupPayment(group.id, {
        method,
        amount: value,
        note: note.trim() || undefined,
        cashSessionId: isCredit ? undefined : cashSessionId,
        customerId: isCredit ? customerId : undefined,
      });
      toast.success(isCredit ? `${fcfa(value)} mis sur le compte client` : `Versement de ${fcfa(value)} enregistré`);
      onPaid(updated);
    } catch (err) {
      toast.error(apiError(err, 'Impossible d’enregistrer le versement'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Encaisser le groupe">
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Encaisser le groupe</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Reste à payer : <span className="font-semibold text-heading">{fcfa(Math.max(0, group.totals.balance))}</span>
          <span className="block text-xs text-slate-500">Le montant est réparti automatiquement sur les chambres du groupe.</span>
        </p>
        {method === 'CASH' && Number(amount) > group.totals.balance && group.totals.balance > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-success-soft px-4 py-3 text-success-dark">
            <span className="text-sm font-medium">Monnaie à rendre</span>
            <span className="text-xl font-bold">{fcfa(Number(amount) - group.totals.balance)}</span>
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${method === m ? 'border-action bg-primary-50 text-primary-800 ring-1 ring-action' : 'border-slate-200 text-slate-600'}`}
              >
                {STAY_PAYMENT_LABELS[m]}
              </button>
            ))}
          </div>
          {isCredit && (
            <div>
              <label htmlFor="gpay-customer" className="mb-1 block text-sm font-medium text-slate-700">
                Compte client à débiter
              </label>
              <select id="gpay-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input w-full">
                <option value="">Choisir un client…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isCredit && !cashSessionId && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-dark">
              Vous n’avez pas de session de caisse ouverte : le versement sera enregistré sans entrer en caisse.
            </p>
          )}
          <div>
            <label htmlFor="gpay-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Montant (FCFA)
            </label>
            <input id="gpay-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label htmlFor="gpay-note" className="mb-1 block text-sm font-medium text-slate-700">
              Note (optionnel)
            </label>
            <input id="gpay-note" value={note} onChange={(e) => setNote(e.target.value)} className="input w-full" placeholder="Acompte, bon de commande…" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Annuler
          </button>
          <button onClick={submit} disabled={saving || (isCredit && !customerId)} aria-busy={saving} className="btn btn-primary flex-1">
            {isCredit ? 'Mettre sur le compte' : 'Enregistrer le versement'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { settings } = usePrintSettings();
  const [group, setGroup] = useState<StayGroupDetail | null>(null);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetchStayGroup(id).then(setGroup);
  }, [id]);

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('hotel:updated', load);
    return () => {
      socket.off('hotel:updated', load);
    };
  }, [load]);

  if (!group) return <PageSkeleton />;

  const { totals } = group;
  const reserved = group.stays.filter((s) => s.status === 'RESERVED').length;
  const inHouse = group.stays.filter((s) => s.status === 'CHECKED_IN').length;

  const run = async (action: () => Promise<StayGroupDetail>, success: string) => {
    setBusy(true);
    try {
      setGroup(await action());
      toast.success(success);
    } catch (err) {
      toast.error(apiError(err, 'Action impossible'));
    } finally {
      setBusy(false);
    }
  };

  // Chambres pas encore nettoyées : on prévient avant l'arrivée du groupe
  const checkIn = async () => {
    const dirty = group.stays.filter((s) => s.status === 'RESERVED' && s.room.status === 'CLEANING').map((s) => roomName(s.room));
    if (dirty.length > 0) {
      const ok = await confirm({
        title: 'Chambres à nettoyer',
        message: `Pas encore nettoyée${dirty.length > 1 ? 's' : ''} : ${dirty.join(', ')}. Enregistrer l’arrivée du groupe quand même ?`,
        confirmLabel: 'Enregistrer l’arrivée',
      });
      if (!ok) return;
    }
    run(() => checkInStayGroup(group.id), 'Arrivée du groupe enregistrée');
  };

  const checkOut = async () => {
    setBusy(true);
    try {
      setGroup(await checkOutStayGroup(group.id));
      toast.success('Départ du groupe enregistré');
    } catch (err) {
      const code = (err as { response?: { data?: { code?: string } } }).response?.data?.code;
      if (code === 'BALANCE_DUE') {
        const ok = await confirm({
          title: 'Solde impayé',
          message: `${apiError(err, '')}. Enregistrer le départ quand même ?`,
          confirmLabel: 'Départ quand même',
          danger: true,
        });
        if (ok) {
          setGroup(await checkOutStayGroup(group.id, true));
          toast.warning('Départ du groupe enregistré avec un solde impayé');
        }
      } else {
        toast.error(apiError(err, 'Départ impossible'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <Breadcrumbs items={[{ label: 'Séjours', to: '/hotel/stays' }, { label: group.name }]} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-heading">
            <Users size={22} />
            {group.name}
          </h1>
          <p className="text-sm text-slate-500">
            Facture N° {hotelInvoiceNo(group)} · {totals.rooms} chambre{totals.rooms > 1 ? 's' : ''}
            {group.customer ? ` · payé par ${group.customer.name}` : ''}
            {group.contactPhone ? ` · ${group.contactPhone}` : ''}
          </p>
          {group.notes && <p className="text-sm text-slate-500">{group.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {reserved > 0 && (
            <button onClick={checkIn} disabled={busy} className="btn btn-secondary">
              <DoorOpen size={16} />
              Arrivée du groupe ({reserved})
            </button>
          )}
          <button onClick={() => setPaying(true)} className="btn btn-secondary">
            <Banknote size={16} />
            Encaisser
          </button>
          {inHouse > 0 && (
            <button onClick={checkOut} disabled={busy} className="btn btn-secondary">
              <DoorClosed size={16} />
              Départ du groupe ({inHouse})
            </button>
          )}
          <button onClick={() => printTicket()} className="btn btn-primary">
            <Printer size={16} />
            Facture du groupe
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: fcfa(totals.total) },
          { label: 'Avance', value: fcfa(totals.paid) },
          { label: totals.balance > 0 ? 'Reste à payer' : 'Soldé', value: fcfa(Math.max(0, totals.balance)) },
          { label: 'Consommations et prestations', value: fcfa(totals.charges + (totals.services ?? 0)) },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-slate-200 bg-surface p-3">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-lg font-semibold text-heading">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
        <table className="table-cards w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Chambre</th>
              <th className="px-4 py-2 font-medium">Occupant</th>
              <th className="px-4 py-2 font-medium">Dates</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 text-right font-medium">Montant</th>
              <th className="px-4 py-2 text-right font-medium">Reste</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {group.stays.map((s) => (
              <tr key={s.id} className={s.status === 'CANCELLED' ? 'opacity-60' : ''}>
                <td data-label="Chambre" className="px-4 py-2">
                  <Link to={`/hotel/stays/${s.id}`} className="font-semibold text-heading hover:underline">
                    {roomName(s.room)}
                  </Link>
                  <span className="block text-xs text-slate-500">{CATEGORY_LABELS[s.room.category]}</span>
                </td>
                <td data-label="Occupant" className="px-4 py-2 text-slate-700">{s.guestName}</td>
                <td data-label="Dates" className="px-4 py-2 text-slate-600">
                  {formatDay(s.checkInDate, { day: '2-digit', month: '2-digit' })} → {formatDay(s.checkOutDate, { day: '2-digit', month: '2-digit' })}
                  <span className="block text-xs text-slate-500">{s.totals.nights} nuitée{s.totals.nights > 1 ? 's' : ''}</span>
                </td>
                <td data-label="Statut" className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STAY_STATUS[s.status].badge}`}>{STAY_STATUS[s.status].label}</span>
                </td>
                <td data-label="Montant" className="px-4 py-2 text-right text-slate-700">{fcfa(s.totals.total)}</td>
                <td data-label="Reste" className="px-4 py-2 text-right font-medium text-heading">{fcfa(Math.max(0, s.totals.balance))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Touchez une chambre pour gérer un départ anticipé, un changement de chambre ou une annulation. Les consommations
        mises « sur la chambre » par les occupants s’ajoutent à la facture du groupe.
      </p>

      <PrintPortal>
        <GroupInvoiceTicket group={group} paperWidth={settings.paperWidth} />
      </PrintPortal>

      {paying && (
        <GroupPaymentDialog
          group={group}
          onClose={() => setPaying(false)}
          onPaid={(g) => {
            setGroup(g);
            setPaying(false);
          }}
        />
      )}
    </div>
  );
}
