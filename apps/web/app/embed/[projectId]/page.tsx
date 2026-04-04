'use client'

/**
 * Embed route: /embed/[projectId]?token=...&readOnly=true
 * Renders a minimal canvas viewer suitable for embedding in iframes.
 *
 * Usage in a host app:
 *   <iframe src="http://pixelly.app/embed/PROJECT_ID?token=JWT&readOnly=true" />
 *
 * Or as a Web Component (via packages/canvas-core):
 *   <pixelly-editor project-id="PROJECT_ID" token="JWT" />
 */

import { useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useEditorStore } from '@/store/useEditorStore'

const CanvasRoot = dynamic(
  () => import('@/components/canvas/CanvasRoot').then((m) => ({ default: m.CanvasRoot })),
  { ssr: false }
)

export default function EmbedPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const token = searchParams.get('token')
  const readOnly = searchParams.get('readOnly') === 'true'

  useEffect(() => {
    if (token) {
      localStorage.setItem('pixelly_token', token)
    }
    // Notify parent frame that embed is ready
    window.parent?.postMessage({ type: 'pixelly:ready', projectId }, '*')
  }, [token, projectId])

  return (
    <div className="w-full h-screen overflow-hidden">
      <CanvasRoot projectId={projectId} readOnly={readOnly} />
    </div>
  )
}
