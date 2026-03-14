import { create } from 'zustand'
import { Filters } from '../types'

interface FilterStore {
  filters: Filters
  setFilter: (key: keyof Filters, value: string | undefined) => void
  setFilters: (filters: Filters) => void
  clearFilters: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: {},
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value || undefined },
    })),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}))
