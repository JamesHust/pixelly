import { create } from 'zustand'
import type { CanvasObject } from '@/types/canvas'

const MAX_HISTORY = 100

interface CanvasState {
  objects: Map<string, CanvasObject>
  past: Map<string, CanvasObject>[]
  future: Map<string, CanvasObject>[]
  // Load from server — does NOT push to history
  setObjects: (objects: Map<string, CanvasObject>) => void
  upsertObject: (obj: CanvasObject) => void
  removeObject: (id: string) => void
  undo: () => void
  redo: () => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  objects: new Map(),
  past: [],
  future: [],

  setObjects: (objects) => set({ objects, past: [], future: [] }),

  upsertObject: (obj) =>
    set((state) => {
      const next = new Map(state.objects)
      next.set(obj.id, obj)
      const past = [...state.past, state.objects].slice(-MAX_HISTORY)
      return { objects: next, past, future: [] }
    }),

  removeObject: (id) =>
    set((state) => {
      const next = new Map(state.objects)
      next.delete(id)
      const past = [...state.past, state.objects].slice(-MAX_HISTORY)
      return { objects: next, past, future: [] }
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      const past = state.past.slice(0, -1)
      const future = [state.objects, ...state.future].slice(0, MAX_HISTORY)
      return { objects: previous, past, future }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state
      const next = state.future[0]
      const future = state.future.slice(1)
      const past = [...state.past, state.objects].slice(-MAX_HISTORY)
      return { objects: next, past, future }
    }),
}))
