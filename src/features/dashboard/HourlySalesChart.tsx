import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// Recharts n'accepte pas de classes Tailwind : on lui passe les variables CSS
// du thème (src/index.css), qui changent en mode sombre. Les barres gardent
// la couleur de marque fixe.
const CHART_COLORS = {
  bar: '#618373', // primary-600
  grid: 'rgb(var(--slate-200))', // même gris que les bordures de cartes
  axis: 'rgb(var(--heading-muted))',
  cursor: 'rgb(var(--primary-50))',
  tooltipBg: 'rgb(var(--surface))',
  tooltipBorder: 'rgb(var(--slate-200))',
  tooltipText: 'rgb(var(--heading))',
};

interface Props {
  data: { hour: number; revenue: number }[];
}

export default function HourlySalesChart({ data }: Props) {
  const chartData = data.map((d) => ({ ...d, label: `${d.hour}h` }));

  return (
    <div className="rounded-lg border border-slate-200 bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-heading-muted">Ventes par heure</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            interval={2}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: CHART_COLORS.cursor }}
            contentStyle={{
              background: CHART_COLORS.tooltipBg,
              border: `1px solid ${CHART_COLORS.tooltipBorder}`,
              borderRadius: 8,
              color: CHART_COLORS.tooltipText,
            }}
            labelStyle={{ color: CHART_COLORS.tooltipText, fontWeight: 600 }}
            itemStyle={{ color: CHART_COLORS.tooltipText }}
            formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
          />
          <Bar dataKey="revenue" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
