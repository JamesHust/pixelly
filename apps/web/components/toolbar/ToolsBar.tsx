'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import type { Tool } from '@/types/canvas'
import {
  MousePointer2, Hand, Frame, Square, Circle, Type, PenTool, MessageSquare,
  Minus, ArrowUpRight, Pentagon, Star, Image, ChevronRight, Check,
} from 'lucide-react'

// ── Icon helper ────────────────────────────────────────────────

function toolIcon(id: Tool, size = 16) {
  switch (id) {
    case 'select':  return <MousePointer2 size={size} />
    case 'hand':    return <Hand size={size} />
    case 'frame':   return <Frame size={size} />
    case 'rect':    return <Square size={size} />
    case 'ellipse': return <Circle size={size} />
    case 'text':    return <Type size={size} />
    case 'line':    return <Minus size={size} />
    case 'arrow':   return <ArrowUpRight size={size} />
    case 'polygon': return <Pentagon size={size} />
    case 'star':    return <Star size={size} />
    case 'image':   return <Image size={size} />
    case 'pen':     return <PenTool size={size} />
    case 'comment': return <MessageSquare size={size} />
    default:        return <Square size={size} />
  }
}

// ── Shape submenu definition ───────────────────────────────────

interface ShapeEntry {
  id: Tool
  label: string
  shortcut?: string
}

const SHAPE_TOOLS: ShapeEntry[] = [
  { id: 'rect',    label: 'Rectangle', shortcut: 'R' },
  { id: 'line',    label: 'Line',      shortcut: 'L' },
  { id: 'arrow',   label: 'Arrow',     shortcut: 'Shift+L' },
  { id: 'ellipse', label: 'Ellipse',   shortcut: 'O' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'star',    label: 'Star' },
]

const SHAPE_TOOL_IDS = new Set<Tool>(SHAPE_TOOLS.map((t) => t.id))

// ── Keyboard shortcuts map ─────────────────────────────────────

// [key, shiftRequired, ctrlRequired] → tool
const SHORTCUTS: Array<[string, boolean, boolean, Tool]> = [
  ['v', false, false, 'select'],
  ['h', false, false, 'hand'],
  ['f', false, false, 'frame'],
  ['r', false, false, 'rect'],
  ['l', false, false, 'line'],
  ['l', true,  false, 'arrow'],  // Shift+L
  ['o', false, false, 'ellipse'],
  ['t', false, false, 'text'],
  ['p', false, false, 'pen'],
  ['c', false, false, 'comment'],
]

// ── ToolsBar ───────────────────────────────────────────────────

export function ToolsBar() {
  const { activeTool, setActiveTool } = useEditorStore()
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false)
  const shapeMenuRef = useRef<HTMLDivElement>(null)

  // The "active" shape tool shown in the collapsed button
  const activeShapeTool: Tool = SHAPE_TOOL_IDS.has(activeTool)
    ? activeTool
    : 'rect'

  // Close shape menu on outside click
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setShapeMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return

      const key = e.key.toLowerCase()
      const shift = e.shiftKey
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+Shift+K → image
      if (ctrl && shift && key === 'k') {
        e.preventDefault()
        setActiveTool('image')
        return
      }

      for (const [k, needShift, needCtrl, tool] of SHORTCUTS) {
        if (key === k && shift === needShift && ctrl === needCtrl) {
          e.preventDefault()
          setActiveTool(tool)
          setShapeMenuOpen(false)
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setActiveTool])

  const btnClass = (active: boolean) =>
    `p-2 rounded-lg transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
    }`

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 p-1 rounded-xl bg-panel border border-border shadow-lg select-none">
      {/* Select */}
      <button
        title="Select (V)"
        onClick={() => setActiveTool('select')}
        className={btnClass(activeTool === 'select')}
      >
        <MousePointer2 size={16} />
      </button>

      {/* Hand */}
      <button
        title="Hand (H)"
        onClick={() => setActiveTool('hand')}
        className={btnClass(activeTool === 'hand')}
      >
        <Hand size={16} />
      </button>

      <div className="w-full h-px bg-border my-0.5" />

      {/* Frame */}
      <button
        title="Frame (F)"
        onClick={() => setActiveTool('frame')}
        className={btnClass(activeTool === 'frame')}
      >
        <Frame size={16} />
      </button>

      {/* Shapes group — collapsed button + flyout submenu */}
      <div ref={shapeMenuRef} className="relative">
        <button
          title={`${SHAPE_TOOLS.find((t) => t.id === activeShapeTool)?.label ?? 'Shapes'}`}
          onClick={() => {
            if (SHAPE_TOOL_IDS.has(activeTool)) {
              // Already on a shape tool → toggle menu
              setShapeMenuOpen((o) => !o)
            } else {
              // Not on any shape tool → activate last-used shape & open menu
              setActiveTool(activeShapeTool)
              setShapeMenuOpen(true)
            }
          }}
          className={`${btnClass(SHAPE_TOOL_IDS.has(activeTool))} relative flex items-center justify-center`}
        >
          {toolIcon(activeShapeTool)}
          {/* Tiny chevron indicator */}
          <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-50">
            <ChevronRight size={8} />
          </span>
        </button>

        {/* Flyout submenu */}
        {shapeMenuOpen && (
          <div className="absolute left-full top-0 ml-2 w-44 rounded-xl bg-panel border border-border shadow-xl py-1 z-50">
            {SHAPE_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id)
                  setShapeMenuOpen(false)
                }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <span className="w-4 flex items-center justify-center">
                  {activeTool === tool.id
                    ? <Check size={12} className="text-primary" />
                    : toolIcon(tool.id, 14)}
                </span>
                <span className="flex-1 text-left">{tool.label}</span>
                {tool.shortcut && (
                  <span className="text-xs text-muted-foreground/60 shrink-0">
                    {tool.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text */}
      <button
        title="Text (T)"
        onClick={() => setActiveTool('text')}
        className={btnClass(activeTool === 'text')}
      >
        <Type size={16} />
      </button>

      {/* Pen */}
      <button
        title="Pen (P)"
        onClick={() => setActiveTool('pen')}
        className={btnClass(activeTool === 'pen')}
      >
        <PenTool size={16} />
      </button>

      <div className="w-full h-px bg-border my-0.5" />

      {/* Image — Ctrl+Shift+K */}
      <button
        title="Image / Video (Ctrl+Shift+K)"
        onClick={() => setActiveTool('image')}
        className={btnClass(activeTool === 'image')}
      >
        <Image size={16} />
      </button>

      {/* Comment */}
      <button
        title="Comment (C)"
        onClick={() => setActiveTool('comment')}
        className={btnClass(activeTool === 'comment')}
      >
        <MessageSquare size={16} />
      </button>
    </div>
  )
}
