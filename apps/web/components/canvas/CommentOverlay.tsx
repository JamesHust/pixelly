'use client'

import { useState, useCallback, useRef } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { useCommentsStore, type Comment } from '@/store/useCommentsStore'

// ── Comment pin (always rendered) ────────────────────────────────────────────
interface CommentPinProps {
  comment: Comment
  zoom: number
  panX: number
  panY: number
  onDelete: (id: string) => void
}

function CommentPin({ comment, zoom, panX, panY, onDelete }: CommentPinProps) {
  const [hovered, setHovered] = useState(false)

  const left = comment.x * zoom + panX
  const top = comment.y * zoom + panY

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left, top, transform: 'translate(-50%, -100%)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pin icon */}
      <div className="w-7 h-7 rounded-full bg-yellow-400 border-2 border-yellow-500 flex items-center justify-center shadow-md cursor-pointer select-none text-xs font-bold text-yellow-900">
        💬
      </div>

      {/* Tooltip on hover */}
      {hovered && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-[160px] max-w-[240px] bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{comment.text}</p>
          <button
            className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(comment.id)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Pending comment input ─────────────────────────────────────────────────────
interface PendingInputProps {
  x: number  // screen px
  y: number  // screen px
  onSubmit: (text: string) => void
  onCancel: () => void
}

function PendingInput({ x, y, onSubmit, onCancel }: PendingInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim()) onSubmit(text.trim())
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div
      className="absolute pointer-events-auto z-50"
      style={{ left: x, top: y, transform: 'translate(8px, -50%)' }}
    >
      {/* Pending dot */}
      <div
        className="absolute w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-500 shadow"
        style={{ left: -20, top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Input card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-64">
        <textarea
          ref={textareaRef}
          autoFocus
          className="w-full resize-none text-sm text-gray-800 border border-gray-200 rounded p-2 outline-none focus:ring-2 focus:ring-yellow-400"
          rows={3}
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex gap-2 mt-2 justify-end">
          <button
            className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-700 transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="text-xs px-3 py-1 rounded bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-medium transition-colors disabled:opacity-40"
            disabled={!text.trim()}
            onClick={() => { if (text.trim()) onSubmit(text.trim()) }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CommentOverlay (main export) ──────────────────────────────────────────────
export function CommentOverlay() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const zoom = useEditorStore((s) => s.zoom)
  const panX = useEditorStore((s) => s.panX)
  const panY = useEditorStore((s) => s.panY)

  const comments = useCommentsStore((s) => s.comments)
  const addComment = useCommentsStore((s) => s.addComment)
  const deleteComment = useCommentsStore((s) => s.deleteComment)

  // pending: screen-space coords of where the user clicked
  const [pending, setPending] = useState<{ screenX: number; screenY: number; canvasX: number; canvasY: number } | null>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const canvasX = (screenX - panX) / zoom
    const canvasY = (screenY - panY) / zoom
    setPending({ screenX, screenY, canvasX, canvasY })
  }, [zoom, panX, panY])

  const handleSubmit = useCallback((text: string) => {
    if (!pending) return
    addComment(pending.canvasX, pending.canvasY, text)
    setPending(null)
    setActiveTool('select')
  }, [pending, addComment, setActiveTool])

  const handleCancel = useCallback(() => {
    setPending(null)
  }, [])

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Click-capture layer — only active when comment tool is selected */}
      {activeTool === 'comment' && (
        <div
          className="absolute inset-0 cursor-crosshair pointer-events-auto"
          onClick={handleClick}
        />
      )}

      {/* Existing comment pins — always interactive */}
      {comments.map((c) => (
        <CommentPin
          key={c.id}
          comment={c}
          zoom={zoom}
          panX={panX}
          panY={panY}
          onDelete={deleteComment}
        />
      ))}

      {/* Pending comment input */}
      {pending && (
        <PendingInput
          x={pending.screenX}
          y={pending.screenY}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
