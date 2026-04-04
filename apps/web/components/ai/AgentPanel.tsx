'use client'

import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { useCanvasStore } from '@/store/useCanvasStore'
import { useAgentStore, type InstalledSkill } from '@/store/useAgentStore'
import {
  Bot,
  X,
  Send,
  Loader2,
  Cpu,
  Trash2,
  Plus,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { createRect, createText, createEllipse, createFrame } from '@/lib/canvas/shapes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// Strip JSON canvas arrays from AI response text so users only see the description.
function stripCanvasJson(text: string): string {
  return text.replace(/\[[\s\S]*?\]/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

const GROQ_MODELS = [
  { value: '', label: 'Default (server config)' },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (best)' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
]

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('pixelly_token') || '' : ''
}

// Normalize user input to "owner/repo" format for the backend FetchSkill endpoint.
// Accepts: "owner/repo", "https://github.com/owner/repo[.git]",
//          "https://skills.sh/owner/repo" (skills.sh links map to the same format)
function normalizeSkillRepo(input: string): string | null {
  const trimmed = input.trim()
  const githubMatch = trimmed.match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/)
  if (githubMatch) return githubMatch[1].replace(/\.git$/, '')
  const skillsShMatch = trimmed.match(/skills\.sh\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/)
  if (skillsShMatch) return skillsShMatch[1]
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) return trimmed
  return null
}

// Apply AI-generated canvas objects onto the canvas.
function applyCanvasObjects(
  objects: any[],
  upsertObject: ReturnType<typeof useCanvasStore>['upsertObject']
) {
  for (const item of objects) {
    const x = item.x ?? 100
    const y = item.y ?? 100
    switch (item.type) {
      case 'rect':
        upsertObject({ ...createRect(x, y), ...item, id: undefined, ...{ id: createRect(x, y).id } })
        break
      case 'text': {
        const base = createText(x, y)
        upsertObject({ ...base, ...item, id: base.id })
        break
      }
      case 'ellipse': {
        const base = createEllipse(x, y)
        upsertObject({ ...base, ...item, id: base.id })
        break
      }
      case 'frame': {
        const base = createFrame(x, y)
        upsertObject({ ...base, ...item, id: base.id })
        break
      }
    }
  }
}

// ────────────────────────────────────────────────────────────
//  SkillItem
// ────────────────────────────────────────────────────────────

