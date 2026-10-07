import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from './api';
import { Category } from './types';
import { useToast } from '@/lib/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Tags } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function CategoriesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );

  const load = () => {
    setIsLoading(true);
    fetchCategories()
      .then(setCategories)
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
    if (!newName.trim()) return;
    setError(null);
    await createCategory(newName.trim(), establishmentId);
    toast.success('Catégorie créée');
    setNewName('');
    load();
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditingName(c.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await updateCategory(editingId, editingName.trim());
    toast.success('Catégorie modifiée');
    setEditingId(null);
    load();
  };

  // Pas de fenêtre de confirmation : l'élément disparaît tout de suite et la
  // suppression n'est envoyée qu'après 5 s, sauf clic sur "Annuler".
  const handleDelete = (c: Category) => {
    setError(null);
    const index = categories.findIndex((x) => x.id === c.id);
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
    toast.undoable(`Catégorie « ${c.name} » supprimée`, {
      // Remis à sa place d'origine, sans recharger la liste
      onUndo: () => setCategories((prev) => [...prev.slice(0, index), c, ...prev.slice(index)]),
      onCommit: async () => {
        try {
          await deleteCategory(c.id);
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
    <div className="max-w-xl">
      <Breadcrumbs items={[{ label: 'Produits', to: '/products' }, { label: 'Catégories' }]} />

      <h1 className="mb-4 text-2xl font-semibold text-heading">Catégories</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Nouvelle catégorie"
          className="input flex-1"
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
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td data-label="Nom" className="px-4 py-2">
                    {editingId === c.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                        className="input input-sm"
                      />
                    ) : (
                      <span className="text-slate-900">{c.name}</span>
                    )}
                  </td>
                  <td data-label="" className="px-4 py-2 text-right">
                    {editingId === c.id ? (
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
                          onClick={() => startEdit(c)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="text-xs font-medium text-slate-500 hover:text-danger"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <EmptyState compact icon={Tags} title="Aucune catégorie" description="Créez une catégorie avec le champ ci-dessus pour organiser vos produits." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Une catégorie encore utilisée par au moins un produit ne peut pas être supprimée — il
        faut d’abord changer la catégorie de ces produits ou les désactiver.
      </p>
    </div>
  );
}
