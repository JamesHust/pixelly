'use client'

import { useState, useRef } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { useCanvasStore } from '@/store/useCanvasStore'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'
import { createRect, createText } from '@/lib/canvas/shapes'

export function AIPanel() {
  const { isAIPanelOpen, toggleAIPanel } = useEditorStore()
  const { upsertObject } = useCanvasStore()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  if (!isAIPanelOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return

    setLoading(true)
    setResponse('')
    abortRef.current = new AbortController()

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/ai/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('pixelly_token') || ''}`,
          },
          body: JSON.stringify({ prompt }),
          signal: abortRef.current.signal,
        }
      )

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
          for (const line of lines) {
            const data = line.replace('data: ', '')
            if (data === '[DONE]') break
            fullText += data
            setResponse(fullText)
          }
        }
      }

      // Try to parse JSON canvas objects from response
      try {
        const match = fullText.match(/\[[\s\S]*\]/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item.type === 'rect') {
                upsertObject(createRect(item.x ?? 100, item.y ?? 100))
              } else if (item.type === 'text') {
                const t = createText(item.x ?? 100, item.y ?? 100)
                upsertObject({ ...t, text: item.text ?? t.text })
              }
            })
          }
        }
      } catch {
        // Not JSON, that's fine — just show the text response
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setResponse('Error connecting to AI. Make sure Ollama is running locally.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute right-64 top-12 bottom-0 w-72 bg-[#1e1e1e] border-l border-[#3c3c3c] flex flex-col z-10 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <button onClick={toggleAIPanel} className="text-gray-400 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Response area */}
      <div className="flex-1 overflow-y-auto p-3">
        {response ? (
          <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{response}</div>
        ) : (
          <div className="text-xs text-gray-500 text-center mt-8">
            <Sparkles size={24} className="mx-auto mb-3 text-violet-400/50" />
            <p>Ask AI to generate UI components, layouts, or design suggestions.</p>
            <p className="mt-2 text-gray-600">Powered by Ollama (llama3.2)</p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-[#3c3c3c]">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleGenerate()
              }
            }}
            placeholder="Generate a login form..."
            rows={3}
            className="flex-1 bg-[#2c2c2c] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="self-end p-2 rounded bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1">Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  )
}
