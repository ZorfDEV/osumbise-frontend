import { useEffect, useState } from 'react';
import { fetchReport, downloadReport, ReportData } from './api';
import KpiCard from '@/features/dashboard/KpiCard';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Crédit',
};

const formatFcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

const todayIso = () => new Date().toISOString().slice(0, 10);
const thisMonthIso = () => new Date().toISOString().slice(0, 7);
const thisYear = () => String(new Date().getFullYear());

export default function ReportsPage() {
  const [period, setPeriod] = useState<'day' | 'month' | 'year' | 'range'>('day');
  const [date, setDate] = useState(todayIso());
  const [month, setMonth] = useState(thisMonthIso());
  const [year, setYear] = useState(thisYear());
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const buildParams = (): Record<string, string> => {
    if (period === 'day') return { date };
    if (period === 'month') return { period: 'month', date: month };
    if (period === 'year') return { period: 'year', date: year };
    return { startDate, endDate };
  };

  useEffect(() => {
    setIsLoading(true);
    fetchReport(buildParams())
      .then(setReport)
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, date, month, year, startDate, endDate]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Rapports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-slate-300 p-1">
            <button
              onClick={() => setPeriod('day')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'day' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Journalier
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'month' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'year' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Annuel
            </button>
            <button
              onClick={() => setPeriod('range')}
              className={`rounded px-3 py-1 text-xs font-medium ${
                period === 'range' ? 'bg-slate-900 text-white' : 'text-slate-600'
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
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
          {period === 'month' && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
          {period === 'year' && (
            <input
              type="number"
              min="2020"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
          {period === 'range' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <span className="text-sm text-slate-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => downloadReport('csv', buildParams())}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Télécharger CSV
        </button>
        <button
          onClick={() => downloadReport('pdf', buildParams())}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Télécharger PDF
        </button>
      </div>

      {isLoading || !report ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard label="Chiffre d’affaires" value={formatFcfa(report.revenue)} />
            <KpiCard label="Commandes" value={String(report.orderCount)} />
            <KpiCard label="Bénéfice" value={formatFcfa(report.profit)} />
            <KpiCard label="Panier moyen" value={formatFcfa(report.averageBasket)} />
            <KpiCard label="Coût des marchandises" value={formatFcfa(report.merchandiseCost)} />
            <KpiCard label="Marge" value={`${report.margin.toFixed(1)} %`} />
            <KpiCard label="Clients (estimation)" value={String(report.clientCount)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Modes de paiement</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(report.paymentBreakdown).map(([method, amount]) => (
                  <li key={method} className="flex justify-between text-slate-600">
                    <span>{PAYMENT_LABELS[method] ?? method}</span>
                    <span className="font-medium text-slate-900">{formatFcfa(amount)}</span>
                  </li>
                ))}
                {Object.keys(report.paymentBreakdown).length === 0 && (
                  <li className="text-slate-400">Aucun paiement</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
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
                  <li className="text-slate-400">Aucune donnée</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Produits les plus vendus</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Produit</th>
                    <th className="pb-2 font-medium">Quantité vendue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td className="py-2 text-slate-900">{p.name}</td>
                      <td className="py-2 text-slate-600">{p.quantity}</td>
                    </tr>
                  ))}
                  {report.topProducts.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-2 text-slate-400">
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
