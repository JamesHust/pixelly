const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface SkillFetchResult {
  name: string
  repo: string
  description: string
  content: string
}

export async function fetchSkill(repo: string, token: string): Promise<SkillFetchResult> {
  const res = await fetch(
    `${API_BASE}/api/v1/skills/fetch?repo=${encodeURIComponent(repo)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch skill' }))
    throw new Error(err.error || 'Failed to fetch skill')
  }
  return res.json()
}
