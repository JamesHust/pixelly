export interface Project {
  id: string
  name: string
  description?: string
  thumbnail_url?: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  project_id: string
  name: string
  order: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
}
