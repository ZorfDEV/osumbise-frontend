import { PRINTABLE_WIDTH_MM, type PaperWidth } from '@/lib/print';
import { resolveUploadUrl } from '@/lib/uploads';
import type { Order, OrderItem, PaymentMethod } from './types';

// Tickets pour imprimante thermique : noir sur blanc, police à chasse fixe,
// largeur de la zone imprimable du rouleau. Pas de gris (rendu tramé/pâle).

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Crédit',
};

const money = (value: number) => `${Math.round(value).toLocaleString('fr-FR')}`;
const shortId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;
const time = (iso?: string) =>
  (iso ? new Date(iso) : new Date()).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const Line = ({ left, right, bold }: { left: string; right?: string; bold?: boolean }) => (
  <div className={`ticket-line ${bold ? 'ticket-bold' : ''}`}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);

const Rule = () => <div className="ticket-rule" />;

// --- Ticket client -------------------------------------------------------

export function ReceiptTicket({ order, paperWidth }: { order: Order; paperWidth: PaperWidth }) {
  return (
    <div className="ticket" style={{ width: `${PRINTABLE_WIDTH_MM[paperWidth]}mm` }}>
      <div className="ticket-center">
        {order.establishment?.logo && (
          <img src={resolveUploadUrl(order.establishment.logo)} alt="" className="ticket-logo" />
        )}
        <div className="ticket-title">{order.establishment?.name ?? 'Établissement'}</div>
        {order.establishment?.address && <div>{order.establishment.address}</div>}
      </div>
      <Rule />
      <Line left="Reçu" right={shortId(order.id)} />
      <Line left={order.table ? `Table ${order.table.label}` : 'Comptoir'} right={time(order.updatedAt)} />
      {order.user && <Line left="Servi par" right={order.user.name} />}
      <Rule />
      {order.items.map((item) => (
        <Line key={item.id} left={`${item.quantity} x ${item.product.name}`} right={money(Number(item.unitPrice) * item.quantity)} />
      ))}
      <Rule />
      <Line left="Sous-total" right={money(Number(order.subtotal))} />
      {Number(order.discount) > 0 && <Line left="Remise" right={`-${money(Number(order.discount))}`} />}
      {Number(order.tax) > 0 && <Line left="Taxe" right={money(Number(order.tax))} />}
      <Line left="TOTAL FCFA" right={money(Number(order.total))} bold />
      {order.payments && order.payments.length > 0 && (
        <>
          <Rule />
          {order.payments.map((p) => (
            <Line key={p.id} left={PAYMENT_LABELS[p.method] ?? p.method} right={money(Number(p.amount))} />
          ))}
        </>
      )}
      <Rule />
      <div className="ticket-center">Merci de votre visite !</div>
      {/* Marge de fin : laisse la place à la coupe du papier */}
      <div className="ticket-feed" />
    </div>
  );
}

// --- Bon de cuisine ------------------------------------------------------

export function KitchenTicket({
  order,
  items,
  isAddition,
  paperWidth,
}: {
  order: Order;
  // Articles à préparer (tout le bon, ou seulement les ajouts)
  items: { item: OrderItem; quantity: number }[];
  isAddition: boolean;
  paperWidth: PaperWidth;
}) {
  return (
    <div className="ticket" style={{ width: `${PRINTABLE_WIDTH_MM[paperWidth]}mm` }}>
      <div className="ticket-center ticket-title">{isAddition ? '** AJOUT **' : 'BON CUISINE'}</div>
      <div className="ticket-center ticket-huge">{order.table ? `TABLE ${order.table.label}` : 'COMPTOIR'}</div>
      <Line left={time()} right={shortId(order.id)} />
      {order.user && <Line left="Serveur" right={order.user.name} />}
      <Rule />
      {items.map(({ item, quantity }) => (
        <div key={item.id} className="ticket-kitchen-item">
          <div className="ticket-bold">
            {quantity} x {item.product.name}
          </div>
          {item.note && <div className="ticket-note">&gt; {item.note}</div>}
        </div>
      ))}
      <Rule />
      <div className="ticket-feed" />
    </div>
  );
}
