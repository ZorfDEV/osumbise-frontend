import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { loadOrder } from './offlineApi';
import { Order, PaymentMethod } from './types';
import { PageSkeleton } from '@/components/ui/skeleton';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Crédit',
};

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    loadOrder(orderId).then(setOrder);
  }, [orderId]);

  if (!order) {
    return <PageSkeleton />;
  }

  const isPaid = order.status === 'PAYEE' || order.status === 'FERMEE';

  if (!isPaid) {
    return (
      <div className="max-w-md">
        <p className="text-sm text-slate-500">
          Cette commande n’a pas encore été payée — la facture n’est disponible qu’après
          encaissement.
        </p>
        <Link
          to={`/pos/${order.id}`}
          className="mt-3 inline-block text-sm font-medium text-slate-900 hover:underline"
        >
          ← Retour à la commande
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/tables" className="text-sm text-slate-500 hover:text-slate-900">
          ← Retour aux tables
        </Link>
        <button
          onClick={() => window.print()}
          className="btn btn-primary flex"
        >
          <Printer size={16} />
          Imprimer la facture
        </button>
      </div>

      {/* Zone imprimable — largeur resserrée façon reçu de caisse */}
      <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-surface p-6 font-mono text-sm text-slate-800 shadow-sm print:max-w-none print:border-0 print:p-10 print:shadow-none">
        <div className="mb-4 text-center">
          {order.establishment?.logo && (
            <img
              src={order.establishment.logo}
              alt={order.establishment.name}
              className="mx-auto mb-2 h-14 w-14 rounded object-cover"
            />
          )}
          <p className="text-base font-semibold">
            {order.establishment?.name ?? 'Établissement'}
          </p>
          {order.establishment?.address && (
            <p className="text-xs text-slate-500">{order.establishment.address}</p>
          )}
        </div>

        <div className="space-y-0.5 border-t border-dashed border-slate-300 py-3 text-xs">
          <div className="flex justify-between">
            <span>Reçu</span>
            <span>#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>{order.table ? `Table ${order.table.label}` : 'Comptoir'}</span>
            <span>
              {order.updatedAt ? new Date(order.updatedAt).toLocaleString('fr-FR') : ''}
            </span>
          </div>
          {order.user && (
            <div className="flex justify-between">
              <span>Servi par</span>
              <span>{order.user.name}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 border-t border-dashed border-slate-300 py-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity}× {item.product.name}
              </span>
              <span>{formatFcfa(Number(item.unitPrice) * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-dashed border-slate-300 py-3">
          <div className="flex justify-between text-slate-500">
            <span>Sous-total</span>
            <span>{formatFcfa(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Taxe</span>
            <span>{formatFcfa(Number(order.tax))}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>TOTAL</span>
            <span>{formatFcfa(Number(order.total))}</span>
          </div>
        </div>

        {order.payments && order.payments.length > 0 && (
          <div className="space-y-1 border-t border-dashed border-slate-300 py-3">
            {order.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-slate-500">
                <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
                <span>{formatFcfa(Number(p.amount))}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">Merci de votre visite !</p>
      </div>
    </div>
  );
}
