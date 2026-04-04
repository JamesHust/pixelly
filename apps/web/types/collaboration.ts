export interface UserPresence {
  userId: string
  name: string
  color: string
  cursor: { x: number; y: number } | null
  selectedIds: string[]
}
