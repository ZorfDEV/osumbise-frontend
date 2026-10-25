import { ticketWidthMm, type PaperWidth } from '@/lib/print';
import { resolveUploadUrl } from '@/lib/uploads';
import { legalLines } from '@/features/establishments/legalInfo';
import { useAuth } from '@/features/auth/AuthContext';
import { hotelInvoiceNo } from '@/features/pos/invoiceNumber';
import { CATEGORY_LABELS, formatDay, roomName, STAY_PAYMENT_LABELS } from './labels';
import type { StayGroupDetail } from './groupApi';

// Facture unique d'un groupe : chaque chambre détaillée (nuits, taxe de
// séjour, consommations), puis le total, les versements et le reste à payer.

const money = (n: number | string) => Math.round(Number(n)).toLocaleString('fr-FR');

const Line = ({ left, right, bold }: { left: string; right?: string; bold?: boolean }) => (
  <div className={`ticket-line ${bold ? 'ticket-bold' : ''}`}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);
const Rule = () => <div className="ticket-rule" />;

export default function GroupInvoiceTicket({ group, paperWidth }: { group: StayGroupDetail; paperWidth: PaperWidth }) {
  const { user } = useAuth();
  const billed = group.stays.filter((s) => s.status !== 'CANCELLED');
  const { totals } = group;
  const payments = billed.flatMap((s) => s.payments).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="ticket" style={{ width: `${ticketWidthMm(paperWidth)}mm` }}>
      <div className="ticket-center">
        {group.establishment.logo && <img src={resolveUploadUrl(group.establishment.logo)} alt="" className="ticket-logo" />}
        <div className="ticket-title">{group.establishment.name}</div>
        {legalLines(group.establishment).map((line) => (
          <div key={line}>{line}</div>
        ))}
        <div>FACTURE DE GROUPE</div>
      </div>
      <Rule />
      <Line left="Facture N°" right={hotelInvoiceNo(group)} />
      <Line left="Client" right={group.customer?.name ?? group.name} />
      <Line left="Réservé par" right={group.user.name} />
      {user && <Line left="Édité par" right={user.name} />}
      {group.customer && <Line left="Groupe" right={group.name} />}
      {group.contactPhone && <Line left="Téléphone" right={group.contactPhone} />}
      <Line left="Chambres" right={String(totals.rooms)} />
      <Rule />
      {billed.map((s) => (
        <div key={s.id}>
          <div className="ticket-bold">
            Ch. {roomName(s.room)} ({CATEGORY_LABELS[s.room.category]})
          </div>
          {s.guestName !== group.name && <div>{s.guestName}</div>}
          <div>
            {formatDay(s.checkInDate, { day: '2-digit', month: '2-digit' })} → {formatDay(s.checkOutDate, { day: '2-digit', month: '2-digit' })}
          </div>
          <Line left={`${s.totals.nights} nuitée(s) x ${money(s.nightlyRate)}`} right={money(s.totals.lodging)} />
          {s.totals.tax > 0 && <Line left="Taxe de séjour" right={money(s.totals.tax)} />}
          {s.totals.charges > 0 && <Line left="Consommations" right={money(s.totals.charges)} />}
          {s.totals.services > 0 && <Line left="Prestations" right={money(s.totals.services)} />}
          {s.totals.discount > 0 && <Line left="Remise" right={`-${money(s.totals.discount)}`} />}
          <Line left="Sous-total" right={money(s.totals.total)} bold />
          <Rule />
        </div>
      ))}
      <Line left="Hébergement" right={money(totals.lodging)} />
      {totals.tax > 0 && <Line left="Taxe de séjour" right={money(totals.tax)} />}
      {totals.charges > 0 && <Line left="Consommations" right={money(totals.charges)} />}
      {totals.services > 0 && <Line left="Prestations" right={money(totals.services)} />}
      {totals.discount > 0 && <Line left="Remises" right={`-${money(totals.discount)}`} />}
      <Line left="TOTAL FCFA" right={money(totals.total)} bold />
      {payments.length > 0 && (
        <>
          <Rule />
          {payments.map((p) => (
            <Line
              key={p.id}
              left={`${formatDay(p.createdAt, { day: '2-digit', month: '2-digit' })} ${Number(p.amount) < 0 ? 'Remboursement' : p.customer ? `Compte ${p.customer.name}` : STAY_PAYMENT_LABELS[p.method]}`}
              right={Number(p.amount) < 0 ? `+${money(-Number(p.amount))}` : `-${money(p.amount)}`}
            />
          ))}
          {payments.filter((p) => Number(p.changeGiven ?? 0) > 0).map((p) => (
            <div key={`change-${p.id}`}>
              <Line left="Espèces reçues" right={money(p.cashReceived ?? 0)} />
              <Line left="Monnaie rendue" right={money(p.changeGiven ?? 0)} bold />
            </div>
          ))}
        </>
      )}
      <Rule />
      <Line left={totals.balance > 0 ? 'RESTE À PAYER' : 'SOLDÉ'} right={money(Math.max(0, totals.balance))} bold />
      <Rule />
      <div className="ticket-center">Merci de votre confiance !</div>
      <div className="ticket-feed" />
    </div>
  );
}
