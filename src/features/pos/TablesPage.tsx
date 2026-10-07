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
import { LayoutGrid } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';

const STATUS_STYLES: Record<DiningTable['status'], string> = {
  FREE: 'bg-success-soft border-success/30 text-success-dark',
  OCCUPIED: 'bg-danger-soft border-danger/30 text-danger-dark',
  PENDING_ORDER: 'bg-warning-soft border-warning/30 text-warning-dark',
  BILL_REQUESTED: 'bg-info-soft border-info/30 text-info-dark',
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`rounded-lg border-2 p-4 text-center shadow-sm ${STATUS_STYLES[table.status]}`}
            >
              <p className="text-lg font-semibold">{table.label}</p>
              <p className="mt-1 text-xs">{TABLE_STATUS_LABELS[table.status]}</p>
            </button>
          ))}
          {tables.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={LayoutGrid} title="Aucune table configurée" description="Configurez vos tables pour prendre les commandes en salle, ou faites une vente au comptoir." action={{ label: 'Configurer les tables', to: '/tables/manage' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
