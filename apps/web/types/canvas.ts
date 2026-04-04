export type ShapeType =
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'line'
  | 'arrow'
  | 'frame'
  | 'image'
  | 'polygon'
  | 'star'
  | 'pen'

export interface BaseObject {
  id: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  name: string
  // Parent frame ID (null = root canvas)
  parentId: string | null
}

export interface RectObject extends BaseObject {
  type: 'rect'
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius: number
  shadow?: ShadowConfig
}

export interface EllipseObject extends BaseObject {
  type: 'ellipse'
  fill: string
  stroke: string
  strokeWidth: number
  shadow?: ShadowConfig
}

export interface TextObject extends BaseObject {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fontStyle: string
  fill: string
  align: 'left' | 'center' | 'right'
  lineHeight: number
  letterSpacing: number
}

export interface FrameObject extends BaseObject {
  type: 'frame'
  fill: string
  stroke: string
  strokeWidth: number
  clipContent: boolean
}

export interface ImageObject extends BaseObject {
  type: 'image'
  src: string
  originalWidth: number
  originalHeight: number
}

// Line: x,y = start point; width,height = end-point delta (can be negative)
export interface LineObject extends BaseObject {
  type: 'line'
  stroke: string
  strokeWidth: number
}

// Arrow: same geometry as Line, renders arrowhead at end
export interface ArrowObject extends BaseObject {
  type: 'arrow'
  stroke: string
  strokeWidth: number
  fill: string
}

// Polygon: x,y = top-left of bounding box; width,height = bounding box size
export interface PolygonObject extends BaseObject {
  type: 'polygon'
  fill: string
  stroke: string
  strokeWidth: number
  sides: number
}

// Star: x,y = top-left of bounding box; width,height = bounding box size
export interface StarObject extends BaseObject {
  type: 'star'
  fill: string
  stroke: string
  strokeWidth: number
  numPoints: number
  innerRadiusRatio: number // fraction of outer radius (0-1)
}

// Pen path: x,y = bounding-box top-left; points = flat [x0,y0,x1,y1,...] relative to (x,y)
export interface PenObject extends BaseObject {
  type: 'pen'
  points: number[]
  stroke: string
  strokeWidth: number
  tension: number
  closed: boolean
  fill: string
}

export type CanvasObject =
  | RectObject
  | EllipseObject
  | TextObject
  | FrameObject
  | ImageObject
  | LineObject
  | ArrowObject
  | PolygonObject
  | StarObject
  | PenObject

export interface ShadowConfig {
  color: string
  blur: number
  offsetX: number
  offsetY: number
  opacity: number
}

export type Tool =
  | 'select'
  | 'hand'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'line'
  | 'arrow'
  | 'frame'
  | 'image'
  | 'polygon'
  | 'star'
  | 'pen'
  | 'comment'
