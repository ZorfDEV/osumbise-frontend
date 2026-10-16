import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/lib/toast';
import { payOrder, PaymentLine } from './api';
import { fetchStays } from '@/features/hotel/api';
import type { StayListItem } from '@/features/hotel/types';

interface CashRegisterWithSession {
  id: string;
  sessions: { id: string }[];
}

interface Props {
  orderId: string;
  total: number;
  defaultMethod?: PaymentLine['method'];
  hasCustomer: boolean;
  customerName?: string;
  onClose: () => void;
  onPaid: () => void;
}

const METHODS: { value: PaymentLine['method']; label: string }[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARD', label: 'Carte' },
  { value: 'TRANSFER', label: 'Virement' },
  { value: 'CREDIT', label: 'Compte client' },
];

// Hôtel : proposé seulement quand des clients sont en séjour
const ROOM_METHOD = { value: 'ROOM' as const, label: 'Sur la chambre' };

export default function PaymentModal({
  orderId,
  total,
  defaultMethod,
  hasCustomer,
  customerName,
  onClose,
  onPaid,
}: Props) {
  const toast = useToast();
  const [lines, setLines] = useState<PaymentLine[]>([
    { method: defaultMethod ?? 'CASH', amount: total },
  ]);
  const [cashSessionId, setCashSessionId] = useState<string | undefined>();
  const [hasOpenSession, setHasOpenSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Clients en séjour (hôtel) : consommation imputée à leur chambre
  const [inHouse, setInHouse] = useState<StayListItem[]>([]);
  const [stayId, setStayId] = useState('');

  const hasCreditLineWithoutCustomer = lines.some((l) => l.method === 'CREDIT') && !hasCustomer;
  const hasRoomLine = lines.some((l) => l.method === 'ROOM');
  const methods = inHouse.length > 0 ? [...METHODS, ROOM_METHOD] : METHODS;

  // Hors hôtel ou sans droit d'accès à la réception : simplement aucune chambre proposée
  useEffect(() => {
    fetchStays({ status: ['CHECKED_IN'] })
      .then((stays) => setInHouse([...stays].sort((a, b) => a.room.number.localeCompare(b.room.number, 'fr', { numeric: true }))))
      .catch(() => setInHouse([]));
  }, []);

  useEffect(() => {
    api.get('/cash-registers').then((res) => {
      const registers: CashRegisterWithSession[] = res.data.cashRegisters;
      const withOpenSession = registers.find((r) => r.sessions.length > 0);
      if (withOpenSession) {
        setCashSessionId(withOpenSession.sessions[0].id);
      } else {
        setHasOpenSession(false);
      }
    });
  }, []);

  const totalEntered = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const remaining = total - totalEntered;

  const updateLine = (index: number, patch: Partial<PaymentLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { method: 'CASH', amount: Math.max(remaining, 0) }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (totalEntered < total) {
      setError('Le montant saisi est inférieur au total de la commande');
      return;
    }
    if (hasRoomLine && !stayId) {
      setError('Choisissez la chambre à laquelle imputer la consommation');
      return;
    }
    if (hasCreditLineWithoutCustomer) {
      setError('Rattache un client à la commande avant de choisir "Compte client" (voir le panneau commande)');
      return;
    }
    setIsSubmitting(true);
    try {
      await payOrder(orderId, lines, cashSessionId, hasRoomLine ? stayId : undefined);
      onPaid();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur lors de l’encaissement';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-lg bg-surface p-6 sm:rounded-lg">
        <h2 className="mb-1 text-lg font-semibold text-heading-muted">Encaissement</h2>
        <p className="mb-4 text-sm text-slate-500">
          Total à payer :{' '}
          <span className="font-medium text-slate-900">{total.toLocaleString('fr-FR')} FCFA</span>
        </p>

        {hasCustomer && customerName && (
          <p className="mb-4 rounded-md bg-info-soft px-3 py-2 text-xs text-info-dark">
            Client rattaché : <span className="font-medium">{customerName}</span>
          </p>
        )}

        {hasCreditLineWithoutCustomer && (
          <p className="mb-4 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-dark">
            Le mode "Compte client" nécessite un client rattaché à la commande — ferme cette fenêtre et
            choisis un client dans le panneau commande.
          </p>
        )}

        {!hasOpenSession && (
          <p className="mb-4 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-dark">
            Aucune session de caisse ouverte : le paiement sera enregistré, mais aucun mouvement
            de caisse ne sera créé.
          </p>
        )}

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={line.method}
                onChange={(e) =>
                  updateLine(i, { method: e.target.value as PaymentLine['method'] })
                }
                className="input px-2"
              >
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={line.amount}
                onChange={(e) => updateLine(i, { amount: Number(e.target.value) })}
                className="input flex-1"
              />
              {lines.length > 1 && (
                <button
                  onClick={() => removeLine(i)}
                  aria-label="Retirer cette ligne"
                  className="text-slate-500 hover:text-danger"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {hasRoomLine && (
          <div className="mt-4">
            <label htmlFor="pay-room" className="mb-1 block text-sm font-medium text-slate-700">
              Chambre du client
            </label>
            <select id="pay-room" value={stayId} onChange={(e) => setStayId(e.target.value)} className="input w-full">
              <option value="">Choisir la chambre…</option>
              {inHouse.map((s) => (
                <option key={s.id} value={s.id}>
                  Chambre {s.room.number} — {s.guestName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Ajouté à la facture du séjour, réglée au départ. Aucun mouvement de caisse maintenant.
            </p>
          </div>
        )}

        <button
          onClick={addLine}
          className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          + Ajouter un mode de paiement (paiement mixte)
        </button>

        <p className="mt-4 text-sm text-slate-600">
          Reste à percevoir :{' '}
          <span
            className={remaining > 0 ? 'font-medium text-danger' : 'font-medium text-primary-600'}
          >
            {remaining.toLocaleString('fr-FR')} FCFA
          </span>
        </p>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || hasCreditLineWithoutCustomer} aria-busy={isSubmitting}
            className="btn btn-primary flex-1"
          >
            {isSubmitting ? 'Encaissement...' : 'Valider le paiement'}
          </button>
        </div>
      </div>
    </div>
  );
}
