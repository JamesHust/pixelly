'use client'

import { useRouter } from 'next/navigation'
import { useEditorStore } from '@/store/useEditorStore'
import { Sparkles, ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Toolbar() {
  const router = useRouter()
  const { zoom, setZoom, toggleAIPanel, isAIPanelOpen } = useEditorStore()

  return (
    <div className="flex items-center gap-1 h-12 px-3 bg-panel border-b border-border text-foreground select-none">
      {/* Back button */}
      <button
        title="Back to projects"
        onClick={() => router.push('/dashboard')}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <ArrowLeft size={16} />
      </button>

      {/* Logo */}
      <span className="font-bold text-violet-500 text-lg mx-2 tracking-tight">Pixelly</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* AI Button */}
      <button
        onClick={toggleAIPanel}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          isAIPanelOpen
            ? 'bg-primary text-primary-foreground ring-2 ring-primary/40'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }`}
      >
        <Sparkles size={14} className={isAIPanelOpen ? 'animate-pulse' : ''} />
        AI
      </button>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Zoom control */}
      <div className="flex items-center gap-1 ml-1">
        <button
          onClick={() => setZoom(zoom / 1.2)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom * 1.2)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  )
}
