'use client'

import {
  Rect, Ellipse, Text, Transformer,
  Line as KonvaLine, Arrow as KonvaArrow,
  RegularPolygon, Star as KonvaStar,
  Image as KonvaImage,
} from 'react-konva'
import { useRef, useEffect, useState } from 'react'
import type Konva from 'konva'
import type { CanvasObject as CanvasObjectType, ImageObject, PenObject } from '@/types/canvas'

interface Props {
  object: CanvasObjectType
  isSelected: boolean
  onSelect: (id: string, multi: boolean) => void
  onChange: (updated: CanvasObjectType) => void
}

// ── Image object with async loading ──────────────────────────────────────────
function CanvasImageObject({ object, isSelected, onSelect, onChange }: Props & { object: ImageObject }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const shapeRef = useRef<Konva.Image>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const el = new window.Image()
    el.onload = () => setImg(el)
    el.src = object.src
  }, [object.src])

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  if (!img) return null

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        id={object.id}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rotation={object.rotation}
        opacity={object.opacity}
        visible={object.visible}
        image={img}
        draggable={!object.locked}
        onClick={(e: Konva.KonvaEventObject<MouseEvent>) => onSelect(object.id, e.evt.shiftKey)}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) =>
          onChange({ ...object, x: e.target.x(), y: e.target.y() })
        }
        onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
          const node = e.target
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          node.scaleX(1)
          node.scaleY(1)
          onChange({
            ...object,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, object.width * scaleX),
            height: Math.max(5, object.height * scaleY),
            rotation: node.rotation(),
          })
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}

// ── Main CanvasObject dispatcher ──────────────────────────────────────────────
export function CanvasObject({ object, isSelected, onSelect, onChange }: Props) {
  const shapeRef = useRef<Konva.Shape>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  // Image objects need their own async loader
  if (object.type === 'image') {
    return (
      <CanvasImageObject
        object={object}
        isSelected={isSelected}
        onSelect={onSelect}
        onChange={onChange}
      />
    )
  }

  const commonProps = {
    id: object.id,
    x: object.x,
    y: object.y,
    rotation: object.rotation,
    opacity: object.opacity,
    visible: object.visible,
    draggable: !object.locked,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      onSelect(object.id, e.evt.shiftKey)
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ ...object, x: e.target.x(), y: e.target.y() })
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      // Lines/arrows allow any signed width/height (direction)
      const isLineLike = object.type === 'line' || object.type === 'arrow'
      onChange({
        ...object,
        x: node.x(),
        y: node.y(),
        width: isLineLike ? object.width * scaleX : Math.max(5, object.width * scaleX),
        height: isLineLike ? object.height * scaleY : Math.max(5, object.height * scaleY),
        rotation: node.rotation(),
      })
    },
  }

  const renderShape = () => {
    switch (object.type) {
      case 'rect':
      case 'frame':
        return (
          <Rect
            ref={shapeRef as React.RefObject<Konva.Rect>}
            {...commonProps}
            width={object.width}
            height={object.height}
            fill={object.fill}
            stroke={object.stroke}
            strokeWidth={object.strokeWidth}
            cornerRadius={object.type === 'rect' ? object.cornerRadius : 0}
          />
        )

      case 'ellipse':
        return (
          <Ellipse
            ref={shapeRef as React.RefObject<Konva.Ellipse>}
            {...commonProps}
            radiusX={object.width / 2}
            radiusY={object.height / 2}
            offsetX={-(object.width / 2)}
            offsetY={-(object.height / 2)}
            fill={object.fill}
            stroke={object.stroke}
            strokeWidth={object.strokeWidth}
          />
        )

      case 'text':
        return (
          <Text
            ref={shapeRef as React.RefObject<Konva.Text>}
            {...commonProps}
            width={object.width}
            text={object.text}
            fontSize={object.fontSize}
            fontFamily={object.fontFamily}
            fontStyle={object.fontStyle}
            fill={object.fill}
            align={object.align}
            lineHeight={object.lineHeight}
            letterSpacing={object.letterSpacing}
          />
        )

      case 'line':
        return (
          <KonvaLine
            ref={shapeRef as React.RefObject<Konva.Line>}
            {...commonProps}
            points={[0, 0, object.width, object.height]}
            stroke={object.stroke}
            strokeWidth={object.strokeWidth}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={Math.max(object.strokeWidth, 12)}
          />
        )

      case 'arrow':
        return (
          <KonvaArrow
            ref={shapeRef as React.RefObject<Konva.Arrow>}
            {...commonProps}
            points={[0, 0, object.width, object.height]}
            stroke={object.stroke}
            strokeWidth={object.strokeWidth}
            fill={object.fill}
            pointerLength={10}
            pointerWidth={8}
            lineCap="round"
            hitStrokeWidth={Math.max(object.strokeWidth, 12)}
          />
        )

      case 'polygon':
        return (
          <RegularPolygon
            ref={shapeRef as React.RefObject<Konva.RegularPolygon>}
            {...commonProps}
            // offsetX/Y shifts render center to bounding-box center
            // so that x,y stays at top-left (consistent with other shapes)
            offsetX={-(object.width / 2)}
            offsetY={-(object.height / 2)}
            radius={Math.min(object.width, object.height) / 2}
            sides={object.sides}
            fill={object.fill}
            stroke={object.stroke}
            strokeWidth={object.strokeWidth}
          />
        )

      case 'star':
        return (
          <KonvaStar
            ref={shapeRef as React.RefObject<Konva.Star>}
            {...commonProps}
            offsetX={-(object.width / 2)}
            offsetY={-(object.height / 2)}
            outerRadius={Math.min(object.width, object.height) / 2}
            innerRadius={Math.min(object.width, object.height) / 2 * object.innerRadiusRatio}
            numPoints={object.numPoints}
            fill={object.fill}
            stroke={object.stroke}
            strokeWidth={object.strokeWidth}
          />
        )

      case 'pen': {
        const pen = object as PenObject
        return (
          <KonvaLine
            ref={shapeRef as React.RefObject<Konva.Line>}
            {...commonProps}
            points={pen.points}
            stroke={pen.stroke}
            strokeWidth={pen.strokeWidth}
            tension={pen.tension}
            closed={pen.closed}
            fill={pen.closed && pen.fill ? pen.fill : undefined}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={20}
          />
        )
      }

      default:
        return null
    }
  }

  return (
    <>
      {renderShape()}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}
