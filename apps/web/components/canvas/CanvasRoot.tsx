'use client'

import { Stage, Layer, Rect as KonvaRect, Line as KonvaLine } from 'react-konva'
import { useRef, useCallback, useEffect, useState } from 'react'
import type Konva from 'konva'
import { useEditorStore } from '@/store/useEditorStore'
import { useCanvasStore } from '@/store/useCanvasStore'
import { CanvasObject } from './CanvasObject'
import {
  createRect, createEllipse, createText, createFrame,
  createLine, createArrow, createPolygon, createStar,
  createPenPath,
} from '@/lib/canvas/shapes'
import type { CanvasObject as CanvasObjectType, FrameObject, ImageObject } from '@/types/canvas'
import { v4 as uuidv4 } from 'uuid'

const DRAW_TOOLS = new Set(['rect', 'ellipse', 'text', 'frame', 'line', 'arrow', 'polygon', 'star'])
const MIN_DRAG_SIZE = 4 // px in canvas-space; below this → place at default size

// Find the innermost frame containing a canvas-space point.
function findParentFrame(
  pos: { x: number; y: number },
  objects: Map<string, CanvasObjectType>,
  excludeId?: string,
): string | null {
  let candidate: FrameObject | null = null
  let candidateArea = Infinity

  for (const obj of objects.values()) {
    if (obj.type !== 'frame') continue
    if (excludeId && obj.id === excludeId) continue
    if (
      pos.x >= obj.x &&
      pos.x <= obj.x + obj.width &&
      pos.y >= obj.y &&
      pos.y <= obj.y + obj.height
    ) {
      const area = obj.width * obj.height
      if (area < candidateArea) {
        candidateArea = area
        candidate = obj
      }
    }
  }

  return candidate?.id ?? null
}

interface DrawState {
  tool: string
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface Props {
  projectId: string
  readOnly?: boolean
}

export function CanvasRoot({ projectId, readOnly = false }: Props) {
  const stageRef = useRef<Konva.Stage>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const skipNextClickRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingImagePosRef = useRef<{ x: number; y: number } | null>(null)
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isActivePanning, setIsActivePanning] = useState(false)
  const [drawing, setDrawing] = useState<DrawState | null>(null)

  // Pen tool state
  const penDrawRef = useRef<number[] | null>(null)
  const [penPoints, setPenPoints] = useState<number[] | null>(null)

  const activeTool = useEditorStore((s) => s.activeTool)
  const zoom = useEditorStore((s) => s.zoom)
  const panX = useEditorStore((s) => s.panX)
  const panY = useEditorStore((s) => s.panY)
  const { setZoom, setPan, selectedIds, setSelectedIds, clearSelection, setActiveTool } = useEditorStore()
  const { objects, upsertObject, removeObject } = useCanvasStore()

