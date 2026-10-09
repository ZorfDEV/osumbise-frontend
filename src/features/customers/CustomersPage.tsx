import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchCustomers, createCustomer, updateCustomer } from './api';
import { createOrder } from '@/features/pos/offlineApi';
import { Customer } from './types';
import { useToast } from '@/lib/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Users2 } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import { Pagination, usePagination } from '@/components/ui/pagination';

const formatFcfa = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

export default function CustomersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    fetchCustomers()
      .then(setCustomers)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    if (!user?.establishmentId) {
      api.get('/establishments').then((res) => {
        const list = res.data.establishments;
        if (list.length > 0) setEstablishmentId(list[0].id);
      });
    }
  }, [user]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      await createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        establishmentId,
      });
      toast.success('Client créé');
      setName('');
      setPhone('');
      setAddress('');
      setCreditLimit('');
      setShowForm(false);
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur lors de la création';
      setError(message);
      toast.error(message);
    }
  };

  const handleToggleActive = async (c: Customer) => {
    await updateCustomer(c.id, { isActive: !c.isActive });
    toast.success(c.isActive ? 'Client désactivé' : 'Client réactivé');
    load();
  };

  const handleNewSale = async (customerId?: string) => {
    const order = await createOrder({ establishmentId, customerId });
    navigate(`/pos/${order.id}`);
  };

  const pager = usePagination(customers);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-heading">Clients</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleNewSale()}
            className="btn btn-secondary"
          >
            Nouvelle vente (comptant)
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="btn btn-primary"
          >
            {showForm ? 'Annuler' : 'Nouveau client'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-surface p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Bar La Terrasse"
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Téléphone (optionnel)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Adresse (optionnel)
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Plafond de crédit (optionnel)
            </label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="Ex. 200000"
              className="input w-full"
            />
          </div>
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button
              onClick={handleCreate}
              className="btn btn-primary"
            >
              Créer
            </button>
          </div>
        </div>
      )}

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
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Téléphone</th>
                <th className="px-4 py-2 font-medium">Solde dû</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pager.pageItems.map((c) => (
                <tr key={c.id}>
                  <td data-label="Client" className="px-4 py-2">
                    <Link
                      to={`/customers/${c.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td data-label="Téléphone" className="px-4 py-2 text-slate-600">{c.phone ?? '—'}</td>
                  <td data-label="Solde dû" className="px-4 py-2">
                    <span
                      className={`font-medium ${Number(c.balance) > 0 ? 'text-danger' : 'text-slate-600'}`}
                    >
                      {formatFcfa(Number(c.balance))}
                    </span>
                    {c.creditLimit && (
                      <span className="ml-1 text-xs text-slate-500">
                        / {formatFcfa(Number(c.creditLimit))}
                      </span>
                    )}
                  </td>
                  <td data-label="Statut" className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive
                          ? 'bg-success-soft text-success-dark'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {c.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td data-label="" className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleNewSale(c.id)}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        Vendre
                      </button>
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900"
                      >
                        Relevé
                      </Link>
                      <button
                        onClick={() => handleToggleActive(c)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900"
                      >
                        {c.isActive ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState compact icon={Users2} title="Aucun client pour l’instant" description="Enregistrez vos clients pour leur vendre à crédit et suivre leurs règlements." action={{ label: 'Ajouter un client', onClick: () => setShowForm(true) }} />
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
          itemLabel="clients"
        />
      </>
      )}
    </div>
  );
}
