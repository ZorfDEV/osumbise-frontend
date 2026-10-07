import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchOrganization, updateSubscriptionAdmin, updateOwnerStatus } from './api';
import { fetchPlans } from '@/features/billing/api';
import { OrganizationDetail } from './types';
import { Plan, SubscriptionStatus } from '@/features/billing/types';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/lib/confirm';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';

const STATUS_OPTIONS: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED'];
const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAST_DUE: 'Paiement en retard',
  CANCELLED: 'Annulé',
};

const formatFcfa = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [statusValue, setStatusValue] = useState<SubscriptionStatus>('TRIAL');
  const [planValue, setPlanValue] = useState('');
  const [periodEndValue, setPeriodEndValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetchOrganization(id).then((data) => {
      setOrg(data);
      if (data.subscription) {
        setStatusValue(data.subscription.status);
        setPlanValue(data.subscription.plan.id);
        setPeriodEndValue(data.subscription.currentPeriodEnd.slice(0, 10));
      }
    });
  }, [id]);

  useEffect(() => {
    load();
    fetchPlans().then(setPlans);
  }, [load]);

  if (!org) {
    return <PageSkeleton />;
  }

  const owner = org.users.find((u) => u.role === 'OWNER');

  const handleSaveSubscription = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateSubscriptionAdmin(id, {
        status: statusValue,
        planId: planValue || undefined,
        currentPeriodEnd: periodEndValue ? new Date(periodEndValue).toISOString() : undefined,
      });
      toast.success('Abonnement mis à jour');
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOwner = async () => {
    if (!id || !owner) return;
    const ok = await confirm({
      title: owner.isActive ? 'Suspendre le compte' : 'Réactiver le compte',
      message: owner.isActive
        ? `Suspendre l'accès de ${owner.name} ? Il ne pourra plus se connecter.`
        : `Réactiver l'accès de ${owner.name} ?`,
      confirmLabel: owner.isActive ? 'Suspendre' : 'Réactiver',
      danger: owner.isActive,
    });
    if (!ok) return;
    await updateOwnerStatus(id, !owner.isActive);
    toast.success(owner.isActive ? 'Compte suspendu' : 'Compte réactivé');
    load();
  };

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: 'Organisations', to: '/platform-admin/organizations' }, { label: org.name }]} />
      <h1 className="mb-1 text-2xl font-semibold text-heading">{org.name}</h1>
      <p className="mb-6 text-xs text-slate-500">
        Créée le {new Date(org.createdAt).toLocaleDateString('fr-FR')}
      </p>

      {/* Propriétaire */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-heading-muted">Propriétaire</h2>
        {owner ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{owner.name}</p>
              <p className="text-xs text-slate-500">{owner.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  owner.isActive ? 'bg-success-soft text-success-dark' : 'bg-danger-soft text-danger-dark'
                }`}
              >
                {owner.isActive ? 'Actif' : 'Suspendu'}
              </span>
              <button
                onClick={handleToggleOwner}
                className="btn btn-secondary btn-sm"
              >
                {owner.isActive ? 'Suspendre' : 'Réactiver'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun propriétaire trouvé</p>
        )}
      </div>

      {/* Abonnement */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-heading-muted">Abonnement</h2>
        {org.subscription ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Statut</label>
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as SubscriptionStatus)}
                className="input w-full"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Formule</label>
              <select
                value={planValue}
                onChange={(e) => setPlanValue(e.target.value)}
                className="input w-full"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatFcfa(Number(p.price))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Fin de période (réabonnement)
              </label>
              <input
                type="date"
                value={periodEndValue}
                onChange={(e) => setPeriodEndValue(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                onClick={handleSaveSubscription}
                disabled={isSaving} aria-busy={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun abonnement</p>
        )}
      </div>

      {/* Historique des paiements */}
      {org.subscription && org.subscription.payments.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Derniers paiements</h2>
          <table className="table-cards w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium">Numéro</th>
                <th className="py-1 font-medium">Montant</th>
                <th className="py-1 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {org.subscription.payments.map((p) => (
                <tr key={p.id}>
                  <td data-label="Date" className="py-1.5 text-slate-600">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td data-label="Numéro" className="py-1.5 text-slate-600">{p.phone}</td>
                  <td data-label="Montant" className="py-1.5 text-slate-600">{formatFcfa(Number(p.amount))}</td>
                  <td data-label="Statut" className="py-1.5 text-slate-600">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Établissements et utilisateurs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-heading-muted">
            Établissements ({org.establishments.length})
          </h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {org.establishments.map((e) => (
              <li key={e.id}>{e.name}</li>
            ))}
            {org.establishments.length === 0 && <li className="text-slate-500">Aucun</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-heading-muted">
            Utilisateurs ({org.users.length})
          </h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {org.users.map((u) => (
              <li key={u.id}>
                {u.name} — {u.role}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
