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

// Color palettes for category chips — assigned deterministically by name hash
// so any new DB category automatically gets a consistent color without hardcoding.
const CHIP_PALETTES = [
  { bg: '#e6f1fb', border: '#b5d4f4', text: '#0C447C' },
  { bg: '#faeeda', border: '#fac775', text: '#633806' },
  { bg: '#fbeaf0', border: '#f4c0d1', text: '#72243E' },
  { bg: '#eeedfe', border: '#afa9ec', text: '#3C3489' },
  { bg: '#e1f5ee', border: '#9FE1CB', text: '#085041' },
  { bg: '#eaf3de', border: '#c0dd97', text: '#27500A' },
  { bg: '#f1efe8', border: '#d3d1c7', text: '#444441' },
  { bg: '#fcebeb', border: '#f7c1c1', text: '#791F1F' },
]

// Solid chart fill colors — same deterministic approach
const CHART_COLORS = [
  '#6b7fa3', '#8b9fbe', '#7a9e8a', '#a09070', '#8888aa',
  '#7ab8a0', '#b07a8a', '#9090c0', '#a0b07a', '#c09060',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash)
}

export function getCategoryChip(name: string) {
  return CHIP_PALETTES[hashString(name) % CHIP_PALETTES.length]
}

export function getCategoryColor(name: string): string {
  return CHART_COLORS[hashString(name) % CHART_COLORS.length]
}
