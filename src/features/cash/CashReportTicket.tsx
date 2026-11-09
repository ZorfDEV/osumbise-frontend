import { ticketWidthMm, type PaperWidth } from '@/lib/print';
import { resolveUploadUrl } from '@/lib/uploads';
import { legalLines } from '@/features/establishments/legalInfo';
import type { CashSession } from './types';
import { HOTEL_METHOD_LABELS, ROOM_CATEGORY_SHORT, hotelRoomsDiscount, hotelRoomsTax, hotelRoomsTotal, otherMethodsTotal, productSales, summarizeSession } from './summary';
import { useAuth } from '@/features/auth/AuthContext';

// Rapport de fin de service au format ticket thermique : rapport provisoire
// (session ouverte) ou rapport de clôture (session fermée). Mêmes styles que
// les reçus (.ticket, index.css).

const money = (n: number) => Math.round(n).toLocaleString('fr-FR');
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const Line = ({ left, right, bold, wrap }: { left: string; right?: string; bold?: boolean; wrap?: boolean }) => (
  <div className={`ticket-line ${bold ? 'ticket-bold' : ''} ${wrap ? 'ticket-line-wrap' : ''}`}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);
const Rule = () => <div className="ticket-rule" />;

export default function CashReportTicket({ session, paperWidth }: { session: CashSession; paperWidth: PaperWidth }) {
  const s = summarizeSession(session);
  const { user } = useAuth();
  const establishment = session.cashRegister?.establishment;
  const closed = !!session.closedAt;

  return (
    <div className="ticket" style={{ width: `${ticketWidthMm(paperWidth)}mm` }}>
      <div className="ticket-center">
        {establishment?.logo && <img src={resolveUploadUrl(establishment.logo)} alt="" className="ticket-logo" />}
        <div className="ticket-title">{establishment?.name ?? 'Établissement'}</div>
        {establishment && legalLines(establishment).map((line) => <div key={line}>{line}</div>)}
      </div>
      <Rule />
      <div className="ticket-center ticket-bold">{closed ? 'RAPPORT DE CLÔTURE' : 'RAPPORT PROVISOIRE'}</div>
      <Line left="Caisse" right={session.cashRegister?.name ?? '—'} />
      <Line left="Caissier" right={session.openedBy?.name ?? '—'} />
      <Line left="Ouverture" right={dateTime(session.openedAt)} />
      {session.plannedCloseAt && <Line left="Fin prévue" right={dateTime(session.plannedCloseAt)} />}
      {session.closedAt && <Line left="Clôture" right={dateTime(session.closedAt)} />}
      {session.closedBy && session.closedBy.name !== session.openedBy?.name && <Line left="Clôturée par" right={session.closedBy.name} />}
      <Rule />
      <div className="ticket-bold">VENTES ({s.salesCount})</div>
      <Line left="Espèces" right={money(s.cashSales)} />
      <Line left="Mobile Money" right={money(s.mobileSales)} />
      <Line left="Carte" right={money(s.cardSales)} />
      {otherMethodsTotal(session.orders) > 0 && <Line left="Compte client / chambre / virement" right={money(otherMethodsTotal(session.orders))} />}
      <Line left="TOTAL VENTES FCFA" right={money(s.totalSales + otherMethodsTotal(session.orders))} bold />
      {session.hotel && session.hotel.rooms.length > 0 && (
        <>
          <Rule />
          <div className="ticket-bold">CHAMBRES VENDUES (NUITÉES)</div>
          {session.hotel.rooms.map((r) => (
            <Line
              key={`${r.category}-${r.nightlyRate}`}
              left={`${ROOM_CATEGORY_SHORT[r.category] ?? r.category} : ${r.nights} × ${money(r.nightlyRate)}`}
              right={money(r.amount)}
            />
          ))}
          {hotelRoomsDiscount(session.hotel) > 0 && <Line left="- Remises" right={money(hotelRoomsDiscount(session.hotel))} />}
          {hotelRoomsTax(session.hotel) > 0 && <Line left="Taxe de séjour" right={money(hotelRoomsTax(session.hotel))} />}
          <Line left="TOTAL CHAMBRES FCFA" right={money(hotelRoomsTotal(session.hotel))} bold />
          {session.hotel.payments.length > 0 && (
            <>
              <div className="ticket-bold">ENCAISSÉ (HÔTEL)</div>
              {session.hotel.payments.map((p) => (
                <Line key={p.method} left={(HOTEL_METHOD_LABELS[p.method] ?? p.method).toUpperCase()} right={money(p.amount)} />
              ))}
            </>
          )}
        </>
      )}
      <Rule />
      <div className="ticket-bold">TIROIR (ESPÈCES)</div>
      <Line left="Fond de caisse" right={money(s.openingBalance)} />
      <Line left="+ Ventes espèces" right={money(s.cashSales)} />
      {s.expenses !== 0 && <Line left="- Dépenses" right={money(Math.abs(s.expenses))} />}
      {s.refunds !== 0 && <Line left="- Remboursements" right={money(Math.abs(s.refunds))} />}
      {s.adjustments !== 0 && <Line left="+/- Ajustements" right={money(s.adjustments)} />}
      <Line left="Solde théorique" right={money(s.theoretical)} bold />
      {closed && (
        <>
          <Line left="Solde compté" right={money(Number(session.actualBalance))} bold />
          <Line left="ÉCART" right={money(Number(session.discrepancy))} bold />
        </>
      )}
      {productSales(session.orders).length > 0 && (
        <>
          <Rule />
          <div className="ticket-bold">PRODUITS VENDUS</div>
          {productSales(session.orders).map((p) => (
            <Line key={p.name} left={`${p.name} x ${p.quantity}`} right={money(p.amount)} wrap />
          ))}
        </>
      )}
      <Rule />
      <div className="ticket-center">
        Imprimé le {dateTime(new Date().toISOString())}
        {user ? ` par ${user.name}` : ''}
      </div>
      {closed && (
        <>
          <br />
          <Line left="Signature caissier" right="" />
          <br />
          <Line left="Signature responsable" right="" />
        </>
      )}
      <div className="ticket-feed" />
    </div>
  );
}
