import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Printer } from 'lucide-react';
import { createOrder, loadOrder } from './offlineApi';
import { useToast } from '@/lib/toast';
import { Order, PaymentMethod } from './types';
import { PageSkeleton } from '@/components/ui/skeleton';
import { PrintPortal, printTicket, usePrintSettings } from '@/lib/print';
import { ReceiptTicket } from './tickets';
import { resolveUploadUrl } from '@/lib/uploads';
import { legalLines } from '@/features/establishments/legalInfo';
import { useAuth } from '@/features/auth/AuthContext';
import Alert from '@/components/ui/alert';
import CancelSaleModal from './CancelSaleModal';
import { orderTotals, taxLabel } from './taxes';
import { invoiceNo } from './invoiceNumber';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Crédit',
  ROOM: 'Sur la chambre',
};

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const { settings } = usePrintSettings();
  const autoPrinted = useRef(false);
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isOwner = user?.role === 'OWNER';
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    loadOrder(orderId).then(setOrder);
  }, [orderId]);

  const isPaid = !!order && (order.status === 'PAYEE' || order.status === 'FERMEE');

  // Impression automatique juste après l'encaissement (?print=1 ajouté par le
  // POS), si ce poste l'a activée — une seule fois, même si la page se recharge
  useEffect(() => {
    if (!isPaid || autoPrinted.current || searchParams.get('print') !== '1') return;
    autoPrinted.current = true;
    setSearchParams({}, { replace: true });
    if (settings.autoPrintReceipt) printTicket();
  }, [isPaid, searchParams, setSearchParams, settings.autoPrintReceipt]);

  if (!order) {
    return <PageSkeleton />;
  }

  // Vente annulée après encaissement : plus de reçu, mais le motif
  if (order.status === 'ANNULEE' && order.payments && order.payments.length > 0) {
    const reason = order.voids?.find((v) => v.type === 'ORDER')?.reason;
    return (
      <div className="max-w-md space-y-3">
        <Alert type="error" title="Vente annulée">
          {reason ? `Motif : ${reason}` : 'Cette vente a été annulée après encaissement.'} Elle ne compte plus dans les rapports.
        </Alert>
        <Link to={isManager ? '/sales' : '/tables'} className="inline-block text-sm font-medium text-slate-900 hover:underline">
          ← {isManager ? 'Retour aux ventes' : 'Retour aux tables'}
        </Link>
      </div>
    );
  }

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
        <div className="flex flex-wrap justify-end gap-2">
          {/* Le client recommande après avoir payé : nouvelle facture liée à celle-ci */}
          <button
            onClick={async () => {
              setCreatingFollowUp(true);
              try {
                const next = await createOrder({ followsOrderId: order.id });
                navigate(`/pos/${next.id}`);
              } catch {
                toast.error('Impossible de créer la nouvelle commande');
                setCreatingFollowUp(false);
              }
            }}
            disabled={creatingFollowUp}
            aria-busy={creatingFollowUp}
            className="btn btn-secondary"
          >
            <Plus size={16} />
            Nouvelle commande pour ce client
          </button>
          {isOwner && (
            <button onClick={() => setCancelling(true)} className="btn btn-secondary">
              Annuler la vente
            </button>
          )}
          <button onClick={() => printTicket()} className="btn btn-primary flex">
            <Printer size={16} />
            Imprimer le ticket
          </button>
        </div>
      </div>

      {cancelling && (
        <CancelSaleModal
          orderId={order.id}
          total={Number(order.total)}
          onClose={() => setCancelling(false)}
          onCancelled={() => {
            setCancelling(false);
            if (orderId) loadOrder(orderId).then(setOrder);
          }}
        />
      )}

      {/* Version imprimante thermique, invisible à l'écran */}
      <PrintPortal>
        <ReceiptTicket order={order} paperWidth={settings.paperWidth} />
      </PrintPortal>

      {/* Zone imprimable — largeur resserrée façon reçu de caisse */}
      <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-surface p-6 font-mono text-sm text-slate-800 shadow-sm print:max-w-none print:border-0 print:p-10 print:shadow-none">
        <div className="mb-4 text-center">
          {order.establishment?.logo && (
            <img
              src={resolveUploadUrl(order.establishment.logo)}
              alt={order.establishment.name}
              className="mx-auto mb-2 h-14 w-14 rounded object-cover"
            />
          )}
          <p className="text-base font-semibold">
            {order.establishment?.name ?? 'Établissement'}
          </p>
          {order.establishment &&
            legalLines(order.establishment).map((line) => (
              <p key={line} className="text-xs text-slate-500">
                {line}
              </p>
            ))}
        </div>

        <div className="space-y-0.5 border-t border-dashed border-slate-300 py-3 text-xs">
          <div className="flex justify-between">
            <span>Reçu</span>
            <span>N° {invoiceNo(order)}</span>
          </div>
          {order.followsOrder && (
            <div className="flex justify-between">
              <span>Suite de la facture</span>
              <span>N° {invoiceNo(order.followsOrder)}</span>
            </div>
          )}
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
          {order.paidByName && (
            <div className="flex justify-between">
              <span>Encaissé par</span>
              <span>{order.paidByName}</span>
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
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>
                Remise{order.discountRate != null ? ` (${Number(order.discountRate).toLocaleString('fr-FR')} %)` : ''}
              </span>
              <span>− {formatFcfa(Number(order.discount))}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Total HT</span>
            <span>{formatFcfa(Number(order.subtotal) - Number(order.discount))}</span>
          </div>
          {orderTotals(order).lines.map((t) => (
            <div key={taxLabel(t)} className="flex justify-between text-slate-500">
              <span>{taxLabel(t)}</span>
              <span>{formatFcfa(t.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>TOTAL TTC</span>
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
            {Number(order.changeGiven ?? 0) > 0 && (
              <>
                <div className="flex justify-between text-slate-500">
                  <span>Espèces reçues</span>
                  <span>{formatFcfa(Number(order.cashReceived))}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Monnaie rendue</span>
                  <span>{formatFcfa(Number(order.changeGiven))}</span>
                </div>
              </>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">Merci de votre visite !</p>
      </div>
    </div>
  );
}
