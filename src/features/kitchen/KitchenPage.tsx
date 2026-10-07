import { useEffect, useState, useCallback } from 'react';
import { fetchOrders, updateOrderStatus } from '@/features/pos/api';
import { Order, OrderStatus } from '@/features/pos/types';
import { getSocket } from '@/lib/socket';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { ChefHat } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';

const STATUS_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  EN_ATTENTE: { label: 'Commencer la préparation', next: 'EN_PREPARATION' },
  EN_PREPARATION: { label: 'Marquer prête', next: 'PRETE' },
};

const STATUS_STYLES: Partial<Record<OrderStatus, string>> = {
  EN_ATTENTE: 'bg-warning-soft text-warning-dark',
  EN_PREPARATION: 'bg-info-soft text-info-dark',
};

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  EN_ATTENTE: 'En attente',
  EN_PREPARATION: 'En préparation',
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([fetchOrders({ status: 'EN_ATTENTE' }), fetchOrders({ status: 'EN_PREPARATION' })])
      .then(([waiting, preparing]) => setOrders([...waiting, ...preparing]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();

    // Dès qu'un serveur envoie une commande en cuisine (ou la modifie),
    // cet écran se met à jour sans qu'aucun cuisinier n'ait à rafraîchir —
    // c'est précisément le scénario "serveur → backend → cuisine" du document
    const socket = getSocket();
    const handleChange = () => load();
    socket.on('order:created', handleChange);
    socket.on('order:status_changed', handleChange);
    socket.on('order:updated', handleChange);

    return () => {
      socket.off('order:created', handleChange);
      socket.off('order:status_changed', handleChange);
      socket.off('order:updated', handleChange);
    };
  }, [load]);

  const handleAdvance = async (order: Order) => {
    const action = STATUS_ACTION[order.status];
    if (!action) return;
    await updateOrderStatus(order.id, action.next);
    // Pas de reload() ici : l'événement order:status_changed émis par le
    // backend va rafraîchir cet écran (et tous les autres postes connectés)
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-heading">Cuisine</h1>

      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-slate-200 bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-slate-900">
                  {order.table ? `Table ${order.table.label}` : 'Comptoir'}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <ul className="mb-3 space-y-1 text-sm text-slate-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.product.name}
                  </li>
                ))}
              </ul>
              {STATUS_ACTION[order.status] && (
                <button
                  onClick={() => handleAdvance(order)}
                  className="btn btn-primary w-full"
                >
                  {STATUS_ACTION[order.status]!.label}
                </button>
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={ChefHat} title="Aucune commande en cuisine" description="Les commandes envoyées depuis le point de vente s’affichent ici automatiquement." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
