export interface User {
  id: string
  username: string
  display_name: string | null
  created_at: string
}

export interface Bank {
  id: string
  name: string
  short_code: string | null
  is_active: boolean
  is_archived: boolean
  created_at: string
}

export interface Transaction {
  id: string
  date: string
  type: 'expense' | 'income' | 'transfer'
  description: string
  category: string
  amount: string
  bank_id: string | null
  bank: { id: string; name: string; short_code: string | null } | null
  transfer_to_bank_id: string | null
  transfer_to_bank: { id: string; name: string; short_code: string | null } | null
  transfer_group_id: string | null
  mode: string
  notes: string | null
  import_job_id: string | null
  created_at: string
  updated_at: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  page: number
  pages: number
}

export interface UnverifiedTransaction {
  id: string
  import_job_id: string
  date: string | null
  type: string | null
  description: string | null
  category: string | null
  amount: string | null
  bank_id: string | null
  bank: { id: string; name: string; short_code: string | null } | null
  transfer_to_bank_id: string | null
  mode: string | null
  raw_text: string | null
  confidence: string | null
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
  verified_at: string | null
}

export interface UnverifiedListResponse {
  items: UnverifiedTransaction[]
  total: number
  page: number
  pages: number
}

export interface ImportJob {
  id: string
  filename: string
  bank_hint: string | null
  llm_provider: string | null
  status: 'processing' | 'extracting' | 'mapping' | 'completed' | 'failed'
  total_rows: number | null
  parsed_rows: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
  fully_extracted: number
  pending_verification: number
}

export interface CategoryItem {
  id: string
  name: string
  created_at: string
}

export interface ModeItem {
  id: string
  name: string
  created_at: string
}

export interface Budget {
  id: string
  category: string
  month: string | null
  start_date: string | null
  end_date: string | null
  cycle_days: number | null
  amount: string
  created_at: string
  updated_at: string
}

export interface BudgetProgress {
  category: string
  budget_amount: string
  spent_amount: string
  percentage: number
  current_cycle_start: string
  current_cycle_end: string
}

export interface DailySpendItem {
  date: string
  total: string
}

export interface Summary {
  total_income: string
  total_expense: string
  net: string
  transaction_count: number
}

export interface CategoryBreakdown {
  category: string
  total: string
}

export interface MonthlyTrendItem {
  month: string
  income: string
  expense: string
}

export interface ModeBreakdown {
  mode: string
  total: string
}

export interface ActivityLog {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface Constants {
  categories: string[]
  modes: string[]
  types: string[]
}

export interface BankBalance {
  bank_id: string
  bank_name: string
  short_code: string | null
  total_balance: string
  jar_locked: string
  available: string
}

export interface BankBreakdown {
  bank_id: string | null
  bank_name: string | null
  total: string
}

export interface Jar {
  id: string
  name: string
  description: string | null
  target_amount: string | null
  color: string | null
  is_archived: boolean
  balance: string
  bank_breakdown: BankBreakdown[]
  created_at: string
  updated_at: string
}

export interface JarContribution {
  id: string
  jar_id: string
  bank_id: string | null
  bank_name: string | null
  amount: string
  date: string
  notes: string | null
  created_at: string
}

export interface Filters {
  date_from?: string
  date_to?: string
  amount_min?: string
  amount_max?: string
  category?: string
  bank_id?: string
  mode?: string
  type?: string
  description?: string
  import_job_id?: string
}
