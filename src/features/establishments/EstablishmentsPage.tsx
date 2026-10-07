import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchEstablishments, createEstablishment, updateEstablishment } from './api';
import { Establishment, EstablishmentType } from './types';
import { useToast } from '@/lib/toast';
import { fetchSubscription } from '@/features/billing/api';
import PaySubscriptionButton from '@/features/billing/PaySubscriptionButton';
import { Subscription } from '@/features/billing/types';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';

const TYPE_LABELS: Record<EstablishmentType, string> = {
  BAR: 'Bar',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hôtel',
  GROSSISTE: 'Grossiste',
  EPICERIE: 'Épicerie',
};

export default function EstablishmentsPage() {
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<EstablishmentType>('BAR');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<EstablishmentType>('BAR');
  const [editAddress, setEditAddress] = useState('');
  const [editLogo, setEditLogo] = useState('');

  const load = () => {
    setIsLoading(true);
    fetchEstablishments()
      .then(setEstablishments)
      .finally(() => setIsLoading(false));
  };

  const loadSubscription = () => {
    fetchSubscription()
      .then(setSubscription)
      .catch(() => setSubscription(null));
  };

  useEffect(() => {
    load();
    loadSubscription();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createEstablishment({
      name: name.trim(),
      type,
      address: address.trim() || undefined,
      logo: logo.trim() || undefined,
    });
    toast.success('Établissement créé');
    setName('');
    setAddress('');
    setLogo('');
    setType('BAR');
    setShowForm(false);
    load();
  };

  const startEdit = (e: Establishment) => {
    setEditingId(e.id);
    setEditName(e.name);
    setEditType(e.type);
    setEditAddress(e.address ?? '');
    setEditLogo(e.logo ?? '');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateEstablishment(editingId, {
      name: editName.trim(),
      type: editType,
      address: editAddress.trim() || undefined,
      logo: editLogo.trim() || undefined,
    });
    toast.success('Établissement modifié');
    setEditingId(null);
    load();
    // Le nom/logo affiché dans la Topbar vient de /auth/me — on le rafraîchit
    // pour que le changement soit visible immédiatement, sans recharger la page
    refreshProfile();
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-heading">Établissements</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn btn-primary"
        >
          {showForm ? 'Annuler' : 'Nouvel établissement'}
        </button>
      </div>

      {subscription && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Formule {subscription.plan.name}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    subscription.status === 'TRIAL'
                      ? 'bg-warning-soft text-warning-dark'
                      : subscription.status === 'ACTIVE'
                        ? 'bg-success-soft text-success-dark'
                        : 'bg-danger-soft text-danger-dark'
                  }`}
                >
                  {subscription.status === 'TRIAL'
                    ? 'Essai'
                    : subscription.status === 'ACTIVE'
                      ? 'Actif'
                      : subscription.status === 'PAST_DUE'
                        ? 'Paiement en retard'
                        : 'Annulé'}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {subscription.status === 'TRIAL' ? "Fin de l'essai" : 'Prochain renouvellement'}{' '}
                le {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')} —{' '}
                {establishments.length}/
                {subscription.plan.maxEstablishments >= 999
                  ? '∞'
                  : subscription.plan.maxEstablishments}{' '}
                établissement{establishments.length > 1 ? 's' : ''} utilisé
                {establishments.length > 1 ? 's' : ''}
              </p>
            </div>
            {subscription.status !== 'ACTIVE' && (
              <PaySubscriptionButton
                amountLabel={`${Number(subscription.plan.price).toLocaleString('fr-FR')} FCFA`}
                onSuccess={loadSubscription}
              />
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-surface p-6 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EstablishmentType)}
              className="input w-full"
            >
              <option value="BAR">Bar</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="HOTEL">Hôtel</option>
              <option value="GROSSISTE">Grossiste</option>
              <option value="EPICERIE">Épicerie</option>
            </select>
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
          <div className="sm:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Logo (URL, optionnel)
            </label>
            <input
              type="url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
              className="input w-full"
            />
            <p className="mt-1 text-xs text-slate-500">
              Affiché dans l’en-tête de l’application et sur les factures imprimées.
            </p>
          </div>
          <div className="sm:col-span-3">
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
        <div className="space-y-3">
          {establishments.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-200 bg-surface p-4">
              {editingId === e.id ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    value={editName}
                    onChange={(ev) => setEditName(ev.target.value)}
                    className="input"
                  />
                  <select
                    value={editType}
                    onChange={(ev) => setEditType(ev.target.value as EstablishmentType)}
                    className="input"
                  >
                    <option value="BAR">Bar</option>
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="HOTEL">Hôtel</option>
                    <option value="GROSSISTE">Grossiste</option>
                    <option value="EPICERIE">Épicerie</option>
                  </select>
                  <input
                    value={editAddress}
                    onChange={(ev) => setEditAddress(ev.target.value)}
                    placeholder="Adresse"
                    className="input"
                  />
                  <input
                    type="url"
                    value={editLogo}
                    onChange={(ev) => setEditLogo(ev.target.value)}
                    placeholder="URL du logo"
                    className="input sm:col-span-3"
                  />
                  <div className="flex gap-3 sm:col-span-3">
                    <button
                      onClick={saveEdit}
                      className="text-sm font-medium text-slate-900 hover:underline"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-sm text-slate-500 hover:text-slate-600"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {e.logo ? (
                      <img src={e.logo} alt={e.name} className="h-9 w-9 rounded object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-100 text-sm font-semibold text-slate-500">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">
                        {TYPE_LABELS[e.type]}
                        {e.address ? ` — ${e.address}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(e)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </div>
          ))}
          {establishments.length === 0 && (
            <EmptyState icon={Building2} title="Aucun établissement" description="Ajoutez votre premier établissement avec le formulaire ci-dessus." />
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        La suppression d’un établissement n’est pas proposée : trop de données en dépendent
        (produits, tables, commandes, utilisateurs...). Il n’y a pas non plus de désactivation
        pour l’instant — à construire si le besoin se présente.
      </p>
    </div>
  );
}
