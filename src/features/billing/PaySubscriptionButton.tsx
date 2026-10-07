import { useState, useEffect, useRef } from 'react';
import { Smartphone } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { initiateSubscriptionPayment, fetchPaymentStatus } from './api';
import { SubscriptionPayment } from './types';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000; // 2 minutes — au-delà, on suppose que ça traîne

interface Props {
  amountLabel: string; // ex. "35 000 FCFA"
  onSuccess: () => void;
}

export default function PaySubscriptionButton({ amountLabel, onSuccess }: Props) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState<SubscriptionPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => stopPolling, []);

  const pollStatus = (paymentId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const p = await fetchPaymentStatus(paymentId);
        setPayment(p);
        if (p.status === 'SUCCESS') {
          stopPolling();
          toast.success('Paiement confirmé — abonnement activé');
          setIsSubmitting(false);
          setIsOpen(false);
          onSuccess();
        } else if (p.status === 'FAILED') {
          stopPolling();
          setError('Le paiement a échoué ou a été annulé sur ton téléphone.');
          setIsSubmitting(false);
        }
      } catch {
        // erreur réseau ponctuelle pendant le sondage — on retente au prochain tick
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setIsSubmitting(false);
      setError('Toujours en attente après 2 minutes. Vérifie sur ton téléphone, ou réessaie.');
    }, POLL_TIMEOUT_MS);
  };

  const handleInitiate = async () => {
    if (phone.trim().length < 8) {
      setError('Numéro invalide');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const p = await initiateSubscriptionPayment(phone.trim());
      setPayment(p);
      pollStatus(p.id);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Impossible de lancer le paiement';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    stopPolling();
    setIsOpen(false);
    setPhone('');
    setPayment(null);
    setError(null);
    setIsSubmitting(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-primary btn-sm"
      >
        Payer maintenant
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {!isSubmitting ? (
        <>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Numéro Airtel Money
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="074 XX XX XX"
              className="input flex-1"
            />
            <button
              onClick={handleInitiate}
              className="btn btn-primary"
            >
              Payer {amountLabel}
            </button>
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-600">
              Annuler
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Smartphone size={20} className="shrink-0 animate-pulse text-primary-600" />
          <div>
            <p className="text-sm font-medium text-slate-900">Vérifie ton téléphone</p>
            <p className="text-xs text-slate-500">
              Valide le paiement avec ton code PIN Airtel Money — confirmation automatique dès
              validation.
            </p>
          </div>
          <button
            onClick={reset}
            className="ml-auto shrink-0 text-xs text-slate-500 hover:text-slate-600"
          >
            Annuler
          </button>
        </div>
      )}
      {!isSubmitting && payment?.status === 'FAILED' && error && (
        <p className="mt-2 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
