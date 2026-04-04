'use client'

import { useEffect } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { useCanvasStore } from '@/store/useCanvasStore'
import type { Tool } from '@/types/canvas'

const SHORTCUT_MAP: Record<string, Tool> = {
  v: 'select',
  h: 'hand',
  f: 'frame',
  r: 'rect',
  o: 'ellipse',
  t: 'text',
  l: 'line',
  p: 'pen',
  c: 'comment',
}

export function useKeyboardShortcuts() {
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const setZoom = useEditorStore((s) => s.setZoom)
  const zoom = useEditorStore((s) => s.zoom)
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toLowerCase()

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y
      if (((e.ctrlKey || e.metaKey) && key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // Tool shortcuts
      if (SHORTCUT_MAP[key] && !e.ctrlKey && !e.metaKey) {
        setActiveTool(SHORTCUT_MAP[key])
        return
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (key === '=' || key === '+')) {
        e.preventDefault()
        setZoom(zoom * 1.2)
      }
      if ((e.ctrlKey || e.metaKey) && key === '-') {
        e.preventDefault()
        setZoom(zoom / 1.2)
      }
      if ((e.ctrlKey || e.metaKey) && key === '0') {
        e.preventDefault()
        setZoom(1)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [zoom, setActiveTool, setZoom, undo, redo])
}
