import { ticketWidthMm, type PaperWidth } from '@/lib/print';
import { resolveUploadUrl } from '@/lib/uploads';
import { legalLines } from '@/features/establishments/legalInfo';
import { useAuth } from '@/features/auth/AuthContext';
import type { CustomerDetail } from './types';

// Relevé de compte d'un client à crédit : ce qui a été mis sur son compte,
// ses règlements, et le solde qu'il doit encore. Format ticket thermique.

const money = (n: number) => Math.round(n).toLocaleString('fr-FR');
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const Line = ({ left, right, bold }: { left: string; right?: string; bold?: boolean }) => (
  <div className={`ticket-line ${bold ? 'ticket-bold' : ''}`}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);
const Rule = () => <div className="ticket-rule" />;

export default function CustomerStatementTicket({
  customer,
  charges,
  establishment,
  paperWidth,
}: {
  customer: CustomerDetail;
  charges: { id: string; date: string; label: string; amount: number }[];
  establishment: { name: string; logo: string | null; address?: string | null; phone?: string | null; email?: string | null; postalBox?: string | null; nif?: string | null; rc?: string | null };
  paperWidth: PaperWidth;
}) {
  const { user } = useAuth();
  return (
    <div className="ticket" style={{ width: `${ticketWidthMm(paperWidth)}mm` }}>
      <div className="ticket-center">
        {establishment.logo && <img src={resolveUploadUrl(establishment.logo)} alt="" className="ticket-logo" />}
        <div className="ticket-title">{establishment.name}</div>
        {legalLines(establishment).map((line) => (
          <div key={line}>{line}</div>
        ))}
        <div className="ticket-bold">RELEVÉ DE COMPTE</div>
      </div>
      <Rule />
      <Line left="Client" right={customer.name} />
      {customer.phone && <Line left="Téléphone" right={customer.phone} />}
      <Line left="Édité le" right={day(new Date().toISOString())} />
      {user && <Line left="Édité par" right={user.name} />}
      <Rule />
      <div className="ticket-bold">Mis sur le compte</div>
      {charges.length === 0 && <div>Aucune opération</div>}
      {charges.map((c) => (
        <Line key={c.id} left={`${day(c.date)} ${c.label}`} right={money(c.amount)} />
      ))}
      {customer.payments.length > 0 && (
        <>
          <Rule />
          <div className="ticket-bold">Règlements reçus</div>
          {customer.payments.map((p) => (
            <Line key={p.id} left={day(p.createdAt)} right={`-${money(Number(p.amount))}`} />
          ))}
        </>
      )}
      <Rule />
      <Line left="SOLDE DÛ FCFA" right={money(Number(customer.balance))} bold />
      {customer.creditLimit && <Line left="Plafond" right={money(Number(customer.creditLimit))} />}
      <Rule />
      <div className="ticket-center">Merci de régler votre solde à la caisse.</div>
      <div className="ticket-feed" />
    </div>
  );
}
