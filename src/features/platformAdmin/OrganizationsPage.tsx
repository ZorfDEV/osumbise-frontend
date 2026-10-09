import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrganizations } from './api';
import { OrganizationSummary } from './types';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import { Pagination, usePagination } from '@/components/ui/pagination';

const STATUS_STYLES: Record<string, string> = {
  TRIAL: 'bg-warning-soft text-warning-dark',
  ACTIVE: 'bg-success-soft text-success-dark',
  PAST_DUE: 'bg-danger-soft text-danger-dark',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAST_DUE: 'Paiement en retard',
  CANCELLED: 'Annulé',
};

const formatFcfa = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations().then((data) => {
      setOrganizations(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchOrganizations(search || undefined).then(setOrganizations);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const pager = usePagination(organizations);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-heading">Organisations</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou email..."
        className="input mb-4 w-full max-w-sm"
      />

      {isLoading ? (
        <ListSkeleton />
      ) : (
      <>
        {/* Ancre : le changement de page ramène ici, sous la barre du haut */}
        <div ref={pager.anchorRef} aria-hidden="true" className="scroll-mt-20" />
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
          <table className="table-cards w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Organisation</th>
                <th className="px-4 py-2 font-medium">Propriétaire</th>
                <th className="px-4 py-2 font-medium">Formule</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium">Établissements</th>
                <th className="px-4 py-2 font-medium">Renouvellement</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pager.pageItems.map((org) => {
                const owner = org.users[0];
                return (
                  <tr key={org.id}>
                    <td data-label="Organisation" className="px-4 py-2 font-medium text-slate-900">{org.name}</td>
                    <td data-label="Propriétaire" className="px-4 py-2 text-slate-600">
                      {owner ? (
                        <>
                          {owner.name}
                          {!owner.isActive && (
                            <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-dark">
                              Suspendu
                            </span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td data-label="Formule" className="px-4 py-2 text-slate-600">
                      {org.subscription
                        ? `${org.subscription.plan.name} — ${formatFcfa(Number(org.subscription.plan.price))}`
                        : '—'}
                    </td>
                    <td data-label="Statut" className="px-4 py-2">
                      {org.subscription ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[org.subscription.status]}`}
                        >
                          {STATUS_LABELS[org.subscription.status]}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Aucun</span>
                      )}
                    </td>
                    <td data-label="Établissements" className="px-4 py-2 text-slate-600">
                      {org._count.establishments}
                    </td>
                    <td data-label="Renouvellement" className="px-4 py-2 text-slate-600">
                      {org.subscription
                        ? new Date(org.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td data-label="" className="px-4 py-2 text-right">
                      <Link
                        to={`/platform-admin/organizations/${org.id}`}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        Gérer
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState compact icon={Building2} title="Aucune organisation" description="Les organisations inscrites apparaîtront ici." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pager.page}
          pageCount={pager.pageCount}
          pageSize={pager.pageSize}
          total={pager.total}
          onPageChange={pager.goTo}
          onPageSizeChange={pager.setPageSize}
          itemLabel="organisations"
        />
      </>
      )}
    </div>
  );
}
