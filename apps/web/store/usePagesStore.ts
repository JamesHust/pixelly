import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Page {
  id: string
  name: string
}

interface PagesState {
  pages: Page[]
  currentPageId: string
  addPage: () => void
  renamePage: (id: string, name: string) => void
  deletePage: (id: string) => void
  setCurrentPage: (id: string) => void
}

const initialPageId = uuidv4()

export const usePagesStore = create<PagesState>((set, get) => ({
  pages: [{ id: initialPageId, name: 'Page 1' }],
  currentPageId: initialPageId,

  addPage: () => {
    const id = uuidv4()
    const count = get().pages.length + 1
    set((state) => ({
      pages: [...state.pages, { id, name: `Page ${count}` }],
      currentPageId: id,
    }))
  },

  renamePage: (id, name) =>
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, name } : p)),
    })),

  deletePage: (id) =>
    set((state) => {
      if (state.pages.length <= 1) return state
      const pages = state.pages.filter((p) => p.id !== id)
      const currentPageId =
        state.currentPageId === id ? pages[0].id : state.currentPageId
      return { pages, currentPageId }
    }),

  setCurrentPage: (id) => set({ currentPageId: id }),
}))
