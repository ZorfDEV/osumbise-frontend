import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/confirm';
import { fetchPendingPayments, reviewPayment } from './api';
import type { PendingPayment } from './types';

const formatFcfa = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

// Paiements d'abonnement en attente : la notification Airtel n'active rien,
// chaque paiement est vérifié sur le compte marchand puis validé ici
export default function PendingPaymentsCard({ onReviewed }: { onReviewed: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [payments, setPayments] = useState<PendingPayment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    fetchPendingPayments()
      .then((list) => {
        setPayments(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));

  useEffect(() => {
    load();
  }, []);

  const review = async (p: PendingPayment, approve: boolean) => {
    const amount = formatFcfa(Number(p.amount));
    const name = p.subscription.organization.name;
    const ok = await confirm({
      title: approve ? 'Valider le paiement' : 'Rejeter le paiement',
      message: approve
        ? `Avez-vous bien vérifié sur le compte Airtel que ${amount} ont été reçus du ${p.phone} ? L’abonnement de ${name} (${p.subscription.plan.name}) sera activé pour un mois.`
        : `Rejeter le paiement de ${amount} de ${name} ? Son abonnement ne change pas.`,
      confirmLabel: approve ? 'Valider' : 'Rejeter',
      danger: !approve,
    });
    if (!ok) return;
    setBusyId(p.id);
    try {
      await reviewPayment(p.id, approve);
      toast.success(approve ? 'Paiement validé, abonnement activé' : 'Paiement rejeté');
      onReviewed();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Action impossible');
    } finally {
      setBusyId(null);
      load();
    }
  };

  return (
    <div className="mb-8">
      <h2 className="mb-1 text-sm font-semibold text-heading-muted">
        Paiements en attente{payments ? ` (${payments.length})` : ''}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Vérifiez d’abord sur le compte marchand Airtel que l’argent est bien arrivé : une notification seule ne le prouve pas.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
        <table className="table-cards w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Organisation</th>
              <th className="px-4 py-2 font-medium">Numéro</th>
              <th className="px-4 py-2 font-medium">Montant</th>
              <th className="px-4 py-2 font-medium">Formule actuelle</th>
              <th className="px-4 py-2 font-medium">Référence</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(payments ?? []).map((p) => {
              const planPrice = Number(p.subscription.plan.price);
              return (
                <tr key={p.id}>
                  <td data-label="Date" className="px-4 py-2 text-slate-600">
                    {new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td data-label="Organisation" className="px-4 py-2">
                    <Link to={`/platform-admin/organizations/${p.subscription.organization.id}`} className="font-medium text-primary-600 hover:underline">
                      {p.subscription.organization.name}
                    </Link>
                  </td>
                  <td data-label="Numéro" className="px-4 py-2 text-slate-600">{p.phone}</td>
                  <td data-label="Montant" className="px-4 py-2 font-medium text-slate-900">{formatFcfa(Number(p.amount))}</td>
                  <td data-label="Formule actuelle" className="px-4 py-2 text-slate-600">
                    {p.subscription.plan.name}
                    {planPrice !== Number(p.amount) && (
                      <span className="block text-xs text-danger">Prix différent : {formatFcfa(planPrice)}</span>
                    )}
                  </td>
                  <td data-label="Référence" className="break-all px-4 py-2 text-xs text-slate-500">{p.externalRef ?? '—'}</td>
                  <td data-label="" className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => review(p, true)} disabled={busyId !== null} className="btn btn-primary btn-sm">
                        <Check size={14} />
                        Valider
                      </button>
                      <button onClick={() => review(p, false)} disabled={busyId !== null} className="btn btn-danger btn-sm">
                        <X size={14} />
                        Rejeter
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(payments === null || payments.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  {failed ? 'Chargement impossible' : payments === null ? 'Chargement…' : 'Aucun paiement en attente'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
