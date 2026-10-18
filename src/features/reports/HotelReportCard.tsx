import { BedDouble } from 'lucide-react';
import type { HotelReport } from '@/features/dashboard/types';

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Compte client',
};

// Section « Hébergement » des rapports : ce qui a été facturé (séjours
// terminés, avances conservées) et ce qui a été encaissé (avances et soldes)
export default function HotelReportCard({ hotel }: { hotel: HotelReport }) {
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: `Séjours terminés (${hotel.nights} nuitée${hotel.nights > 1 ? 's' : ''})`, value: String(hotel.checkedOutStays) },
    { label: 'Hébergement facturé', value: fcfa(hotel.lodging) },
    { label: 'Taxe de séjour', value: fcfa(hotel.stayTax) },
    { label: 'Prestations (pressing, room service…)', value: fcfa(hotel.services ?? 0) },
    { label: 'Avances conservées (annulations)', value: fcfa(hotel.cancellationFees) },
    { label: 'Total hébergement facturé', value: fcfa(hotel.billed), strong: true },
  ];

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-heading-muted">
        <BedDouble size={16} />
        Hébergement
      </h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.label} className={`flex justify-between ${r.strong ? 'border-t border-slate-100 pt-2 font-semibold text-heading' : 'text-slate-600'}`}>
              <span>{r.label}</span>
              <span className={r.strong ? '' : 'font-medium text-slate-900'}>{r.value}</span>
            </li>
          ))}
        </ul>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Encaissé sur la période (avances et soldes)</p>
          <ul className="space-y-2 text-sm">
            {Object.entries(hotel.received).map(([method, amount]) => (
              <li key={method} className="flex justify-between text-slate-600">
                <span>{METHOD_LABELS[method] ?? method}</span>
                <span className="font-medium text-slate-900">{fcfa(amount)}</span>
              </li>
            ))}
            {Object.keys(hotel.received).length === 0 && <li className="text-slate-500">Aucun encaissement</li>}
            {hotel.refunds > 0 && (
              <li className="flex justify-between text-slate-600">
                <span>dont remboursements d’avances</span>
                <span className="font-medium text-danger-dark">−{fcfa(hotel.refunds)}</span>
              </li>
            )}
            <li className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-heading">
              <span>Total encaissé</span>
              <span>{fcfa(hotel.receivedTotal)}</span>
            </li>
          </ul>
          <p className="mt-3 rounded-md bg-info-soft px-3 py-2 text-xs text-info-dark">
            Avances détenues sur des réservations à venir : <span className="font-semibold">{fcfa(hotel.advancesHeld)}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        L’hébergement est facturé au départ du client. Les consommations mises sur la chambre sont déjà comptées dans les
        ventes ci-dessus (mode « Sur la chambre »).
      </p>
    </div>
  );
}
