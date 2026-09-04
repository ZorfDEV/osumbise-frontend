import { api } from '@/lib/axios';
import { ExpenseCategory, Expense } from './types';

export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const res = await api.get('/expense-categories');
  return res.data.categories;
};

export const createExpenseCategory = async (
  name: string,
  establishmentId?: string
): Promise<ExpenseCategory> => {
  const res = await api.post('/expense-categories', { name, establishmentId });
  return res.data.category;
};

export const fetchExpenses = async (): Promise<Expense[]> => {
  const res = await api.get('/expenses');
  return res.data.expenses;
};

export const createExpense = async (payload: {
  expenseCategoryId: string;
  amount: number;
  note?: string;
  establishmentId?: string;
}): Promise<Expense> => {
  const res = await api.post('/expenses', payload);
  return res.data.expense;
};
