import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from './api';
import { Supplier } from './types';
import { useConfirm } from '@/lib/confirm';
import { useToast } from '@/lib/toast';

export default function SuppliersPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
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

  const handleDelete = async (s: Supplier) => {
    const ok = await confirm({
      title: 'Supprimer le fournisseur',
      message: `Supprimer le fournisseur "${s.name}" ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteSupplier(s.id);
      toast.success('Fournisseur supprimé');
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur lors de la suppression';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Fournisseurs</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? 'Annuler' : 'Nouveau fournisseur'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Adresse</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={handleCreate}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Créer
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
              {editingId === s.id ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nom"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Téléphone"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Adresse"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                      className="text-sm text-slate-400 hover:text-slate-600"
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
                      className="text-xs font-medium text-slate-400 hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {suppliers.length === 0 && (
            <p className="text-sm text-slate-400">Aucun fournisseur</p>
          )}
        </div>
      )}
    </div>
  );
}
