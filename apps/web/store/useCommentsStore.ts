import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Comment {
  id: string
  x: number  // canvas coordinate
  y: number  // canvas coordinate
  text: string
  resolved: boolean
}

interface CommentsState {
  comments: Comment[]
  addComment: (x: number, y: number, text: string) => void
  deleteComment: (id: string) => void
}

export const useCommentsStore = create<CommentsState>((set) => ({
  comments: [],
  addComment: (x, y, text) => set((s) => ({
    comments: [...s.comments, { id: uuidv4(), x, y, text, resolved: false }],
  })),
  deleteComment: (id) => set((s) => ({
    comments: s.comments.filter((c) => c.id !== id),
  })),
}))
