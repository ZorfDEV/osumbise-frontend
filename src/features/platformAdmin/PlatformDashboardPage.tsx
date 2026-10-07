import { useEffect, useState } from 'react';
import { fetchRevenueSummary } from './api';
import { RevenueSummary } from './types';
import { PageSkeleton } from '@/components/ui/skeleton';

const formatFcfa = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAST_DUE: 'Paiement en retard',
  CANCELLED: 'Annulé',
};

export default function PlatformDashboardPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);

  useEffect(() => {
    fetchRevenueSummary().then(setSummary);
  }, []);

  if (!summary) return <PageSkeleton />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-heading">Vue d’ensemble</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">MRR</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatFcfa(summary.mrr)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Revenu récurrent mensuel actif</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total encaissé
          </p>
          <p className="mt-1 text-2xl font-bold text-primary-600">
            {formatFcfa(summary.totalCollected)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Cumul de tous les paiements réussis</p>
        </div>
        {summary.statusCounts.map((s) => (
          <div key={s.status} className="rounded-lg border border-slate-200 bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {STATUS_LABELS[s.status] ?? s.status}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.count}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-heading-muted">Répartition par formule</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
        <table className="table-cards w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Formule</th>
              <th className="px-4 py-2 font-medium">Abonnés actifs</th>
              <th className="px-4 py-2 font-medium">Revenu mensuel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.byPlan.map((p) => (
              <tr key={p.planName}>
                <td data-label="Formule" className="px-4 py-2 text-slate-900">{p.planName}</td>
                <td data-label="Abonnés actifs" className="px-4 py-2 text-slate-600">{p.count}</td>
                <td data-label="Revenu mensuel" className="px-4 py-2 text-slate-600">{formatFcfa(p.monthlyRevenue)}</td>
              </tr>
            ))}
            {summary.byPlan.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Aucun abonnement actif
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
