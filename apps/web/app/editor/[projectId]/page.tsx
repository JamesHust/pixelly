'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { ToolsBar } from '@/components/toolbar/ToolsBar'
import { LeftPanel } from '@/components/panels/left/LeftPanel'
import { RightPanel } from '@/components/panels/right/RightPanel'
import { AgentPanel } from '@/components/ai/AgentPanel'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { CommentOverlay } from '@/components/canvas/CommentOverlay'

// Canvas must be client-only (Konva doesn't support SSR)
const CanvasRoot = dynamic(
  () => import('@/components/canvas/CanvasRoot').then((m) => ({ default: m.CanvasRoot })),
  { ssr: false }
)

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  useKeyboardShortcuts()

  useEffect(() => {
    const token = localStorage.getItem('pixelly_token')
    if (!token) router.push('/login')
  }, [router])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex flex-col flex-1 overflow-hidden">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden relative">
          <LeftPanel />
          <main className="flex-1 overflow-hidden relative">
            <ToolsBar />
            <CommentOverlay />
            <CanvasRoot projectId={projectId} />
          </main>
          <RightPanel />
        </div>
      </div>
      <AgentPanel />
    </div>
  )
}
