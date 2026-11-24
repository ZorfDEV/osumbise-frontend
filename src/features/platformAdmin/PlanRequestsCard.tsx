import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/confirm';
import { fetchPlanRequests, reviewPlanRequest } from './api';
import type { PlanRequest } from './types';

const formatFcfa = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

// Formules plus chères demandées en cours de période payée : à valider une fois
// le complément reçu. La date de fin de période ne change pas.
export default function PlanRequestsCard({ onReviewed }: { onReviewed: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [requests, setRequests] = useState<PlanRequest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    fetchPlanRequests()
      .then((list) => {
        setRequests(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));

  useEffect(() => {
    load();
  }, []);

  const review = async (r: PlanRequest, approve: boolean) => {
    const ok = await confirm({
      title: approve ? 'Valider le changement de formule' : 'Refuser le changement de formule',
      message: approve
        ? `${r.organization.name} passera tout de suite de ${r.plan.name} à ${r.requestedPlan.name}, jusqu’au ${day(r.currentPeriodEnd)}. Avez-vous bien reçu le complément éventuel ?`
        : `Refuser la formule ${r.requestedPlan.name} à ${r.organization.name} ? Son abonnement ${r.plan.name} ne change pas.`,
      confirmLabel: approve ? 'Valider' : 'Refuser',
      danger: !approve,
    });
    if (!ok) return;
    setBusyId(r.id);
    try {
      await reviewPlanRequest(r.id, approve, r.requestedPlan.id);
      toast.success(approve ? 'Formule changée' : 'Demande refusée');
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
      <h2 className="mb-3 text-sm font-semibold text-heading-muted">
        Changements de formule demandés{requests ? ` (${requests.length})` : ''}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
        <table className="table-cards w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Demandé le</th>
              <th className="px-4 py-2 font-medium">Organisation</th>
              <th className="px-4 py-2 font-medium">Formule actuelle</th>
              <th className="px-4 py-2 font-medium">Formule demandée</th>
              <th className="px-4 py-2 font-medium">Fin de période</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(requests ?? []).map((r) => (
              <tr key={r.id}>
                <td data-label="Demandé le" className="px-4 py-2 text-slate-600">{r.requestedPlanAt ? day(r.requestedPlanAt) : '—'}</td>
                <td data-label="Organisation" className="px-4 py-2">
                  <Link to={`/platform-admin/organizations/${r.organization.id}`} className="font-medium text-primary-600 hover:underline">
                    {r.organization.name}
                  </Link>
                </td>
                <td data-label="Formule actuelle" className="px-4 py-2 text-slate-600">
                  {r.plan.name} — {formatFcfa(Number(r.plan.price))}
                </td>
                <td data-label="Formule demandée" className="px-4 py-2 font-medium text-slate-900">
                  {r.requestedPlan.name} — {formatFcfa(Number(r.requestedPlan.price))}
                </td>
                <td data-label="Fin de période" className="px-4 py-2 text-slate-600">{day(r.currentPeriodEnd)}</td>
                <td data-label="" className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => review(r, true)} disabled={busyId !== null} className="btn btn-primary btn-sm">
                      <Check size={14} />
                      Valider
                    </button>
                    <button onClick={() => review(r, false)} disabled={busyId !== null} className="btn btn-danger btn-sm">
                      <X size={14} />
                      Refuser
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(requests === null || requests.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {failed ? 'Chargement impossible' : requests === null ? 'Chargement…' : 'Aucune demande'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
