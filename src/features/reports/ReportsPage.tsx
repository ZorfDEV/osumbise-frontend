import { useEffect, useState } from 'react';
import { Banknote, Percent, PackageOpen, Receipt, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { fetchReport, downloadReport, ReportData } from './api';
import KpiCard from '@/features/dashboard/KpiCard';
import { ListSkeleton } from '@/components/ui/skeleton';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Crédit',
};

const formatFcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

// Dates en heure locale (toISOString() est en UTC et peut renvoyer la veille
// ou le lendemain en début/fin de journée)
const pad = (x: number) => String(x).padStart(2, '0');
const toIsoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const todayIso = () => toIsoDay(new Date());
const thisMonthIso = () => todayIso().slice(0, 7);
const thisYear = () => String(new Date().getFullYear());

type Period = 'day' | 'month' | 'year' | 'range';
interface PeriodValues {
  date: string;
  month: string;
  year: string;
  startDate: string;
  endDate: string;
}

// Paramètres d'API de la période décalée de n crans en arrière (n = 0 : la
// période affichée). Une plage libre est décalée de sa propre durée.
const shiftedParams = (period: Period, v: PeriodValues, n: number): Record<string, string> => {
  if (period === 'day') {
    const d = parseDay(v.date);
    d.setDate(d.getDate() - n);
    return { date: toIsoDay(d) };
  }
  if (period === 'month') {
    const [y, m] = v.month.split('-').map(Number);
    const d = new Date(y, m - 1 - n, 1);
    return { period: 'month', date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}` };
  }
  if (period === 'year') return { period: 'year', date: String(Number(v.year) - n) };
  const start = parseDay(v.startDate);
  const end = parseDay(v.endDate);
  const length = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  start.setDate(start.getDate() - length * n);
  end.setDate(end.getDate() - length * n);
  return { startDate: toIsoDay(start), endDate: toIsoDay(end) };
};

// Période de comparaison et profondeur de la mini-courbe, par type de période
const COMPARISON: Record<Period, { previous: string; historyLabel?: string; count: number }> = {
  day: { previous: 'la veille', historyLabel: '7 derniers jours', count: 7 },
  month: { previous: 'le mois précédent', historyLabel: '6 derniers mois', count: 6 },
  year: { previous: 'l’année précédente', historyLabel: '5 dernières années', count: 5 },
  range: { previous: 'la période précédente', count: 2 },
};

type Metric = 'revenue' | 'orderCount' | 'profit' | 'averageBasket' | 'merchandiseCost' | 'margin' | 'clientCount';

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [date, setDate] = useState(todayIso());
  const [month, setMonth] = useState(thisMonthIso());
  const [year, setYear] = useState(thisYear());
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Périodes précédentes (index 0 = période juste avant). null = non chargée.
  const [past, setPast] = useState<(ReportData | null)[]>([]);

  const values: PeriodValues = { date, month, year, startDate, endDate };
  const buildParams = () => shiftedParams(period, values, 0);

  useEffect(() => {
    // Ignore les réponses d'une période qu'on a quittée entre-temps
    let cancelled = false;
    setIsLoading(true);
    setPast([]);
    fetchReport(buildParams())
      .then((r) => !cancelled && setReport(r))
      .finally(() => !cancelled && setIsLoading(false));

    // Comparaison et mini-courbes : chargées à côté, sans bloquer l'affichage
    const { count } = COMPARISON[period];
    Promise.allSettled(
      Array.from({ length: count - 1 }, (_, i) => fetchReport(shiftedParams(period, values, i + 1)))
    ).then((results) => {
      if (!cancelled) setPast(results.map((r) => (r.status === 'fulfilled' ? r.value : null)));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, date, month, year, startDate, endDate]);

  const comparison = COMPARISON[period];
  const previous = past[0] ?? undefined;
  // La période affichée inclut aujourd'hui : elle n'est pas terminée
  const isOngoing =
    (period === 'day' && date === todayIso()) ||
    (period === 'month' && month === thisMonthIso()) ||
    (period === 'year' && year === thisYear()) ||
    (period === 'range' && endDate >= todayIso());

  const kpi = (metric: Metric) => {
    if (!report) return {};
    const history =
      comparison.historyLabel && past.length
        ? [...past].reverse().map((p) => Number(p?.[metric] ?? 0)).concat(Number(report[metric]))
        : undefined;
    return {
      current: Number(report[metric]),
      previous: previous ? Number(previous[metric]) : undefined,
      previousLabel: comparison.previous,
      history,
      historyLabel: comparison.historyLabel,
    };
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-heading">Rapports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-slate-300 p-1">
            <button
              onClick={() => setPeriod('day')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'day' ? 'bg-action text-white' : 'text-slate-600'
              }`}
            >
              Journalier
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'month' ? 'bg-action text-white' : 'text-slate-600'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'year' ? 'bg-action text-white' : 'text-slate-600'
              }`}
            >
              Annuel
            </button>
            <button
              onClick={() => setPeriod('range')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'range' ? 'bg-action text-white' : 'text-slate-600'
              }`}
            >
              Plage
            </button>
          </div>
          {period === 'day' && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input input-sm"
            />
          )}
          {period === 'month' && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input input-sm"
            />
          )}
          {period === 'year' && (
            <input
              type="number"
              min="2020"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input input-sm w-24"
            />
          )}
          {period === 'range' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input input-sm"
              />
              <span className="text-sm text-slate-500">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input input-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => downloadReport('csv', buildParams())}
          className="btn btn-secondary px-3"
        >
          Télécharger CSV
        </button>
        <button
          onClick={() => downloadReport('pdf', buildParams())}
          className="btn btn-secondary px-3"
        >
          Télécharger PDF
        </button>
      </div>

      {isLoading || !report ? (
        <ListSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard label="Chiffre d’affaires" value={formatFcfa(report.revenue)} icon={Banknote} {...kpi('revenue')} />
            <KpiCard label="Commandes" value={String(report.orderCount)} icon={ShoppingCart} {...kpi('orderCount')} />
            <KpiCard label="Bénéfice" value={formatFcfa(report.profit)} icon={TrendingUp} {...kpi('profit')} />
            <KpiCard label="Panier moyen" value={formatFcfa(report.averageBasket)} icon={Receipt} {...kpi('averageBasket')} />
            <KpiCard
              label="Coût des marchandises"
              value={formatFcfa(report.merchandiseCost)}
              icon={PackageOpen}
              higherIsBetter={false}
              {...kpi('merchandiseCost')}
            />
            <KpiCard
              label="Marge"
              value={`${Number(report.margin).toFixed(1)} %`}
              icon={Percent}
              trendMode="points"
              {...kpi('margin')}
            />
            <KpiCard label="Clients (estimation)" value={String(report.clientCount)} icon={Users} {...kpi('clientCount')} />
          </div>
          {previous && isOngoing && (
            <p className="-mt-3 text-xs text-slate-500">
              La période affichée n’est pas encore terminée : la comparaison avec {comparison.previous}, elle
              complète, est donc provisoire.
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-surface p-4">
              <h2 className="mb-3 text-sm font-semibold text-heading-muted">Modes de paiement</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(report.paymentBreakdown).map(([method, amount]) => (
                  <li key={method} className="flex justify-between text-slate-600">
                    <span>{PAYMENT_LABELS[method] ?? method}</span>
                    <span className="font-medium text-slate-900">{formatFcfa(amount)}</span>
                  </li>
                ))}
                {Object.keys(report.paymentBreakdown).length === 0 && (
                  <li className="text-slate-500">Aucun paiement</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-surface p-4">
              <h2 className="mb-3 text-sm font-semibold text-heading-muted">
                Catégories les plus rentables
              </h2>
              <ul className="space-y-2 text-sm">
                {report.topCategories.slice(0, 8).map((c) => (
                  <li key={c.categoryId} className="flex justify-between text-slate-600">
                    <span>{c.name}</span>
                    <span className="font-medium text-slate-900">{formatFcfa(c.profit)}</span>
                  </li>
                ))}
                {report.topCategories.length === 0 && (
                  <li className="text-slate-500">Aucune donnée</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-heading-muted">Produits les plus vendus</h2>
            <div className="overflow-x-auto">
              <table className="table-cards w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Produit</th>
                    <th className="pb-2 font-medium">Quantité vendue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td data-label="Produit" className="py-2 text-slate-900">{p.name}</td>
                      <td data-label="Quantité vendue" className="py-2 text-slate-600">{p.quantity}</td>
                    </tr>
                  ))}
                  {report.topProducts.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-2 text-slate-500">
                        Aucune vente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
