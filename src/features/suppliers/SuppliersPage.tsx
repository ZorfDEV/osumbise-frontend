import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from './api';
import { Supplier } from './types';
import { useToast } from '@/lib/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Truck } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';

export default function SuppliersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    fetchSuppliers()
      .then(setSuppliers)
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
    await createSupplier({
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      establishmentId,
    });
    toast.success('Fournisseur créé');
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setShowForm(false);
    load();
  };

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditPhone(s.phone ?? '');
    setEditEmail(s.email ?? '');
    setEditAddress(s.address ?? '');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateSupplier(editingId, {
      name: editName.trim(),
      phone: editPhone || undefined,
      email: editEmail || undefined,
      address: editAddress || undefined,
    });
    toast.success('Fournisseur modifié');
    setEditingId(null);
    load();
  };

  // Pas de fenêtre de confirmation : l'élément disparaît tout de suite et la
  // suppression n'est envoyée qu'après 5 s, sauf clic sur "Annuler".
  const handleDelete = (s: Supplier) => {
    setError(null);
    const index = suppliers.findIndex((x) => x.id === s.id);
    setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
    toast.undoable(`Fournisseur « ${s.name} » supprimé`, {
      // Remis à sa place d'origine, sans recharger la liste
      onUndo: () => setSuppliers((prev) => [...prev.slice(0, index), s, ...prev.slice(index)]),
      onCommit: async () => {
        try {
          await deleteSupplier(s.id);
        } catch (err) {
          const message =
            (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Erreur lors de la suppression';
          setError(message);
          toast.error(message);
          load();
        }
      },
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-heading">Fournisseurs</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn btn-primary"
        >
          {showForm ? 'Annuler' : 'Nouveau fournisseur'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-surface p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Adresse</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input w-full"
            />
          </div>
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

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-surface p-4">
              {editingId === s.id ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nom"
                    className="input"
                  />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Téléphone"
                    className="input"
                  />
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="input"
                  />
                  <input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Adresse"
                    className="input"
                  />
                  <div className="flex gap-3 sm:col-span-2">
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
                  <div>
                    <Link
                      to={`/purchase-orders?supplierId=${s.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {[s.phone, s.email, s.address].filter(Boolean).join(' — ') ||
                        'Aucun détail'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-xs font-medium text-slate-500 hover:text-danger"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {suppliers.length === 0 && (
            <EmptyState icon={Truck} title="Aucun fournisseur pour l’instant" description="Ajoutez vos fournisseurs pour créer des commandes d’achat." action={{ label: 'Ajouter un fournisseur', onClick: () => setShowForm(true) }} />
          )}
        </div>
      )}
    </div>
  );
}