  // Resize stage to container
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Space key → temporary hand tool; Escape → cancel pen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpaceDown(true)
        return
      }

      if (e.key === 'Escape') {
        const { activeTool } = useEditorStore.getState()
        if (activeTool === 'pen' && penDrawRef.current !== null) {
          penDrawRef.current = null
          setPenPoints(null)
          useEditorStore.getState().setActiveTool('select')
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Wheel: Ctrl/Meta+scroll → zoom; plain scroll → pan
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      if (e.evt.ctrlKey || e.evt.metaKey) {
        const oldScale = stage.scaleX()
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        const direction = e.evt.deltaY < 0 ? 1 : -1
        const newScale = Math.min(Math.max(oldScale * Math.pow(1.1, direction), 0.05), 20)
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        }
        setZoom(newScale)
        setPan(pointer.x - mousePointTo.x * newScale, pointer.y - mousePointTo.y * newScale)
      } else {
        const dx = e.evt.shiftKey ? -e.evt.deltaY : -e.evt.deltaX
        const dy = e.evt.shiftKey ? 0 : -e.evt.deltaY
        setPan(stage.x() + dx, stage.y() + dy)
      }
    },
    [setZoom, setPan],
  )

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Skip the click that immediately follows completing a draw
      if (skipNextClickRef.current) {
        skipNextClickRef.current = false
        return
      }
      if (e.target === e.target.getStage()) clearSelection()
    },
    [clearSelection],
  )

  // ── Mouse down: start pan OR start drawing ──────────────────
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const isMiddleButton = e.evt.button === 1
      const isPanMode = activeTool === 'hand' || isSpaceDown || isMiddleButton

      if (isPanMode) {
        e.evt.preventDefault()
        isPanningRef.current = true
        lastPointerRef.current = { x: e.evt.clientX, y: e.evt.clientY }
        setIsActivePanning(true)
        return
      }

      if (readOnly) return

      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getRelativePointerPosition()
      if (!pos) return

      // Image tool: record position then open file picker
      if (activeTool === 'image') {
        pendingImagePosRef.current = pos
        fileInputRef.current?.click()
        return
      }

      // Comment tool: handled by CommentOverlay DOM layer
      if (activeTool === 'comment') return

      // Pen tool: collect points on each click
      if (activeTool === 'pen') {
        const current = penDrawRef.current ?? []
        const next = [...current, pos.x, pos.y]
        penDrawRef.current = next
        setPenPoints([...next])
        return
      }

      if (!DRAW_TOOLS.has(activeTool)) return

      setDrawing({ tool: activeTool, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
    },
    [activeTool, readOnly, isSpaceDown],
  )

  // ── Mouse move: update drawing preview ─────────────────────
  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!drawing) return
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getRelativePointerPosition()
      if (!pos) return
      setDrawing((prev) => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null)
    },
    [drawing],
  )

  // ── Mouse up: finalise shape ────────────────────────────────
  const handleStageMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!drawing) return

      const dx = drawing.currentX - drawing.startX
      const dy = drawing.currentY - drawing.startY
      const dragged = Math.abs(dx) >= MIN_DRAG_SIZE || Math.abs(dy) >= MIN_DRAG_SIZE

      // Normalise rect (support drawing in any direction)
      const x = dx >= 0 ? drawing.startX : drawing.currentX
      const y = dy >= 0 ? drawing.startY : drawing.currentY
      const width = Math.abs(dx)
      const height = Math.abs(dy)

      const parentId = findParentFrame({ x, y }, objects)

      let newObj: CanvasObjectType | null = null
      if (dragged) {
        switch (drawing.tool) {
          case 'rect':    newObj = { ...createRect(x, y, parentId), width, height }; break
          case 'ellipse': newObj = { ...createEllipse(x, y, parentId), width, height }; break
          case 'text':    newObj = { ...createText(x, y, parentId), width, height }; break
          case 'frame':   newObj = { ...createFrame(x, y, parentId), width, height }; break
          case 'polygon': newObj = { ...createPolygon(x, y, 6, 60, parentId), width, height }; break
          case 'star':    newObj = { ...createStar(x, y, 5, 60, 0.45, parentId), width, height }; break
          // Line/Arrow: store signed deltas directly (dx/dy, not normalised)
          case 'line':    newObj = createLine(drawing.startX, drawing.startY, dx, dy, parentId); break
          case 'arrow':   newObj = createArrow(drawing.startX, drawing.startY, dx, dy, parentId); break
        }
      } else {
        // Plain click → default size
        switch (drawing.tool) {
          case 'rect':    newObj = createRect(drawing.startX, drawing.startY, parentId);    break
          case 'ellipse': newObj = createEllipse(drawing.startX, drawing.startY, parentId); break
          case 'text':    newObj = createText(drawing.startX, drawing.startY, parentId);    break
          case 'frame':   newObj = createFrame(drawing.startX, drawing.startY, parentId);   break
          case 'polygon': newObj = createPolygon(drawing.startX, drawing.startY, 6, 60, parentId);          break
          case 'star':    newObj = createStar(drawing.startX, drawing.startY, 5, 60, 0.45, parentId);    break
          case 'line':    newObj = createLine(drawing.startX, drawing.startY, 150, 0, parentId);  break
          case 'arrow':   newObj = createArrow(drawing.startX, drawing.startY, 150, 0, parentId); break
        }
      }

      if (newObj) {
        upsertObject(newObj)
        setSelectedIds([newObj.id])
        useEditorStore.getState().setActiveTool('select')
        skipNextClickRef.current = true
      }

      setDrawing(null)
    },
    [drawing, objects, upsertObject, setSelectedIds],
  )

  // ── Double-click: finish pen path ───────────────────────────
  const handleStageDblClick = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      const { activeTool } = useEditorStore.getState()
      if (activeTool !== 'pen') return

      const pts = penDrawRef.current
      // dblclick fires mousedown twice; remove the extra last point pair
      const finalPts = pts && pts.length >= 4 ? pts.slice(0, pts.length - 2) : pts

      if (!finalPts || finalPts.length < 4) {
        // Not enough points — cancel
        penDrawRef.current = null
        setPenPoints(null)
        return
      }

      const { objects } = useCanvasStore.getState()
      const midPoint = { x: finalPts[0], y: finalPts[1] }
      const parentId = findParentFrame(midPoint, objects)
      const newObj = createPenPath(finalPts, parentId)
      upsertObject(newObj)
      setSelectedIds([newObj.id])
      penDrawRef.current = null
      setPenPoints(null)
      useEditorStore.getState().setActiveTool('select')
      skipNextClickRef.current = true
    },
    [upsertObject, setSelectedIds],
  )

  // Pan via mouse drag (window-level so drag outside canvas works)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !lastPointerRef.current) return
      const stage = stageRef.current
      if (!stage) return
      const dx = e.clientX - lastPointerRef.current.x
      const dy = e.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      setPan(stage.x() + dx, stage.y() + dy)
    }
    const onMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false
        setIsActivePanning(false)
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [setPan])

  // Prevent native scroll inside canvas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [])

  // Delete selected objects on Delete/Backspace
  useEffect(() => {
    if (readOnly) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const { selectedIds } = useEditorStore.getState()
      if (selectedIds.length === 0) return
      selectedIds.forEach((id) => removeObject(id))
      clearSelection()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [readOnly, removeObject, clearSelection])

  // Drawing preview geometry
  const previewRect = drawing
    ? {
        x: Math.min(drawing.startX, drawing.currentX),
        y: Math.min(drawing.startY, drawing.currentY),
        width: Math.abs(drawing.currentX - drawing.startX),
        height: Math.abs(drawing.currentY - drawing.startY),
      }
    : null

  const isPanMode = activeTool === 'hand' || isSpaceDown
  const isDrawMode = DRAW_TOOLS.has(activeTool) || activeTool === 'pen'
  const cursor = isActivePanning
    ? 'grabbing'
    : isPanMode
      ? 'grab'
      : isDrawMode
        ? 'crosshair'
        : 'default'

  const objectsArray = Array.from(objects.values())

  // Handle image file selection
  const handleImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      e.target.value = ''

      const pos = pendingImagePosRef.current ?? { x: 0, y: 0 }
      pendingImagePosRef.current = null

      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string
        const img = new window.Image()
        img.onload = () => {
          const parentId = findParentFrame(pos, objects)
          const maxW = 600
          const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1
          const newObj: ImageObject = {
            id: uuidv4(),
            type: 'image',
            name: file.name.replace(/\.[^.]+$/, ''),
            x: pos.x,
            y: pos.y,
            width: img.naturalWidth * scale,
            height: img.naturalHeight * scale,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            parentId,
            src,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
          }
          upsertObject(newObj)
          setSelectedIds([newObj.id])
          useEditorStore.getState().setActiveTool('select')
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    },
    [objects, upsertObject, setSelectedIds],
  )

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-canvas overflow-hidden"
      style={{ cursor }}
      onMouseDown={(e) => { if (e.button === 1) e.preventDefault() }}
    >
      {/* Hidden file input for image tool */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        onClick={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleStageDblClick}
        onWheel={handleWheel}
      >
        <Layer>
          {objectsArray.map((obj) => (
            <CanvasObject
              key={obj.id}
              object={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={(id, multi) => {
                if (multi) {
                  setSelectedIds(
                    selectedIds.includes(id)
                      ? selectedIds.filter((s) => s !== id)
                      : [...selectedIds, id],
                  )
                } else {
                  setSelectedIds([id])
                }
              }}
              onChange={(updated) => upsertObject(updated)}
            />
          ))}

          {/* Drawing preview ghost (rect/ellipse/text/frame/polygon/star) */}
          {previewRect && previewRect.width > 1 && previewRect.height > 1 && (
            <KonvaRect
              {...previewRect}
              fill={drawing?.tool === 'frame' ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.08)'}
              stroke={drawing?.tool === 'frame' ? '#64748b' : '#8b5cf6'}
              strokeWidth={1 / zoom}
              dash={[4 / zoom, 3 / zoom]}
              listening={false}
            />
          )}

          {/* Pen path preview */}
          {penPoints && penPoints.length >= 2 && (
            <KonvaLine
              points={penPoints}
              stroke="#7c3aed"
              strokeWidth={2}
              tension={0}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
