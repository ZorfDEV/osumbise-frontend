import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCashSession, closeCashSession, createCashMovement } from './api';
import { CashSession, CashMovementType } from './types';
import { useConfirm } from '@/lib/confirm';
import { useToast } from '@/lib/toast';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';

const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  SALE_CASH: 'Vente espèces',
  SALE_CARD: 'Vente carte',
  SALE_MOBILE_MONEY: 'Vente Mobile Money',
  EXPENSE: 'Dépense',
  REFUND: 'Remboursement',
  ADJUSTMENT: 'Ajustement',
};

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

export default function CashSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const confirm = useConfirm();
  const toast = useToast();
  const [session, setSession] = useState<CashSession | null>(null);
  const [movementType, setMovementType] = useState<'EXPENSE' | 'REFUND' | 'ADJUSTMENT'>(
    'EXPENSE'
  );
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [actualBalance, setActualBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!sessionId) return;
    fetchCashSession(sessionId).then(setSession);
  }, [sessionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!session) {
    return <PageSkeleton />;
  }

  const isOpen = !session.closedAt;

  const handleAddMovement = async () => {
    if (!sessionId || amount <= 0) return;
    setError(null);
    try {
      await createCashMovement(sessionId, {
        type: movementType,
        amount,
        note: note || undefined,
      });
      setAmount(0);
      setNote('');
      toast.success('Mouvement enregistré');
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur';
      setError(message);
      toast.error(message);
    }
  };

  const handleClose = async () => {
    if (!sessionId) return;
    const ok = await confirm({
      title: 'Fermer la caisse',
      message: 'Confirmer la fermeture de la caisse ?',
      confirmLabel: 'Fermer',
    });
    if (!ok) return;
    await closeCashSession(sessionId, actualBalance);
    toast.success('Caisse fermée');
    reload();
  };

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: 'Sessions de caisse', to: '/cash' }, { label: session.cashRegister?.name ?? 'Session de caisse' }]} />

      <h1 className="mb-1 text-2xl font-semibold text-heading">
        {session.cashRegister?.name ?? 'Session de caisse'}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Ouverte le {new Date(session.openedAt).toLocaleString('fr-FR')} — solde initial{' '}
        {formatFcfa(Number(session.openingBalance))}
      </p>

      {!isOpen && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4 text-sm">
          <p className="mb-1">
            <span className="text-slate-500">Solde théorique :</span>{' '}
            <span className="font-medium">{formatFcfa(Number(session.theoreticalBalance))}</span>
          </p>
          <p className="mb-1">
            <span className="text-slate-500">Solde réel :</span>{' '}
            <span className="font-medium">{formatFcfa(Number(session.actualBalance))}</span>
          </p>
          <p>
            <span className="text-slate-500">Écart :</span>{' '}
            <span
              className={`font-medium ${
                Number(session.discrepancy) === 0 ? 'text-primary-700' : 'text-danger-dark'
              }`}
            >
              {formatFcfa(Number(session.discrepancy))}
            </span>
          </p>
        </div>
      )}

      <div className="mb-6 overflow-x-auto rounded-lg border border-slate-200 bg-surface">
        <table className="table-cards w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Heure</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Montant</th>
              <th className="px-4 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {session.movements.map((m) => (
              <tr key={m.id}>
                <td data-label="Heure" className="px-4 py-2 text-slate-600">
                  {new Date(m.createdAt).toLocaleTimeString('fr-FR')}
                </td>
                <td data-label="Type" className="px-4 py-2 text-slate-900">{MOVEMENT_LABELS[m.type]}</td>
                <td data-label="Montant"
                  className={`px-4 py-2 font-medium ${
                    Number(m.amount) < 0 ? 'text-danger' : 'text-primary-700'
                  }`}
                >
                  {formatFcfa(Number(m.amount))}
                </td>
                <td data-label="Note" className="px-4 py-2 text-slate-500">{m.note ?? '—'}</td>
              </tr>
            ))}
            {session.movements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Aucun mouvement
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <>
          <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-heading-muted">
              Ajouter un mouvement manuel
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as typeof movementType)}
                className="input px-2"
              >
                <option value="EXPENSE">Dépense</option>
                <option value="REFUND">Remboursement</option>
                <option value="ADJUSTMENT">Ajustement</option>
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Montant"
                className="input w-28 px-2"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optionnel)"
                className="input flex-1 px-2"
              />
              <button
                onClick={handleAddMovement}
                className="btn btn-primary px-3"
              >
                Ajouter
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          </div>

          <div className="rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-heading-muted">Fermer la caisse</h2>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={actualBalance}
                onChange={(e) => setActualBalance(Number(e.target.value))}
                placeholder="Solde compté"
                className="input w-32"
              />
              <button
                onClick={handleClose}
                className="btn btn-danger"
              >
                Clôturer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
