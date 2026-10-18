import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Banknote, DoorClosed, DoorOpen, Pencil, Printer, X } from 'lucide-react';
import { api } from '@/lib/axios';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/confirm';
import { getSocket } from '@/lib/socket';
import { PrintPortal, printTicket, usePrintSettings } from '@/lib/print';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useActiveEstablishment } from '@/features/establishments/ActiveEstablishmentContext';
import { fetchCustomers } from '@/features/customers/api';
import { fetchMyCashSession } from '@/features/cash/api';
import type { Customer } from '@/features/customers/types';
import { addStayPayment, apiError, cancelStay, checkInStay, checkOutStay, fetchRooms, fetchStay, fetchTaxRates } from './api';
import { CATEGORY_LABELS, fcfa, formatDay, roomName, STAY_PAYMENT_LABELS, STAY_STATUS } from './labels';
import StayFormModal from './StayFormModal';
import StayInvoiceTicket from './StayInvoiceTicket';
import StayChargesCard from './StayChargesCard';
import type { Room, StayDetail, StayPaymentMethod, TaxRate } from './types';

const METHODS: StayPaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'CARD', 'TRANSFER', 'CREDIT'];

// Versement (acompte ou solde) — entre dans la caisse ouverte s'il y en a une.
// « Compte client » : le montant est mis sur le compte d'un client (entreprise,
// habitué) qui le réglera plus tard, depuis sa fiche Clients.
function PaymentDialog({ stay, onClose, onPaid }: { stay: StayDetail; onClose: () => void; onPaid: (s: StayDetail) => void }) {
  const toast = useToast();
  const [method, setMethod] = useState<StayPaymentMethod>('CASH');
  const [amount, setAmount] = useState(String(Math.max(0, stay.totals.balance)));
  const [note, setNote] = useState('');
  const [cashSessionId, setCashSessionId] = useState<string | undefined>();
  const [hasSession, setHasSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerId, setCustomerId] = useState('');
  const isCredit = method === 'CREDIT';
  const customer = customers?.find((c) => c.id === customerId);

  useEffect(() => {
    if (isCredit && customers === null) {
      fetchCustomers()
        .then((list) => setCustomers(list.filter((c) => c.isActive)))
        .catch(() => setCustomers([]));
    }
  }, [isCredit, customers]);

  useEffect(() => {
    // Le versement entre dans la session de caisse de la personne connectée
    fetchMyCashSession()
      .then((session) => {
        if (session) setCashSessionId(session.id);
        else setHasSession(false);
      })
      .catch(() => setHasSession(false));
  }, []);

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return toast.error('Saisissez un montant');
    if (isCredit && !customerId) return toast.error('Choisissez le compte client à débiter');
    setSaving(true);
    try {
      const updated = await addStayPayment(stay.id, {
        method,
        amount: value,
        note: note.trim() || undefined,
        cashSessionId: isCredit ? undefined : cashSessionId,
        customerId: isCredit ? customerId : undefined,
      });
      toast.success(isCredit ? `${fcfa(value)} mis sur le compte de ${customer?.name ?? 'ce client'}` : `Versement de ${fcfa(value)} enregistré`);
      onPaid(updated);
    } catch (err) {
      toast.error(apiError(err, 'Impossible d’enregistrer le versement'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Encaisser">
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Encaisser</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Reste à payer : <span className="font-semibold text-heading">{fcfa(Math.max(0, stay.totals.balance))}</span>
          <span className="block text-xs text-slate-500">Acompte : saisissez un montant partiel.</span>
        </p>
        {!hasSession && !isCredit && (
          <p className="mb-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-dark">
            Vous n’avez pas de session de caisse ouverte : le versement sera enregistré sur le séjour, sans entrer en caisse.
          </p>
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
              <label htmlFor="pay-customer" className="mb-1 block text-sm font-medium text-slate-700">
                Compte client à débiter
              </label>
              {customers !== null && customers.length === 0 ? (
                <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
                  Aucun compte client : créez-le d’abord dans le menu <span className="font-semibold">Clients</span>.
                </p>
              ) : (
                <select id="pay-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input w-full">
                  <option value="">{customers === null ? 'Chargement…' : 'Choisir un client…'}</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {Number(c.balance) > 0 ? ` — doit ${fcfa(c.balance)}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {customer?.creditLimit && (
                <p className="mt-1 text-xs text-slate-500">
                  Plafond {fcfa(customer.creditLimit)} · encore disponible{' '}
                  {fcfa(Math.max(0, Number(customer.creditLimit) - Number(customer.balance)))}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">Rien n’entre en caisse : le client réglera plus tard depuis sa fiche.</p>
            </div>
          )}
          <div>
            <label htmlFor="pay-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Montant (FCFA)
            </label>
            <input id="pay-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label htmlFor="pay-note" className="mb-1 block text-sm font-medium text-slate-700">
              Note (optionnel)
            </label>
            <input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} className="input w-full" placeholder="Acompte, référence Mobile Money…" />
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

// Annulation d'une réservation qui a reçu une avance : la rembourser (sortie
// de caisse) ou la conserver comme frais d'annulation
function CancelWithAdvanceDialog({ stay, onClose, onCancelled }: { stay: StayDetail; onClose: () => void; onCancelled: (s: StayDetail) => void }) {
  const toast = useToast();
  const [choice, setChoice] = useState<'REFUND' | 'RETAIN'>('RETAIN');
  const [cashSessionId, setCashSessionId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const paid = stay.totals.paid;
  const cashPaid = stay.payments.filter((p) => p.method === 'CASH').reduce((s, p) => s + Number(p.amount), 0);

  useEffect(() => {
    fetchMyCashSession()
      .then((s) => setCashSessionId(s?.id))
      .catch(() => setCashSessionId(undefined));
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      const updated = await cancelStay(stay.id, { advance: choice, cashSessionId: choice === 'REFUND' ? cashSessionId : undefined });
      toast.success(choice === 'REFUND' ? `Réservation annulée — ${fcfa(paid)} remboursés` : `Réservation annulée — avance de ${fcfa(paid)} conservée`);
      onCancelled(updated);
    } catch (err) {
      toast.error(apiError(err, 'Annulation impossible'));
    } finally {
      setSaving(false);
    }
  };

  const options = [
    {
      value: 'RETAIN' as const,
      title: 'Conserver l’avance',
      text: 'Elle devient des frais d’annulation et compte dans le chiffre d’affaires de l’hébergement.',
    },
    {
      value: 'REFUND' as const,
      title: 'Rembourser l’avance',
      text: 'Elle est rendue au client par le même mode de paiement. Les espèces sortent de votre caisse.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Annuler la réservation">
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Annuler la réservation</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          {stay.guestName} a versé une avance de <span className="font-semibold text-heading">{fcfa(paid)}</span>. Que faut-il en faire ?
        </p>
        <div className="space-y-2">
          {options.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${choice === o.value ? 'border-action bg-primary-50 ring-1 ring-action' : 'border-slate-200'}`}
            >
              <input type="radio" name="advance" checked={choice === o.value} onChange={() => setChoice(o.value)} className="mt-1 h-4 w-4" />
              <span>
                <span className="block text-sm font-semibold text-heading">{o.title}</span>
                <span className="block text-xs text-slate-600">{o.text}</span>
              </span>
            </label>
          ))}
        </div>
        {choice === 'REFUND' && cashPaid > 0 && !cashSessionId && (
          <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-dark">
            Vous n’avez pas de session de caisse ouverte : les {fcfa(cashPaid)} en espèces seront notés remboursés, sans sortie de caisse.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Retour
          </button>
          <button onClick={submit} disabled={saving} aria-busy={saving} className="btn btn-danger flex-1">
            Annuler la réservation
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { settings } = usePrintSettings();
  const { current: establishment } = useActiveEstablishment();
  const [stay, setStay] = useState<StayDetail | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancellingWithAdvance, setCancellingWithAdvance] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetchStay(id)
      .then(setStay)
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    load();
    Promise.all([fetchRooms(), fetchTaxRates()]).then(([r, t]) => {
      setRooms(r);
      setTaxRates(t);
    });
    // Consommation mise sur la chambre depuis le POS, versement à l'autre poste…
    const socket = getSocket();
    socket.on('hotel:updated', load);
    socket.on('order:paid', load);
    return () => {
      socket.off('hotel:updated', load);
      socket.off('order:paid', load);
    };
  }, [load]);

  if (notFound) return <p className="text-sm text-slate-500">Séjour introuvable.</p>;
  if (!stay) return <PageSkeleton />;

  const st = STAY_STATUS[stay.status];
  const { totals } = stay;

  const act = async (action: () => Promise<StayDetail>, success: string) => {
    setBusy(true);
    try {
      setStay(await action());
      toast.success(success);
    } catch (err) {
      toast.error(apiError(err, 'Action impossible'));
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setBusy(true);
    try {
      setStay(await checkOutStay(stay.id));
      toast.success(`Départ de ${stay.guestName} enregistré — chambre ${roomName(stay.room)} à nettoyer`);
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      if (data?.code === 'BALANCE_DUE') {
        const ok = await confirm({
          title: 'Solde impayé',
          message: `${data.message}. Enregistrer quand même le départ ? Le solde restera dû sur la facture.`,
          confirmLabel: 'Départ quand même',
          danger: true,
        });
        if (ok) {
          try {
            setStay(await checkOutStay(stay.id, true));
            toast.warning('Départ enregistré avec un solde impayé');
          } catch (e) {
            toast.error(apiError(e, 'Départ impossible'));
          }
        }
      } else {
        toast.error(apiError(err, 'Départ impossible'));
      }
    } finally {
      setBusy(false);
    }
  };

  // Chambre pas encore nettoyée : on prévient avant d'y installer le client
  const handleCheckIn = async () => {
    if (stay.room.status === 'CLEANING') {
      const ok = await confirm({
        title: 'Chambre à nettoyer',
        message: `La chambre ${roomName(stay.room)} n’a pas encore été nettoyée. Enregistrer l’arrivée quand même ?`,
        confirmLabel: 'Enregistrer l’arrivée',
      });
      if (!ok) return;
    }
    act(() => checkInStay(stay.id), `Arrivée de ${stay.guestName} enregistrée`);
  };

  const handleCancel = async () => {
    // Une avance a été versée : rembourser ou conserver ?
    if (stay.totals.paid > 0) {
      setCancellingWithAdvance(true);
      return;
    }
    const ok = await confirm({
      title: 'Annuler la réservation',
      message: `Annuler la réservation de ${stay.guestName} ? La chambre sera libérée pour ces dates.`,
      confirmLabel: 'Annuler la réservation',
      danger: true,
    });
    if (ok) act(() => cancelStay(stay.id), 'Réservation annulée');
  };

  const canEdit = stay.status === 'RESERVED' || stay.status === 'CHECKED_IN';

  return (
    <div className="max-w-4xl">
      <Breadcrumbs items={[{ label: 'Chambres', to: '/hotel' }, { label: 'Séjours', to: '/hotel/stays' }, { label: stay.guestName }]} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-heading">{stay.guestName}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.badge}`}>{st.label}</span>
          </div>
          <p className="text-sm text-slate-500">
            {stay.group && (
              <Link to={`/hotel/groups/${stay.group.id}`} className="mr-1 font-medium text-primary-700 hover:underline">
                Groupe {stay.group.name} ·
              </Link>
            )}
            Chambre {roomName(stay.room)} · {CATEGORY_LABELS[stay.room.category]} · {stay.adults} adulte{stay.adults > 1 ? 's' : ''}
            {stay.children > 0 ? `, ${stay.children} enfant${stay.children > 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stay.status === 'RESERVED' && (
            <button onClick={handleCheckIn} disabled={busy} aria-busy={busy} className="btn btn-primary">
              <DoorOpen size={16} />
              Enregistrer l’arrivée
            </button>
          )}
          {stay.status === 'CHECKED_IN' && (
            <button onClick={handleCheckOut} disabled={busy} aria-busy={busy} className="btn btn-primary">
              <DoorClosed size={16} />
              Enregistrer le départ
            </button>
          )}
          {stay.status !== 'CANCELLED' && (
            <button onClick={() => setPaying(true)} className="btn btn-secondary">
              <Banknote size={16} />
              Encaisser
            </button>
          )}
          <button onClick={() => printTicket()} className="btn btn-secondary">
            <Printer size={16} />
            Imprimer la facture
          </button>
          {canEdit && (
            <button onClick={() => setEditing(true)} className="btn btn-secondary">
              <Pencil size={16} />
              Modifier
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Informations */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-surface p-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Arrivée</p>
              <p className="font-medium text-heading">{formatDay(stay.checkInDate)}</p>
              {stay.checkedInAt && <p className="text-xs text-slate-500">à {new Date(stay.checkedInAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500">Départ</p>
              <p className="font-medium text-heading">{formatDay(stay.checkOutDate)}</p>
              {stay.checkedOutAt && <p className="text-xs text-slate-500">à {new Date(stay.checkedOutAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500">Téléphone</p>
              <p className="font-medium text-heading">{stay.guestPhone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pièce d’identité</p>
              <p className="font-medium text-heading">{stay.guestIdNumber ?? '—'}</p>
            </div>
            {stay.notes && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-slate-500">Remarques</p>
                <p className="text-heading">{stay.notes}</p>
              </div>
            )}
          </div>

          <StayChargesCard stay={stay} onChanged={setStay} />

          {/* Consommations mises sur la chambre */}
          <div className="rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-heading-muted">Consommations sur la chambre</h2>
            {stay.orders.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune consommation. Au bar ou au restaurant, choisissez « Sur la chambre » à l’encaissement.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {stay.orders.map((o) => {
                  const roomAmount = o.payments.filter((p) => p.method === 'ROOM').reduce((s, p) => s + Number(p.amount), 0);
                  return (
                    <li key={o.id} className="py-2">
                      <div className="flex justify-between font-medium text-heading">
                        <span>
                          {formatDay(o.createdAt, { day: '2-digit', month: '2-digit' })}
                          {o.establishment && o.establishment.name !== stay.establishment?.name ? ` · ${o.establishment.name}` : ''} ·{' '}
                          {o.table ? `Table ${o.table.label}` : 'Comptoir'}
                        </span>
                        <span>{fcfa(roomAmount)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Versements */}
          <div className="rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-heading-muted">Versements</h2>
            {stay.payments.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun versement pour l’instant (acompte ou solde).</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {stay.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-2">
                    <span>
                      <span className="font-medium text-heading">
                        {Number(p.amount) < 0 ? 'Remboursement · ' : ''}
                        {STAY_PAYMENT_LABELS[p.method]}
                        {p.customer ? ` — ${p.customer.name}` : ''}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {new Date(p.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {p.user.name}
                        {p.note ? ` · ${p.note}` : ''}
                      </span>
                    </span>
                    <span className="font-medium text-heading">{fcfa(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {stay.status === 'RESERVED' && (
            <button onClick={handleCancel} className="text-sm font-medium text-danger hover:underline">
              Annuler la réservation
            </button>
          )}
        </div>

        {/* Facture */}
        <div className="h-fit rounded-lg border border-slate-200 bg-surface p-4 text-sm lg:sticky lg:top-20">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Facture</h2>
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>
                {totals.nights} nuitée{totals.nights > 1 ? 's' : ''} × {fcfa(stay.nightlyRate)}
              </span>
              <span>{fcfa(totals.lodging)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxe de séjour</span>
              <span>{fcfa(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Consommations</span>
              <span>{fcfa(totals.charges)}</span>
            </div>
            {(totals.services ?? 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Prestations</span>
                <span>{fcfa(totals.services)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-heading">
              <span>Total</span>
              <span>{fcfa(totals.total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Avance</span>
              <span>− {fcfa(totals.paid)}</span>
            </div>
            <div
              className={`mt-2 flex justify-between rounded-lg px-3 py-2 text-base font-bold ${
                totals.balance > 0 ? 'bg-warning-soft text-warning-dark' : 'bg-success-soft text-success-dark'
              }`}
            >
              <span>{totals.balance > 0 ? 'Reste à payer' : totals.balance < 0 ? 'Trop-perçu' : 'Soldé'}</span>
              <span>{fcfa(Math.abs(totals.balance))}</span>
            </div>
          </div>
          {stay.status === 'CHECKED_IN' && (
            <p className="mt-3 text-xs text-slate-500">
              Le montant suit la date de départ prévue ; il s’ajuste aux nuitées réelles lors du départ.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">Créé par {stay.user.name}</p>
        </div>
      </div>

      {editing && (
        <StayFormModal
          rooms={rooms}
          taxRates={taxRates}
          stay={stay}
          onClose={() => setEditing(false)}
          onSaved={(s) => {
            setEditing(false);
            setStay(s);
          }}
        />
      )}
      {paying && (
        <PaymentDialog
          stay={stay}
          onClose={() => setPaying(false)}
          onPaid={(s) => {
            setPaying(false);
            setStay(s);
          }}
        />
      )}

      <PrintPortal>
        <StayInvoiceTicket stay={stay} establishment={{ name: establishment.name, logo: establishment.logo }} paperWidth={settings.paperWidth} />
      </PrintPortal>

      {cancellingWithAdvance && (
        <CancelWithAdvanceDialog
          stay={stay}
          onClose={() => setCancellingWithAdvance(false)}
          onCancelled={(s) => {
            setCancellingWithAdvance(false);
            setStay(s);
          }}
        />
      )}

      {/* Retour au plan après départ ou annulation */}
      {(stay.status === 'CHECKED_OUT' || stay.status === 'CANCELLED') && (
        <button onClick={() => navigate('/hotel')} className="btn btn-secondary mt-6">
          Retour au plan des chambres
        </button>
      )}
    </div>
  );
}
