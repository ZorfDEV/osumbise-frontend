export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  amount: string;
  note: string | null;
  createdAt: string;
  expenseCategory: { name: string };
  user: { name: string } | null;
}
