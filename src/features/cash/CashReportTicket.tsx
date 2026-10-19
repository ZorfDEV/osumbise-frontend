import { PRINTABLE_WIDTH_MM, type PaperWidth } from '@/lib/print';
import { resolveUploadUrl } from '@/lib/uploads';
import { legalLines } from '@/features/establishments/legalInfo';
import type { CashSession } from './types';
import { otherMethodsTotal, productTotals, summarizeSession } from './summary';
import { invoiceNo } from '@/features/pos/invoiceNumber';

// Rapport de fin de service au format ticket thermique : rapport provisoire
// (session ouverte) ou rapport de clôture (session fermée). Mêmes styles que
// les reçus (.ticket, index.css).

const money = (n: number) => Math.round(n).toLocaleString('fr-FR');
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const Line = ({ left, right, bold }: { left: string; right?: string; bold?: boolean }) => (
  <div className={`ticket-line ${bold ? 'ticket-bold' : ''}`}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);
const Rule = () => <div className="ticket-rule" />;

export default function CashReportTicket({ session, paperWidth }: { session: CashSession; paperWidth: PaperWidth }) {
  const s = summarizeSession(session);
  const establishment = session.cashRegister?.establishment;
  const closed = !!session.closedAt;

  return (
    <div className="ticket" style={{ width: `${PRINTABLE_WIDTH_MM[paperWidth]}mm` }}>
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
      {session.closedAt && <Line left="Clôture" right={dateTime(session.closedAt)} />}
      {session.closedBy && session.closedBy.name !== session.openedBy?.name && <Line left="Clôturée par" right={session.closedBy.name} />}
      <Rule />
      <div className="ticket-bold">VENTES ({s.salesCount})</div>
      <Line left="Espèces" right={money(s.cashSales)} />
      <Line left="Mobile Money" right={money(s.mobileSales)} />
      <Line left="Carte" right={money(s.cardSales)} />
      {otherMethodsTotal(session.orders) > 0 && <Line left="Compte client / chambre / virement" right={money(otherMethodsTotal(session.orders))} />}
      <Line left="TOTAL VENTES FCFA" right={money(s.totalSales + otherMethodsTotal(session.orders))} bold />
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
      {(session.orders ?? []).length > 0 && (
        <>
          <Rule />
          <div className="ticket-bold">DÉTAIL DES FACTURES ({(session.orders ?? []).length})</div>
          {(session.orders ?? []).map((o) => (
            <div key={o.id} className="ticket-kitchen-item">
              <Line
                left={`N° ${invoiceNo(o)} ${o.table ? `T.${o.table.label}` : 'Comptoir'}${o.status === 'ANNULEE' ? ' (annulée)' : ''}`}
                right={money(Number(o.total))}
                bold
              />
              {o.items.map((i, idx) => (
                <div key={idx}>
                  {'  '}
                  {i.quantity} x {i.product.name}
                </div>
              ))}
            </div>
          ))}
          <Rule />
          <div className="ticket-bold">PRODUITS VENDUS (TOTAL)</div>
          {productTotals(session.orders).map((p) => (
            <Line key={p.name} left={p.name} right={String(p.quantity)} />
          ))}
        </>
      )}
      <Rule />
      <div className="ticket-center">Imprimé le {dateTime(new Date().toISOString())}</div>
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
