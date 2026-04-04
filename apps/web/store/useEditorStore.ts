import { create } from 'zustand'
import type { Tool } from '@/types/canvas'

interface EditorState {
  // Active tool
  activeTool: Tool
  setActiveTool: (tool: Tool) => void

  // Viewport
  zoom: number
  setZoom: (zoom: number) => void
  panX: number
  panY: number
  setPan: (x: number, y: number) => void

  // Selection
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  clearSelection: () => void

  // UI panels
  leftPanelTab: 'layers' | 'pages' | 'assets'
  setLeftPanelTab: (tab: 'layers' | 'pages' | 'assets') => void
  rightPanelTab: 'design' | 'prototype'
  setRightPanelTab: (tab: 'design' | 'prototype') => void
  isAIPanelOpen: boolean
  toggleAIPanel: () => void

  // Current page
  currentPageId: string | null
  setCurrentPageId: (id: string | null) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 10) }),
  panX: 0,
  panY: 0,
  setPan: (panX, panY) => set({ panX, panY }),

  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),

  leftPanelTab: 'layers',
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
  rightPanelTab: 'design',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  isAIPanelOpen: false,
  toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),

  currentPageId: null,
  setCurrentPageId: (id) => set({ currentPageId: id }),
}))