function SkillItem({
  skill,
  onToggle,
  onRemove,
}: {
  skill: InstalledSkill
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 space-y-1 transition-colors ${
        skill.enabled
          ? 'border-violet-500/40 bg-violet-500/5'
          : 'border-border bg-secondary'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-medium truncate ${
            skill.enabled ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {skill.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={skill.enabled ? 'Disable skill' : 'Enable skill'}
            className={`transition-colors ${
              skill.enabled
                ? 'text-violet-400 hover:text-violet-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {skill.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
          <button
            onClick={onRemove}
            title="Remove skill"
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {skill.description && (
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{skill.description}</p>
      )}
      <p className="text-xs text-muted-foreground/60 truncate">{skill.repo}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  AgentPanel
// ────────────────────────────────────────────────────────────

export function AgentPanel() {
  const { isAIPanelOpen, toggleAIPanel } = useEditorStore()
  const { upsertObject } = useCanvasStore()
  const {
    messages,
    skills,
    selectedModel,
    setSelectedModel,
    addMessage,
    updateLastAssistantMessage,
    clearMessages,
    addSkill,
    removeSkill,
    toggleSkill,
  } = useAgentStore()

  const [view, setView] = useState<'chat' | 'skills'>('chat')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [skillRepo, setSkillRepo] = useState('')
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, view])

  if (!isAIPanelOpen) return null

  const enabledSkills = skills.filter((s) => s.enabled)

  // ── Chat ──────────────────────────────────────────────────

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userContent = input.trim()
    setInput('')
    setLoading(true)

    // Snapshot history before adding new messages to store
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    addMessage({ role: 'user', content: userContent })
    addMessage({ role: 'assistant', content: '' })

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userContent }],
          skills: enabledSkills.map((s) => ({ name: s.name, content: s.content })),
          model: selectedModel || undefined,
        }),
        signal: abortRef.current.signal,
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') break
            fullText += data.replaceAll('\\n', '\n')
            updateLastAssistantMessage(fullText)
          }
        }
      }

      // Try to extract and apply canvas objects from the response
      try {
        const match = fullText.match(/\[[\s\S]*?\]/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (Array.isArray(parsed)) applyCanvasObjects(parsed, upsertObject)
        }
      } catch {
        // Not JSON — text-only response, that's fine
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        updateLastAssistantMessage(
          'Error connecting to AI. Make sure Ollama is running locally.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Skill install ─────────────────────────────────────────

  const handleInstallSkill = async () => {
    const normalized = normalizeSkillRepo(skillRepo)
    if (!normalized) {
      setInstallError('Enter a valid owner/repo, GitHub URL, or skills.sh link')
      return
    }
    if (skills.some((s) => s.repo === normalized)) {
      setInstallError('Skill already installed')
      return
    }

    setInstalling(true)
    setInstallError('')

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/ai/skill-fetch?repo=${encodeURIComponent(normalized)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      const data = await res.json()
      if (!res.ok) {
        setInstallError(data.error || 'Failed to fetch skill')
        return
      }
      addSkill({
        name: data.name,
        repo: data.repo,
        description: data.description,
        content: data.content,
        enabled: true,
      })
      setSkillRepo('')
    } catch {
      setInstallError('Network error. Check your connection.')
    } finally {
      setInstalling(false)
    }
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="w-72 shrink-0 bg-panel border-l border-border flex flex-col z-10 text-foreground animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-violet-500" />
          <span className="text-sm font-medium">AI Agent</span>
          {enabledSkills.length > 0 && (
            <span className="text-xs bg-violet-500/20 text-violet-500 px-1.5 py-0.5 rounded-full leading-none">
              {enabledSkills.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView((v) => (v === 'chat' ? 'skills' : 'chat'))}
            title={view === 'skills' ? 'Back to chat' : 'Manage skills'}
            className={`p-1 rounded transition-colors ${
              view === 'skills'
                ? 'bg-violet-500/20 text-violet-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cpu size={13} />
          </button>
          <button
            onClick={toggleAIPanel}
            title="Close"
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Chat view ── */}
      {view === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center mt-8 space-y-2">
                <Bot size={24} className="mx-auto text-violet-500/50" />
                <p>Chat with your AI design assistant.</p>
                {enabledSkills.length > 0 && (
                  <p className="text-violet-500/70">
                    {enabledSkills.length} skill{enabledSkills.length > 1 ? 's' : ''} active
                  </p>
                )}
                <p className="text-muted-foreground/60">Powered by Ollama (llama3.2)</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed break-words ${
                        msg.role === 'user'
                          ? 'bg-violet-600 text-white'
                          : 'bg-secondary text-foreground'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : msg.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            code: ({ children, className }) => {
                              const isBlock = className?.includes('language-')
                              return isBlock ? (
                                <pre className="bg-background rounded px-2 py-1.5 my-1 overflow-x-auto">
                                  <code className="text-violet-500 text-[11px]">{children}</code>
                                </pre>
                              ) : (
                                <code className="bg-background text-violet-500 rounded px-1">{children}</code>
                              )
                            },
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                            strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                            h1: ({ children }) => <p className="font-semibold text-foreground mb-1">{children}</p>,
                            h2: ({ children }) => <p className="font-semibold text-foreground mb-1">{children}</p>,
                            h3: ({ children }) => <p className="font-medium text-foreground mb-0.5">{children}</p>,
                          }}
                        >
                          {stripCanvasJson(msg.content)}
                        </ReactMarkdown>
                      ) : (
                        loading && <Loader2 size={12} className="animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="p-3 border-t border-border shrink-0 space-y-2">
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear conversation
              </button>
            )}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Design a login form..."
                rows={3}
                className="flex-1 bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-violet-500 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="self-end p-2 rounded bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground/60">Enter to send · Shift+Enter new line</p>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-xs bg-secondary border border-border rounded px-1.5 py-0.5 text-muted-foreground focus:outline-none focus:border-violet-500"
              >
                {GROQ_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* ── Skills view ── */}
      {view === 'skills' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Install form */}
          <div className="p-3 border-b border-border shrink-0 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Install skill</p>
            <div className="flex gap-2">
              <input
                value={skillRepo}
                onChange={(e) => {
                  setSkillRepo(e.target.value)
                  setInstallError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleInstallSkill()}
                placeholder="owner/repo or skills.sh URL"
                className="flex-1 bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={handleInstallSkill}
                disabled={installing || !skillRepo.trim()}
                className="p-2 rounded bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {installing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              </button>
            </div>
            {installError && (
              <p className="text-xs text-destructive">{installError}</p>
            )}
            <p className="text-xs text-muted-foreground/60">
              From{' '}
              <a
                href="https://skills.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500 hover:underline"
              >
                skills.sh
              </a>{' '}
              or any GitHub repo
            </p>
          </div>

          {/* Skill list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {skills.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center mt-8 space-y-2">
                <Cpu size={24} className="mx-auto text-violet-500/50" />
                <p>No skills installed.</p>
                <p className="text-muted-foreground/60">Add skills to extend the agent.</p>
              </div>
            ) : (
              skills.map((skill) => (
                <SkillItem
                  key={skill.id}
                  skill={skill}
                  onToggle={() => toggleSkill(skill.id)}
                  onRemove={() => removeSkill(skill.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
