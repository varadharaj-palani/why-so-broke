import { create } from 'zustand'
import { Filters } from '../types'
import dayjs from 'dayjs'

interface FilterStore {
  filters: Filters
  setFilter: (key: keyof Filters, value: string | undefined) => void
  setFilters: (filters: Filters) => void
  clearFilters: () => void
}

const today = dayjs()
const defaultFilters: Filters = {
  date_from: today.startOf('month').format('YYYY-MM-DD'),
  date_to: today.format('YYYY-MM-DD'),
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value || undefined },
    })),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}))
