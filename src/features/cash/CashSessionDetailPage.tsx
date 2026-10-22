import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCashSession, closeCashSession, createCashMovement } from './api';
import { CashSession, CashMovementType } from './types';
import { useConfirm } from '@/lib/confirm';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/lib/toast';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { Printer, Plus } from 'lucide-react';
import { PrintPortal, printTicket, usePrintSettings } from '@/lib/print';
import CashReportTicket from './CashReportTicket';
import { HOTEL_METHOD_LABELS, ROOM_CATEGORY_SHORT, hotelRoomsTotal, productTotals, summarizeSession } from './summary';
import { invoiceNo } from '@/features/pos/invoiceNumber';

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
  // Dépense : propriétaire et administrateur uniquement
  const canAddExpense = useAuth().user?.role !== 'CASHIER';
  const [movementType, setMovementType] = useState<'EXPENSE' | 'REFUND' | 'ADJUSTMENT'>(
    canAddExpense ? 'EXPENSE' : 'REFUND'
  );
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [actualBalance, setActualBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { settings } = usePrintSettings();

  const reload = useCallback(() => {
    if (!sessionId) return;
    fetchCashSession(sessionId)
      .then(setSession)
      .catch((err) =>
        setLoadError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Session introuvable')
      );
  }, [sessionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loadError) {
    return <p className="text-sm text-danger">{loadError}</p>;
  }
  if (!session) {
    return <PageSkeleton />;
  }
  const summary = summarizeSession(session);

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
      title: 'Clôturer ma session',
      message: `Solde compté : ${formatFcfa(actualBalance)}. Le rapport de clôture sera imprimé. Confirmer ?`,
      confirmLabel: 'Clôturer',
    });
    if (!ok) return;
    try {
      const closed = await closeCashSession(sessionId, actualBalance);
      toast.success('Caisse clôturée');
      // Rapport de clôture imprimé tout de suite, avec les montants définitifs
      setSession({ ...session, ...closed, movements: session.movements, cashRegister: session.cashRegister, openedBy: session.openedBy });
      setTimeout(() => printTicket(), 300);
      reload();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Clôture impossible');
    }
  };

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: 'Sessions de caisse', to: '/cash' }, { label: session.cashRegister?.name ?? 'Session de caisse' }]} />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-heading">
            {session.cashRegister?.name ?? 'Session de caisse'}
          </h1>
          <p className="text-sm text-slate-500">
            {session.openedBy ? `${session.openedBy.name} · ` : ''}ouverte le {new Date(session.openedAt).toLocaleString('fr-FR')}
            {session.plannedCloseAt ? ` · fin prévue à ${new Date(session.plannedCloseAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''} — fond de caisse{' '}
            {formatFcfa(Number(session.openingBalance))}
          </p>
          {session.closedAt && (
            <p className="text-sm text-slate-500">
              Clôturée le {new Date(session.closedAt).toLocaleString('fr-FR')}
              {session.closedBy ? ` par ${session.closedBy.name}` : ''}
            </p>
          )}
        </div>
        <button onClick={() => printTicket()} className="btn btn-secondary">
          <Printer size={16} />
          {isOpen ? 'Imprimer un rapport provisoire' : 'Imprimer le rapport de clôture'}
        </button>
      </div>

      {/* Synthèse du service */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Ventes', value: `${summary.salesCount}` },
          { label: 'Total des ventes', value: formatFcfa(summary.totalSales), strong: true },
          { label: 'Espèces', value: formatFcfa(summary.cashSales) },
          { label: 'Mobile Money', value: formatFcfa(summary.mobileSales) },
          { label: 'Carte', value: formatFcfa(summary.cardSales) },
        ].map((k) => (
          <div key={k.label} className={`rounded-lg border p-3 ${'strong' in k && k.strong ? 'border-action bg-primary-50' : 'border-slate-200 bg-surface'}`}>
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-lg font-semibold text-heading">{k.value}</p>
          </div>
        ))}
      </div>
      {isOpen && (
        <p className="mb-6 text-sm text-slate-600">
          Solde théorique du tiroir en ce moment : <span className="font-semibold text-heading">{formatFcfa(summary.theoretical)}</span>
        </p>
      )}

      {(session.orders ?? []).length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-surface p-4 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-heading-muted">Factures de la session ({(session.orders ?? []).length})</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {(session.orders ?? []).map((o) => (
                <li key={o.id} className={`py-2 ${o.status === 'ANNULEE' ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between gap-3 font-medium text-heading">
                    <span>
                      N° {invoiceNo(o)} · {o.table ? `Table ${o.table.label}` : 'Comptoir'}
                      {o.customer ? ` · ${o.customer.name}` : ''}
                      {o.status === 'ANNULEE' ? ' · annulée' : ''}
                    </span>
                    <span>{formatFcfa(Number(o.total))}</span>
                  </div>
                  <p className="text-xs text-slate-500">{o.items.map((i) => `${i.quantity} × ${i.product.name}`).join(', ')}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-heading-muted">Produits vendus</h2>
            <ul className="space-y-1.5 text-sm">
              {productTotals(session.orders).map((p) => (
                <li key={p.name} className="flex justify-between text-slate-600">
                  <span>{p.name}</span>
                  <span className="font-semibold text-heading">{p.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {session.hotel && session.hotel.rooms.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Chambres vendues (nuitées)</h2>
          <ul className="space-y-1.5 text-sm">
            {session.hotel.rooms.map((r) => (
              <li key={`${r.category}-${r.nightlyRate}`} className="flex justify-between text-slate-600">
                <span>
                  {ROOM_CATEGORY_SHORT[r.category] ?? r.category} : {r.nights} × {formatFcfa(r.nightlyRate)}
                </span>
                <span className="font-semibold text-heading">{formatFcfa(r.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-heading">
              <span>Total</span>
              <span>{formatFcfa(hotelRoomsTotal(session.hotel))}</span>
            </li>
          </ul>
          {session.hotel.payments.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              {session.hotel.payments.map((p) => (
                <li key={p.method} className="flex justify-between text-slate-600">
                  <span>{HOTEL_METHOD_LABELS[p.method] ?? p.method}</span>
                  <span className="font-semibold text-heading">{formatFcfa(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <PrintPortal>
        <CashReportTicket session={session} paperWidth={settings.paperWidth} />
      </PrintPortal>

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
                {canAddExpense && <option value="EXPENSE">Dépense</option>}
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
                <Plus size={16} />
                Ajouter
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          </div>

          <div className="rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-1 text-sm font-semibold text-heading-muted">Clôturer la session</h2>
            <p className="mb-3 text-xs text-slate-500">Comptez les espèces du tiroir et saisissez le total. Le rapport de clôture s’imprime ensuite.</p>
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
