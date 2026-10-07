import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, type LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  icon?: LucideIcon;
  // Valeur de la période affichée et de la période précédente (tendance)
  current?: number;
  previous?: number;
  // Libellé de la période de comparaison : "hier", "le mois précédent"…
  previousLabel?: string;
  // Évolution en % (montants, volumes) ou en points (valeurs déjà en %)
  trendMode?: 'percent' | 'points';
  // false pour un coût : une hausse s'affiche alors en rouge
  higherIsBetter?: boolean;
  // Valeurs des périodes passées, de la plus ancienne à la période affichée
  history?: number[];
  historyLabel?: string;
  // Page de détail ouverte au clic
  to?: string;
}

type Trend = { kind: 'delta'; value: number } | { kind: 'new' } | { kind: 'flat' } | null;

const computeTrend = (mode: 'percent' | 'points', current?: number, previous?: number): Trend => {
  if (current === undefined || previous === undefined) return null;
  if (mode === 'points') return { kind: 'delta', value: current - previous };
  if (previous === 0) return current === 0 ? { kind: 'flat' } : { kind: 'new' };
  return { kind: 'delta', value: ((current - previous) / Math.abs(previous)) * 100 };
};

function Sparkline({ values }: { values: number[] }) {
  const W = 120;
  const H = 32;
  const PAD = 3;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => [
    PAD + (i * (W - PAD * 2)) / Math.max(values.length - 1, 1),
    H - PAD - ((v - min) / range) * (H - PAD * 2),
  ]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${H} L${points[0][0].toFixed(1)} ${H} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <path d={area} className="fill-primary-50" />
      <path d={line} fill="none" className="stroke-primary-600" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r={2.5} className="fill-primary-600" />
    </svg>
  );
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  current,
  previous,
  previousLabel = 'hier',
  trendMode = 'percent',
  higherIsBetter = true,
  history,
  historyLabel = '7 derniers jours',
  to,
}: Props) {
  const trend = computeTrend(trendMode, current, previous);
  const hasHistory = !!history && history.length > 1 && history.some((v) => v !== 0);

  const renderTrend = () => {
    if (!trend) return null;
    if (trend.kind === 'new') return <span className="text-slate-500">Aucune activité {previousLabel}</span>;
    if (trend.kind === 'flat') return <span className="text-slate-500">Aucune activité sur les deux périodes</span>;

    const v = trend.value;
    const rounded = Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: trendMode === 'points' ? 1 : 0 });
    const isStable = rounded === '0';
    const isGood = higherIsBetter ? v > 0 : v < 0;
    const color = isStable ? 'text-slate-500' : isGood ? 'text-success' : 'text-danger';
    const Arrow = isStable ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
    return (
      <>
        <span className={`inline-flex items-center gap-0.5 ${color}`}>
          <Arrow size={14} />
          {isStable ? 'Stable' : `${v > 0 ? '+' : '−'}${rounded}${trendMode === 'points' ? ' pt' : ' %'}`}
        </span>
        <span className="text-slate-500">vs {previousLabel}</span>
      </>
    );
  };

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            <Icon size={16} strokeWidth={1.9} />
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-semibold text-heading">{value}</p>

      {current !== undefined && (
        <div className="mt-1 flex min-h-[1.25rem] flex-wrap items-center gap-1 text-xs font-medium">{renderTrend()}</div>
      )}

      {hasHistory && (
        <div className="mt-2">
          <Sparkline values={history!} />
          <p className="mt-0.5 text-[0.7rem] text-slate-500">{historyLabel}</p>
        </div>
      )}
    </>
  );

  const card = 'group rounded-lg border border-slate-200 bg-surface p-4';
  if (!to) return <div className={card}>{body}</div>;

  return (
    <Link
      to={to}
      className={`${card} relative block transition-colors hover:border-primary-300 hover:shadow-sm`}
      aria-label={`${label} : ${value}. Voir le détail`}
    >
      {body}
      <ChevronRight
        size={16}
        className="absolute bottom-4 right-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}
