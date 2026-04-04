import type { Tool } from '@/types/canvas'

export const TOOL_LABELS: Record<Tool, string> = {
  select: 'Select',
  hand: 'Hand',
  frame: 'Frame',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  text: 'Text',
  line: 'Line',
  arrow: 'Arrow',
  polygon: 'Polygon',
  star: 'Star',
  image: 'Image',
  pen: 'Pen',
  comment: 'Comment',
}

export const TOOL_SHORTCUTS: Record<Tool, string> = {
  select: 'V',
  hand: 'H',
  frame: 'F',
  rect: 'R',
  ellipse: 'O',
  text: 'T',
  line: 'L',
  arrow: 'Shift+L',
  polygon: '',
  star: '',
  image: 'Ctrl+Shift+K',
  pen: 'P',
  comment: 'C',
}

export const DEFAULT_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
]
