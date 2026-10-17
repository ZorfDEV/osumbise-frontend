import { PRINTABLE_WIDTH_MM, type PaperWidth } from '@/lib/print';
import { resolveUploadUrl } from '@/lib/uploads';
import { legalLines } from '@/features/establishments/legalInfo';
import { CATEGORY_LABELS, formatDay, roomName, STAY_PAYMENT_LABELS } from './labels';
import type { StayDetail } from './types';

// Facture de séjour au format ticket thermique (mêmes styles que les reçus
// du POS : .ticket dans index.css). Montants sans "FCFA" par ligne, la
// devise figure sur la ligne du total.

const money = (n: number | string) => Math.round(Number(n)).toLocaleString('fr-FR');

const Line = ({ left, right, bold }: { left: string; right?: string; bold?: boolean }) => (
  <div className={`ticket-line ${bold ? 'ticket-bold' : ''}`}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);

export default function StayInvoiceTicket({
  stay,
  establishment,
  paperWidth,
}: {
  stay: StayDetail;
  establishment: { name: string | null; logo: string | null };
  paperWidth: PaperWidth;
}) {
  const { totals } = stay;
  // Établissement du séjour (avec ses mentions légales), à défaut l'actif
  const header = stay.establishment ?? { ...establishment, address: null };
  const roomCharges = stay.orders
    .map((o) => ({
      ...o,
      roomAmount: o.payments.filter((p) => p.method === 'ROOM').reduce((s, p) => s + Number(p.amount), 0),
    }))
    .filter((o) => o.roomAmount > 0);

  return (
    <div className="ticket" style={{ width: `${PRINTABLE_WIDTH_MM[paperWidth]}mm` }}>
      <div className="ticket-center">
        {header.logo && <img src={resolveUploadUrl(header.logo)} alt="" className="ticket-logo" />}
        <div className="ticket-title">{header.name ?? 'Hôtel'}</div>
        {legalLines(header).map((line) => (
          <div key={line}>{line}</div>
        ))}
        <div>FACTURE DE SÉJOUR</div>
      </div>
      <div className="ticket-rule" />
      <Line left="Facture" right={`#${stay.id.slice(0, 8).toUpperCase()}`} />
      <Line left="Client" right={stay.guestName} />
      {stay.guestPhone && <Line left="Téléphone" right={stay.guestPhone} />}
      <Line left="Chambre" right={`${roomName(stay.room)} (${CATEGORY_LABELS[stay.room.category]})`} />
      <Line left="Arrivée" right={formatDay(stay.checkInDate)} />
      <Line left="Départ" right={formatDay(stay.checkOutDate)} />
      <div className="ticket-rule" />
      <Line left={`Hébergement ${totals.nights} nuit${totals.nights > 1 ? 's' : ''} x ${money(stay.nightlyRate)}`} right={money(totals.lodging)} />
      {totals.tax > 0 && <Line left={`Taxe de séjour ${totals.nights} x ${money(stay.taxPerNight)}`} right={money(totals.tax)} />}
      {roomCharges.length > 0 && (
        <>
          <div className="ticket-rule" />
          <div className="ticket-bold">Consommations</div>
          {roomCharges.map((o) => (
            <Line
              key={o.id}
              left={`${formatDay(o.createdAt, { day: '2-digit', month: '2-digit' })} ${o.table ? `Table ${o.table.label}` : 'Comptoir'}`}
              right={money(o.roomAmount)}
            />
          ))}
        </>
      )}
      <div className="ticket-rule" />
      <Line left="TOTAL FCFA" right={money(totals.total)} bold />
      {stay.payments.length > 0 && (
        <>
          {stay.payments.map((p) => (
            <Line
              key={p.id}
              left={`${formatDay(p.createdAt, { day: '2-digit', month: '2-digit' })} ${p.customer ? `Compte ${p.customer.name}` : STAY_PAYMENT_LABELS[p.method]}`}
              right={`-${money(p.amount)}`}
            />
          ))}
        </>
      )}
      <Line left={totals.balance > 0 ? 'RESTE À PAYER' : 'SOLDÉ'} right={money(Math.max(0, totals.balance))} bold />
      <div className="ticket-rule" />
      <div className="ticket-center">Merci de votre séjour !</div>
      <div className="ticket-feed" />
    </div>
  );
}
