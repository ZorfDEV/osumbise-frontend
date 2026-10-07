import { useEffect, useState } from 'react';
import { Banknote, Receipt, ShoppingCart, TrendingUp } from 'lucide-react';
import { fetchDashboardSummary, fetchHourlySales, fetchStaffPerformance } from './api';
import { DashboardSummary, HourlySales, StaffPerformance } from './types';
import KpiCard from './KpiCard';
import HourlySalesChart from './HourlySalesChart';
import DashboardAlerts from './DashboardAlerts';
import { PageSkeleton } from '@/components/ui/skeleton';

// Date locale au format attendu par l'API (YYYY-MM-DD), décalée de n jours
const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type Metric = 'revenue' | 'orderCount' | 'profit' | 'averageBasket';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Crédit',
};

const formatFcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [hourly, setHourly] = useState<HourlySales | null>(null);
  const [staff, setStaff] = useState<StaffPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Résumés des 6 jours précédents (index 0 = hier). null = jour non chargé.
  const [pastDays, setPastDays] = useState<(DashboardSummary | null)[]>([]);

  // Historique pour les tendances et mini-courbes : chargé en parallèle, sans
  // bloquer l'affichage des chiffres du jour ; un jour en échec est ignoré.
  useEffect(() => {
    Promise.allSettled([1, 2, 3, 4, 5, 6].map((n) => fetchDashboardSummary(isoDaysAgo(n)))).then((results) =>
      setPastDays(results.map((r) => (r.status === 'fulfilled' ? r.value : null)))
    );
  }, []);

  useEffect(() => {
    Promise.all([fetchDashboardSummary(), fetchHourlySales(), fetchStaffPerformance()])
      .then(([s, h, st]) => {
        setSummary(s);
        setHourly(h);
        setStaff(st);
      })
      .catch((err) => {
        const message =
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Erreur inconnue';
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!summary) {
    return (
      <p className="text-sm text-danger">
        Impossible de charger le tableau de bord{error ? ` : ${error}` : ''}.
      </p>
    );
  }

  const yesterday = pastDays[0] ?? undefined;
  // 7 points du plus ancien à aujourd'hui ; un jour manquant compte pour 0
  const history = (metric: Metric) =>
    pastDays.length ? [...pastDays].reverse().map((d) => Number(d?.[metric] ?? 0)).concat(Number(summary[metric])) : undefined;
  const kpi = (metric: Metric) => ({
    current: Number(summary[metric]),
    previous: yesterday ? Number(yesterday[metric]) : undefined,
    history: history(metric),
    to: '/reports',
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold text-heading">Tableau de bord</h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <DashboardAlerts />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="CA du jour" value={formatFcfa(summary.revenue)} icon={Banknote} {...kpi('revenue')} />
        <KpiCard label="Commandes" value={String(summary.orderCount)} icon={ShoppingCart} {...kpi('orderCount')} />
        <KpiCard label="Bénéfice" value={formatFcfa(summary.profit)} icon={TrendingUp} {...kpi('profit')} />
        <KpiCard label="Panier moyen" value={formatFcfa(summary.averageBasket)} icon={Receipt} {...kpi('averageBasket')} />
      </div>
      {yesterday && (
        <p className="-mt-3 text-xs text-slate-500">
          Les tendances comparent la journée en cours à la journée complète d’hier.
        </p>
      )}

      {hourly && <HourlySalesChart data={hourly.hourly} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Modes de paiement</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(summary.paymentBreakdown).map(([method, amount]) => (
              <li key={method} className="flex justify-between text-slate-600">
                <span>{PAYMENT_LABELS[method] ?? method}</span>
                <span className="font-medium text-slate-900">{formatFcfa(amount)}</span>
              </li>
            ))}
            {Object.keys(summary.paymentBreakdown).length === 0 && (
              <li className="text-slate-500">Aucun paiement enregistré</li>
            )}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">
            Catégories les plus rentables
          </h2>
          <ul className="space-y-2 text-sm">
            {summary.topCategories.slice(0, 5).map((c) => (
              <li key={c.categoryId} className="flex justify-between text-slate-600">
                <span>{c.name}</span>
                <span className="font-medium text-slate-900">{formatFcfa(c.profit)}</span>
              </li>
            ))}
            {summary.topCategories.length === 0 && (
              <li className="text-slate-500">Aucune donnée</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Produits les plus vendus</h2>
          <ul className="space-y-2 text-sm">
            {summary.topProducts.slice(0, 8).map((p) => (
              <li key={p.productId} className="flex justify-between text-slate-600">
                <span>{p.name}</span>
                <span className="font-medium text-slate-900">{p.quantity}</span>
              </li>
            ))}
            {summary.topProducts.length === 0 && (
              <li className="text-slate-500">Aucune vente aujourd’hui</li>
            )}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Performance des serveurs</h2>
          <div className="overflow-x-auto">
            <table className="table-cards w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Nom</th>
                  <th className="pb-2 font-medium">Commandes</th>
                  <th className="pb-2 font-medium">Ventes</th>
                  <th className="pb-2 font-medium">Annulées</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff?.staff.map((s) => (
                  <tr key={s.userId}>
                    <td data-label="Nom" className="py-2 text-slate-900">{s.name}</td>
                    <td data-label="Commandes" className="py-2 text-slate-600">{s.ordersCreated}</td>
                    <td data-label="Ventes" className="py-2 text-slate-600">{formatFcfa(s.revenue)}</td>
                    <td data-label="Annulées" className="py-2 text-slate-600">{s.cancelled}</td>
                  </tr>
                ))}
                {(!staff || staff.staff.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-2 text-slate-500">
                      Aucune donnée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
