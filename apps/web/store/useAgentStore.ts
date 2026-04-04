import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface InstalledSkill {
  id: string
  name: string
  repo: string
  description: string
  content: string
  enabled: boolean
  installedAt: number
}

interface AgentState {
  messages: ChatMessage[]
  skills: InstalledSkill[]
  selectedModel: string
  setSelectedModel: (model: string) => void
  addMessage: (msg: Pick<ChatMessage, 'role' | 'content'>) => ChatMessage
  updateLastAssistantMessage: (content: string) => void
  clearMessages: () => void
  addSkill: (skill: Omit<InstalledSkill, 'id' | 'installedAt'>) => void
  removeSkill: (id: string) => void
  toggleSkill: (id: string) => void
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      messages: [],
      skills: [],
      selectedModel: '',

      setSelectedModel: (model) => set({ selectedModel: model }),

      addMessage: (msg) => {
        const full: ChatMessage = { ...msg, id: uuidv4(), timestamp: Date.now() }
        set((state) => ({ messages: [...state.messages, full] }))
        return full
      },

      updateLastAssistantMessage: (content) =>
        set((state) => {
          const msgs = [...state.messages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], content }
              return { messages: msgs }
            }
          }
          return {}
        }),

      clearMessages: () => set({ messages: [] }),

      addSkill: (skill) => {
        const full: InstalledSkill = { ...skill, id: uuidv4(), installedAt: Date.now() }
        set((state) => ({ skills: [...state.skills, full] }))
      },

      removeSkill: (id) =>
        set((state) => ({ skills: state.skills.filter((s) => s.id !== id) })),

      toggleSkill: (id) =>
        set((state) => ({
          skills: state.skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
        })),
    }),
    { name: 'pixelly-agent' }
  )
)
