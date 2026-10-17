import { useEffect, useState, useCallback } from 'react';
import { fetchOrders, updateOrderStatus } from '@/features/pos/api';
import { Order, OrderItem, OrderStatus } from '@/features/pos/types';
import { getSocket } from '@/lib/socket';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { ChefHat, Printer } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import {
  PrintPortal,
  printTicket,
  readKitchenPrinted,
  usePrintSettings,
  writeKitchenPrinted,
  type PrintedSnapshot,
} from '@/lib/print';
import { KitchenTicket } from '@/features/pos/tickets';

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

interface KitchenJob {
  order: Order;
  items: { item: OrderItem; quantity: number }[];
  isAddition: boolean;
}

const snapshotOf = (order: Order) => Object.fromEntries(order.items.map((i) => [i.id, i.quantity]));

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings, update } = usePrintSettings();
  const [queue, setQueue] = useState<KitchenJob[]>([]);
  const [current, setCurrent] = useState<KitchenJob | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchOrders({ status: 'EN_ATTENTE' }), fetchOrders({ status: 'EN_PREPARATION' })])
      // Les boissons (produits « Bar ») ne passent pas par la cuisine : écran
      // et bons n'affichent que les plats, et une commande de boissons seules
      // n'apparaît pas du tout
      .then(([waiting, preparing]) =>
        setOrders(
          [...waiting, ...preparing]
            .map((o) => ({ ...o, items: o.items.filter((i) => (i.product.preparationArea ?? 'KITCHEN') === 'KITCHEN') }))
            .filter((o) => o.items.length > 0)
        )
      )
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

  // Impression automatique des bons : compare chaque commande à ce qui a
  // déjà été imprimé sur ce poste ; une nouvelle commande donne un bon
  // complet, des articles ajoutés ensuite donnent un bon "AJOUT".
  useEffect(() => {
    if (!settings.autoPrintKitchen || isLoading) return;
    const printed: PrintedSnapshot = readKitchenPrinted();
    const jobs: KitchenJob[] = [];
    for (const order of orders) {
      const previous = printed[order.id];
      const items = order.items
        .map((item) => ({ item, quantity: item.quantity - (previous?.[item.id] ?? 0) }))
        .filter((d) => d.quantity > 0);
      // Mise à jour même sans impression (quantité réduite, article retiré)
      delete printed[order.id];
      printed[order.id] = snapshotOf(order);
      if (items.length > 0) jobs.push({ order, items, isAddition: !!previous });
    }
    writeKitchenPrinted(printed);
    if (jobs.length > 0) setQueue((q) => [...q, ...jobs]);
  }, [orders, isLoading, settings.autoPrintKitchen]);

  // File d'impression : un bon à la fois
  useEffect(() => {
    if (current || queue.length === 0) return;
    setCurrent(queue[0]);
    setQueue((q) => q.slice(1));
  }, [current, queue]);

  useEffect(() => {
    if (!current) return;
    printTicket().then(() => setCurrent(null));
  }, [current]);

  // Activation depuis cet écran : les commandes déjà affichées sont
  // considérées comme imprimées, seules les suivantes sortent sur papier.
  const toggleAutoPrint = (enabled: boolean) => {
    if (enabled) {
      const printed = readKitchenPrinted();
      orders.forEach((o) => {
        printed[o.id] = snapshotOf(o);
      });
      writeKitchenPrinted(printed);
    }
    update({ autoPrintKitchen: enabled });
  };

  const reprint = (order: Order) =>
    setQueue((q) => [...q, { order, items: order.items.map((item) => ({ item, quantity: item.quantity })), isAddition: false }]);

  const handleAdvance = async (order: Order) => {
    const action = STATUS_ACTION[order.status];
    if (!action) return;
    await updateOrderStatus(order.id, action.next);
    // Pas de reload() ici : l'événement order:status_changed émis par le
    // backend va rafraîchir cet écran (et tous les autres postes connectés)
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-heading">Cuisine</h1>
        {/* Réglage propre à ce poste : seul le PC de la cuisine doit l'activer */}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoPrintKitchen}
            onChange={(e) => toggleAutoPrint(e.target.checked)}
            className="h-4 w-4"
          />
          <Printer size={16} className="text-slate-500" />
          <span className="font-medium text-slate-700">Imprimer les bons automatiquement</span>
          <span className="hidden text-xs text-slate-500 sm:inline">(ce poste)</span>
        </label>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-slate-200 bg-surface p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">
                  {order.table ? `Table ${order.table.label}` : 'Comptoir'}
                </p>
                <div className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <button
                    onClick={() => reprint(order)}
                    title="Réimprimer le bon"
                    aria-label={`Réimprimer le bon de ${order.table ? `la table ${order.table.label}` : 'la commande comptoir'}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-heading"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
              <ul className="mb-3 space-y-1 text-sm text-slate-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.product.name}
                    {item.note && <span className="block pl-4 text-xs italic text-slate-500">{item.note}</span>}
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

      {/* Bon en cours d'impression, invisible à l'écran */}
      {current && (
        <PrintPortal>
          <KitchenTicket
            order={current.order}
            items={current.items}
            isAddition={current.isAddition}
            paperWidth={settings.paperWidth}
          />
        </PrintPortal>
      )}
    </div>
  );
}
