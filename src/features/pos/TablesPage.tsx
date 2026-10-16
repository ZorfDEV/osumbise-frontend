import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchTables, fetchOrders } from './api';
import { createOrder, findLocalActiveOrderForTable } from './offlineApi';
import { getCachedTables } from '@/lib/offlineCache';
import { DiningTable, TABLE_STATUS_LABELS } from './types';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { DiningTableIcon } from '@/components/ui/icons';
import { MapPin } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';

// Même langage visuel que le plan des chambres : carte teintée, icône et
// badge à la couleur du statut
const STATUS_STYLES: Record<DiningTable['status'], { card: string; icon: string; badge: string; dot: string }> = {
  FREE: { card: 'border-success/40 bg-success-soft/40', icon: 'text-success-dark', badge: 'bg-success-soft text-success-dark', dot: 'bg-success-accent' },
  OCCUPIED: { card: 'border-danger/40 bg-danger-soft/30', icon: 'text-danger-dark', badge: 'bg-danger-soft text-danger-dark', dot: 'bg-danger' },
  PENDING_ORDER: { card: 'border-warning/40 bg-warning-soft/40', icon: 'text-warning-dark', badge: 'bg-warning-soft text-warning-dark', dot: 'bg-warning-accent' },
  BILL_REQUESTED: { card: 'border-info/40 bg-info-soft/40', icon: 'text-info-dark', badge: 'bg-info-soft text-info-dark', dot: 'bg-info' },
};

// Libellés courts pour le badge de la carte (le libellé complet reste en info-bulle)
const SHORT_STATUS_LABELS: Record<DiningTable['status'], string> = {
  FREE: 'Libre',
  OCCUPIED: 'Occupée',
  PENDING_ORDER: 'En attente',
  BILL_REQUESTED: 'Addition',
};

const ACTIVE_STATUSES = ['BROUILLON', 'EN_ATTENTE', 'EN_PREPARATION', 'PRETE', 'SERVIE'];

export default function TablesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );

  const loadTables = () => {
    fetchTables()
      .then(setTables)
      .catch(() => getCachedTables().then(setTables))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTables();

    // Un OWNER n'a pas d'établissement fixe : on prend le premier de son
    // organisation pour pouvoir créer des commandes. Un vrai sélecteur
    // multi-établissements reste à construire pour un propriétaire qui gère
    // plusieurs bars en simultané.
    if (!user?.establishmentId) {
      api.get('/establishments').then((res) => {
        const list = res.data.establishments;
        if (list.length > 0) setEstablishmentId(list[0].id);
      });
    }

    // Le plan de salle se met à jour tout seul si un autre poste crée,
    // encaisse ou modifie une commande liée à une table
    const socket = getSocket();
    const handleChange = () => loadTables();
    socket.on('order:created', handleChange);
    socket.on('order:status_changed', handleChange);
    socket.on('order:paid', handleChange);

    return () => {
      socket.off('order:created', handleChange);
      socket.off('order:status_changed', handleChange);
      socket.off('order:paid', handleChange);
    };
  }, [user]);

  const handleTableClick = async (table: DiningTable) => {
    if (table.status === 'FREE') {
      const order = await createOrder({ tableId: table.id, establishmentId });
      navigate(`/pos/${order.id}`);
      return;
    }

    if (navigator.onLine) {
      try {
        const orders = await fetchOrders({ tableId: table.id });
        const active = orders.find((o) => ACTIVE_STATUSES.includes(o.status));
        if (active) {
          navigate(`/pos/${active.id}`);
          return;
        }
      } catch {
        // Bascule sur le cache local juste en dessous
      }
    }

    const localOrder = await findLocalActiveOrderForTable(table.id);
    if (localOrder) {
      navigate(`/pos/${localOrder.id}`);
    }
  };

  const handleCounterSale = async () => {
    const order = await createOrder({ establishmentId });
    navigate(`/pos/${order.id}`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-heading">Tables</h1>
        <div className="flex gap-2">
          <Link
            to="/tables/manage"
            className="btn btn-secondary"
          >
            Gérer les tables
          </Link>
          <button
            onClick={handleCounterSale}
            className="btn btn-primary"
          >
            Vente au comptoir
          </button>
        </div>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {tables.map((table) => {
            const st = STATUS_STYLES[table.status];
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`group flex min-h-[9.5rem] flex-col rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${st.card}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface/80 shadow-sm transition-transform group-hover:scale-105 ${st.icon}`}>
                    <DiningTableIcon size={22} strokeWidth={1.75} />
                  </span>
                  <span
                    title={TABLE_STATUS_LABELS[table.status]}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${st.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {SHORT_STATUS_LABELS[table.status]}
                  </span>
                </div>
                <span className="mt-2 truncate text-2xl font-bold leading-none text-heading">{table.label}</span>
                <span className="mt-auto flex items-center gap-1 border-t border-slate-200/70 pt-2 text-xs text-slate-600">
                  <MapPin size={12} aria-hidden />
                  <span className="truncate">{table.zone || 'Salle'}</span>
                </span>
              </button>
            );
          })}
          {tables.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={DiningTableIcon} title="Aucune table configurée" description="Configurez vos tables pour prendre les commandes en salle, ou faites une vente au comptoir." action={{ label: 'Configurer les tables', to: '/tables/manage' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
