import { v4 as uuidv4 } from 'uuid'
import type {
  RectObject, EllipseObject, TextObject, FrameObject,
  ImageObject, LineObject, ArrowObject, PolygonObject, StarObject, PenObject,
} from '@/types/canvas'

export function createRect(x: number, y: number, parentId: string | null = null): RectObject {
  return { id: uuidv4(), type: 'rect', name: 'Rectangle', x, y, width: 200, height: 120, rotation: 0, opacity: 1, visible: true, locked: false, parentId, fill: '#e2e8f0', stroke: '', strokeWidth: 0, cornerRadius: 0 }
}

export function createEllipse(x: number, y: number, parentId: string | null = null): EllipseObject {
  return { id: uuidv4(), type: 'ellipse', name: 'Ellipse', x, y, width: 150, height: 150, rotation: 0, opacity: 1, visible: true, locked: false, parentId, fill: '#bfdbfe', stroke: '', strokeWidth: 0 }
}

export function createText(x: number, y: number, parentId: string | null = null): TextObject {
  return { id: uuidv4(), type: 'text', name: 'Text', x, y, width: 200, height: 40, rotation: 0, opacity: 1, visible: true, locked: false, parentId, text: 'Double click to edit', fontSize: 16, fontFamily: 'Inter', fontStyle: 'normal', fill: '#1e293b', align: 'left', lineHeight: 1.5, letterSpacing: 0 }
}

export function createFrame(x: number, y: number, parentId: string | null = null): FrameObject {
  return { id: uuidv4(), type: 'frame', name: 'Frame', x, y, width: 375, height: 812, rotation: 0, opacity: 1, visible: true, locked: false, parentId, fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1, clipContent: true }
}

/** Line: x,y = start; width,height = delta to end (may be negative). */
export function createLine(x1: number, y1: number, x2: number, y2: number, parentId: string | null = null): LineObject {
  return { id: uuidv4(), type: 'line', name: 'Line', x: x1, y: y1, width: x2 - x1, height: y2 - y1, rotation: 0, opacity: 1, visible: true, locked: false, parentId, stroke: '#475569', strokeWidth: 2 }
}

/** Arrow: same geometry as Line, renders arrowhead at end. */
export function createArrow(x1: number, y1: number, x2: number, y2: number, parentId: string | null = null): ArrowObject {
  return { id: uuidv4(), type: 'arrow', name: 'Arrow', x: x1, y: y1, width: x2 - x1, height: y2 - y1, rotation: 0, opacity: 1, visible: true, locked: false, parentId, stroke: '#475569', strokeWidth: 2, fill: '#475569' }
}

/** Regular polygon: x,y = bounding-box top-left. */
export function createPolygon(cx: number, cy: number, sides: number = 6, radius: number = 60, parentId: string | null = null): PolygonObject {
  return { id: uuidv4(), type: 'polygon', name: 'Polygon', x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2, rotation: 0, opacity: 1, visible: true, locked: false, parentId, fill: '#e2e8f0', stroke: '', strokeWidth: 0, sides }
}

/** Star shape: x,y = bounding-box top-left. */
export function createStar(cx: number, cy: number, numPoints: number = 5, outerRadius: number = 60, innerRadiusRatio: number = 0.45, parentId: string | null = null): StarObject {
  return { id: uuidv4(), type: 'star', name: 'Star', x: cx - outerRadius, y: cy - outerRadius, width: outerRadius * 2, height: outerRadius * 2, rotation: 0, opacity: 1, visible: true, locked: false, parentId, fill: '#fbbf24', stroke: '', strokeWidth: 0, numPoints, innerRadiusRatio }
}

/** Image placed on canvas. */
export function createImage(x: number, y: number, src: string, width: number, height: number, parentId: string | null = null): ImageObject {
  return { id: uuidv4(), type: 'image', name: 'Image', x, y, width, height, rotation: 0, opacity: 1, visible: true, locked: false, parentId, src, originalWidth: width, originalHeight: height }
}

/**
 * Freeform pen path.
 * @param canvasPoints flat [x0,y0, x1,y1, ...] in absolute canvas coordinates
 */
export function createPenPath(canvasPoints: number[], parentId: string | null = null): PenObject {
  const xs = canvasPoints.filter((_, i) => i % 2 === 0)
  const ys = canvasPoints.filter((_, i) => i % 2 === 1)
  const minX = Math.min(...xs), minY = Math.min(...ys)
  const maxX = Math.max(...xs), maxY = Math.max(...ys)
  return {
    id: uuidv4(), type: 'pen', name: 'Path',
    x: minX, y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    rotation: 0, opacity: 1, visible: true, locked: false, parentId,
    points: canvasPoints.map((p, i) => i % 2 === 0 ? p - minX : p - minY),
    stroke: '#475569', strokeWidth: 2,
    tension: 0, closed: false, fill: '',
  }
}
