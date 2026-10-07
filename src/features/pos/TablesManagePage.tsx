import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchTables, createTable, updateTable, deleteTable } from './api';
import { DiningTable, TABLE_STATUS_LABELS } from './types';
import { useToast } from '@/lib/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { LayoutGrid } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function TablesManagePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newZone, setNewZone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editZone, setEditZone] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    fetchTables()
      .then(setTables)
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
    if (!newLabel.trim()) return;
    setError(null);
    try {
      await createTable({
        label: newLabel.trim(),
        zone: newZone.trim() || undefined,
        establishmentId,
      });
      setNewLabel('');
      setNewZone('');
      toast.success('Table créée');
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur lors de la création';
      setError(message);
      toast.error(message);
    }
  };

  const startEdit = (t: DiningTable) => {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditZone(t.zone ?? '');
  };

  const saveEdit = async () => {
    if (!editingId || !editLabel.trim()) return;
    await updateTable(editingId, { label: editLabel.trim(), zone: editZone.trim() || undefined });
    toast.success('Table modifiée');
    setEditingId(null);
    load();
  };

  // Pas de fenêtre de confirmation : l'élément disparaît tout de suite et la
  // suppression n'est envoyée qu'après 5 s, sauf clic sur "Annuler".
  const handleDelete = (t: DiningTable) => {
    setError(null);
    const index = tables.findIndex((x) => x.id === t.id);
    setTables((prev) => prev.filter((x) => x.id !== t.id));
    toast.undoable(`Table « ${t.label} » supprimée`, {
      // Remis à sa place d'origine, sans recharger la liste
      onUndo: () => setTables((prev) => [...prev.slice(0, index), t, ...prev.slice(index)]),
      onCommit: async () => {
        try {
          await deleteTable(t.id);
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
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: 'Point de vente', to: '/tables' }, { label: 'Gérer les tables' }]} />

      <h1 className="mb-4 text-2xl font-semibold text-heading">Gérer les tables</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nom (ex. T01)"
          className="input"
        />
        <input
          value={newZone}
          onChange={(e) => setNewZone(e.target.value)}
          placeholder="Zone (optionnel)"
          className="input"
        />
        <button
          onClick={handleCreate}
          className="btn btn-primary"
        >
          Ajouter
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
          <table className="table-cards w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nom</th>
                <th className="px-4 py-2 font-medium">Zone</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tables.map((t) => (
                <tr key={t.id}>
                  <td data-label="Nom" className="px-4 py-2">
                    {editingId === t.id ? (
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="input input-sm w-24"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{t.label}</span>
                    )}
                  </td>
                  <td data-label="Zone" className="px-4 py-2 text-slate-600">
                    {editingId === t.id ? (
                      <input
                        value={editZone}
                        onChange={(e) => setEditZone(e.target.value)}
                        className="input input-sm w-24"
                      />
                    ) : (
                      t.zone ?? '—'
                    )}
                  </td>
                  <td data-label="Statut" className="px-4 py-2 text-slate-600">{TABLE_STATUS_LABELS[t.status]}</td>
                  <td data-label="" className="px-4 py-2 text-right">
                    {editingId === t.id ? (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={saveEdit}
                          className="text-xs font-medium text-slate-900 hover:underline"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-slate-500 hover:text-slate-600"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(t)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="text-xs font-medium text-slate-500 hover:text-danger"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {tables.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState compact icon={LayoutGrid} title="Aucune table" description="Ajoutez vos tables avec le formulaire ci-dessus pour prendre les commandes à table." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Suppression impossible pour une table occupée ou déjà utilisée dans au moins une commande
        (même ancienne) — désactive plutôt son usage en pratique si besoin.
      </p>
    </div>
  );
}
