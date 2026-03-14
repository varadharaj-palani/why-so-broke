export const CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transport', 'Fuel', 'Rent', 'Utilities',
  'Shopping', 'Entertainment', 'Health', 'Education', 'Subscriptions',
  'Insurance', 'EMI/Loans', 'Investments', 'Salary', 'Freelance', 'Transfers', 'Other',
]

export const MODES = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'NEFT/IMPS']

export const TYPES = ['expense', 'income', 'transfer']

export const TYPE_COLORS: Record<string, string> = {
  expense: 'text-red-600',
  income: 'text-green-600',
  transfer: 'text-blue-600',
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f97316',
  'Groceries': '#84cc16',
  'Transport': '#06b6d4',
  'Fuel': '#eab308',
  'Rent': '#8b5cf6',
  'Utilities': '#64748b',
  'Shopping': '#ec4899',
  'Entertainment': '#a855f7',
  'Health': '#ef4444',
  'Education': '#3b82f6',
  'Subscriptions': '#14b8a6',
  'Insurance': '#f59e0b',
  'EMI/Loans': '#dc2626',
  'Investments': '#22c55e',
  'Salary': '#10b981',
  'Freelance': '#6366f1',
  'Transfers': '#94a3b8',
  'Other': '#9ca3af',
}
