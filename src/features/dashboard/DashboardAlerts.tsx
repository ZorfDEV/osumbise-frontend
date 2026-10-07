import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, PackageX, Wallet } from 'lucide-react';
import { fetchAlerts } from '@/features/stock/api';
import { fetchCashRegisters, fetchCashSession } from '@/features/cash/api';

interface Alert {
  id: string;
  tone: 'danger' | 'warning' | 'info';
  icon: typeof AlertTriangle;
  message: string;
  action: { label: string; to: string };
}

const TONES = {
  danger: 'border-danger/30 bg-danger-soft text-danger-dark',
  warning: 'border-warning/30 bg-warning-soft text-warning-dark',
  info: 'border-info/30 bg-info-soft text-info-dark',
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// Points qui demandent une action aujourd'hui. Chaque source est chargée
// indépendamment : si l'une échoue, les autres alertes s'affichent quand même.
export default function DashboardAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let cancelled = false;
    const push = (items: Alert[]) => !cancelled && setAlerts((prev) => [...prev, ...items]);

    fetchAlerts()
      .then((stock) => {
        const ruptures = stock.filter((a) => a.severity === 'RUPTURE').length;
        const low = stock.length - ruptures;
        const items: Alert[] = [];
        if (ruptures > 0) {
          items.push({
            id: 'stock-rupture',
            tone: 'danger',
            icon: PackageX,
            message: `${plural(ruptures, 'produit est', 'produits sont')} en rupture de stock`,
            action: { label: 'Réapprovisionner', to: '/stock' },
          });
        }
        if (low > 0) {
          items.push({
            id: 'stock-low',
            tone: 'warning',
            icon: AlertTriangle,
            message: `${plural(low, 'produit est', 'produits sont')} sous le stock minimum`,
            action: { label: 'Voir le stock', to: '/stock' },
          });
        }
        push(items);
      })
      .catch(() => {});

    // Session de caisse ouverte avant aujourd'hui = oubli de clôture
    fetchCashRegisters()
      .then((registers) =>
        Promise.all(
          registers
            .filter((r) => r.sessions.length > 0)
            .map((r) => fetchCashSession(r.sessions[0].id).then((s) => ({ register: r, session: s })))
        )
      )
      .then((open) => {
        const stale = open.filter(({ session }) => new Date(session.openedAt).getTime() < startOfToday());
        push(
          stale.map(({ register, session }) => ({
            id: `cash-${session.id}`,
            tone: 'info' as const,
            icon: Wallet,
            message: `La caisse « ${register.name} » est ouverte depuis le ${new Date(session.openedAt).toLocaleDateString('fr-FR')}`,
            action: { label: 'Clôturer', to: `/cash/${session.id}` },
          }))
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (alerts.length === 0) return null;

  // Les plus urgentes d'abord
  const order = { danger: 0, warning: 1, info: 2 };
  const sorted = [...alerts].sort((a, b) => order[a.tone] - order[b.tone]);

  return (
    <section aria-label="Points d’attention" className="space-y-2">
      {sorted.map((a) => {
        const Icon = a.icon;
        return (
          <div
            key={a.id}
            className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm ${TONES[a.tone]}`}
          >
            <span className="flex items-center gap-2">
              <Icon size={18} className="shrink-0" />
              {a.message}
            </span>
            <Link to={a.action.to} className="inline-flex items-center gap-0.5 font-semibold hover:underline">
              {a.action.label}
              <ChevronRight size={16} />
            </Link>
          </div>
        );
      })}
    </section>
  );
}
