'use client'

import { useEditorStore } from '@/store/useEditorStore'
import { useCanvasStore } from '@/store/useCanvasStore'
import type { CanvasObject } from '@/types/canvas'

export function RightPanel() {
  const { selectedIds } = useEditorStore()
  const { objects, upsertObject } = useCanvasStore()

  const selected = selectedIds.length === 1 ? objects.get(selectedIds[0]) : null

  return (
    <div className="w-56 flex flex-col bg-panel border-l border-border text-foreground text-sm">
      <div className="px-3 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Properties
      </div>

      {!selected ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-xs text-center px-3">Select an element to edit its properties</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Name</label>
            <input
              value={selected.name}
              onChange={(e) => upsertObject({ ...selected, name: e.target.value })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
            />
          </div>

          {/* Position */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Position</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">X</span>
                <input
                  type="number"
                  value={Math.round(selected.x)}
                  onChange={(e) => upsertObject({ ...selected, x: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Y</span>
                <input
                  type="number"
                  value={Math.round(selected.y)}
                  onChange={(e) => upsertObject({ ...selected, y: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Size</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">W</span>
                <input
                  type="number"
                  value={Math.round(selected.width)}
                  onChange={(e) => upsertObject({ ...selected, width: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">H</span>
                <input
                  type="number"
                  value={Math.round(selected.height)}
                  onChange={(e) => upsertObject({ ...selected, height: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
                />
              </div>
            </div>
          </div>

          {/* Fill */}
          {'fill' in selected && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Fill</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(selected as any).fill || '#000000'}
                  onChange={(e) => upsertObject({ ...selected, fill: e.target.value } as CanvasObject)}
                  className="w-8 h-7 rounded cursor-pointer border border-border bg-transparent"
                />
                <input
                  value={(selected as any).fill || ''}
                  onChange={(e) => upsertObject({ ...selected, fill: e.target.value } as CanvasObject)}
                  className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
                />
              </div>
            </div>
          )}

          {/* Opacity */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Opacity</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selected.opacity}
                onChange={(e) => upsertObject({ ...selected, opacity: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {Math.round(selected.opacity * 100)}%
              </span>
            </div>
          </div>

          {/* Text properties */}
          {selected.type === 'text' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Content</label>
                <textarea
                  value={selected.text}
                  onChange={(e) => upsertObject({ ...selected, text: e.target.value })}
                  rows={3}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Font Size</label>
                <input
                  type="number"
                  value={selected.fontSize}
                  onChange={(e) => upsertObject({ ...selected, fontSize: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
