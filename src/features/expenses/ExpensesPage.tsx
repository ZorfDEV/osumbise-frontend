import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import {
  fetchExpenseCategories,
  createExpenseCategory,
  fetchExpenses,
  createExpense,
} from './api';
import { ExpenseCategory, Expense } from './types';
import { useToast } from '@/lib/toast';

const formatFcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

export default function ExpensesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );

  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([fetchExpenseCategories(), fetchExpenses()])
      .then(([cats, exp]) => {
        setCategories(cats);
        setExpenses(exp);
      })
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await createExpenseCategory(newCategoryName.trim(), establishmentId);
    toast.success('Catégorie créée');
    setNewCategoryName('');
    setShowCategoryForm(false);
    load();
  };

  const handleAddExpense = async () => {
    if (!expenseCategoryId || amount <= 0) return;
    setError(null);
    try {
      await createExpense({
        expenseCategoryId,
        amount,
        note: note || undefined,
        establishmentId,
      });
      toast.success('Dépense enregistrée');
      setAmount(0);
      setNote('');
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur';
      setError(message);
      toast.error(message);
    }
  };

  // Total par catégorie sur le mois en cours, pour retrouver l'esprit de
  // l'exemple du document (Électricité 150 000, Eau 50 000...)
  const now = new Date();
  const monthTotals = new Map<string, number>();
  for (const e of expenses) {
    const d = new Date(e.createdAt);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      monthTotals.set(
        e.expenseCategory.name,
        (monthTotals.get(e.expenseCategory.name) ?? 0) + Number(e.amount)
      );
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Dépenses</h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <span
            key={c.id}
            className="whitespace-nowrap rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {c.name}
          </span>
        ))}
        <button
          onClick={() => setShowCategoryForm((s) => !s)}
          className="whitespace-nowrap rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
        >
          + Nouvelle catégorie
        </button>
      </div>

      {showCategoryForm && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Ex. Électricité"
            autoFocus
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddCategory}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Ajouter
          </button>
          <button
            onClick={() => setShowCategoryForm(false)}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Annuler
          </button>
        </div>
      )}

      {monthTotals.size > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Ce mois-ci, par catégorie</h2>
          <ul className="space-y-1 text-sm">
            {Array.from(monthTotals.entries()).map(([name, total]) => (
              <li key={name} className="flex justify-between text-slate-600">
                <span>{name}</span>
                <span className="font-medium text-slate-900">{formatFcfa(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Enregistrer une dépense</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={expenseCategoryId}
            onChange={(e) => setExpenseCategoryId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">— Catégorie —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Montant"
            className="w-32 rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnel)"
            className="flex-1 rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
          <button
            onClick={handleAddExpense}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Enregistrer
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Catégorie</th>
                <th className="px-4 py-2 font-medium">Montant</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(e.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-2 text-slate-900">{e.expenseCategory.name}</td>
                  <td className="px-4 py-2 text-slate-600">{formatFcfa(Number(e.amount))}</td>
                  <td className="px-4 py-2 text-slate-500">{e.note ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{e.user?.name ?? '—'}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Aucune dépense enregistrée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
