import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import { fetchStayGroups, type StayGroupListItem } from './groupApi';
import { formatDay } from './labels';

// Onglet « Groupes » de la page Séjours : réservations de groupe récentes
export default function GroupsList({ onCreate }: { onCreate: () => void }) {
  const [groups, setGroups] = useState<StayGroupListItem[] | null>(null);

  useEffect(() => {
    fetchStayGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  if (groups === null) return <ListSkeleton />;
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucune réservation de groupe"
        description="Réservez plusieurs chambres au nom d’une entreprise, avec une facture unique."
        action={{ label: 'Réservation de groupe', onClick: onCreate }}
      />
    );
  }

  const statusOf = (g: StayGroupListItem) => {
    const active = g.stays.filter((s) => s.status !== 'CANCELLED');
    if (active.some((s) => s.status === 'CHECKED_IN')) return { label: 'En cours', badge: 'bg-success-soft text-success-dark' };
    if (active.some((s) => s.status === 'RESERVED')) return { label: 'Réservé', badge: 'bg-info-soft text-info-dark' };
    return { label: 'Terminé', badge: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
      <table className="table-cards w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Groupe</th>
            <th className="px-4 py-2 font-medium">Chambres</th>
            <th className="px-4 py-2 font-medium">Dates</th>
            <th className="px-4 py-2 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.map((g) => {
            const active = g.stays.filter((s) => s.status !== 'CANCELLED');
            const first = [...active].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))[0];
            const last = [...active].sort((a, b) => b.checkOutDate.localeCompare(a.checkOutDate))[0];
            const st = statusOf(g);
            return (
              <tr key={g.id}>
                <td data-label="Groupe" className="px-4 py-2">
                  <Link to={`/hotel/groups/${g.id}`} className="font-medium text-heading hover:underline">
                    {g.name}
                  </Link>
                  {g.customer && <span className="block text-xs text-slate-500">{g.customer.name}</span>}
                </td>
                <td data-label="Chambres" className="px-4 py-2 text-slate-600">{active.length}</td>
                <td data-label="Dates" className="px-4 py-2 text-slate-600">
                  {first && last
                    ? `${formatDay(first.checkInDate, { day: '2-digit', month: '2-digit' })} → ${formatDay(last.checkOutDate, { day: '2-digit', month: '2-digit' })}`
                    : '—'}
                </td>
                <td data-label="Statut" className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.badge}`}>{st.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
