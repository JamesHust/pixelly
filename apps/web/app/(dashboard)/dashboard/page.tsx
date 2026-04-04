'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api/client'
import type { Project } from '@/types/project'
import { Plus, FolderOpen, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('pixelly_token')
    if (!token) {
      router.push('/login')
      return
    }
    api.projects.list()
      .then(data => setProjects(data ?? []))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const project = await api.projects.create({ name: newName })
      router.push(`/editor/${project.id}`)
    } catch {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('pixelly_token')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-violet-500 tracking-tight">Pixelly</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Your projects</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} /> New project
          </button>
        </div>

        {/* Create project form */}
        {showCreate && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="text-muted-foreground text-center py-12">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/editor/${project.id}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all"
              >
                {/* Thumbnail */}
                <div className="h-36 bg-muted flex items-center justify-center">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover" />
                  ) : (
                    <FolderOpen size={32} className="text-muted-foreground group-hover:text-primary/50 transition-colors" />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-sm truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
