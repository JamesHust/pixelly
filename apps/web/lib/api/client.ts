const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pixelly_token') : null

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(res.status, error.error || 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<{ token: string; user: { id: string; email: string; name: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<{ id: string; email: string }>('/auth/me'),
  },
  projects: {
    list: () => request<import('@/types/project').Project[]>('/projects'),
    create: (data: { name: string; description?: string }) =>
      request<import('@/types/project').Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<import('@/types/project').Project>(`/projects/${id}`),
    update: (id: string, data: { name?: string; description?: string }) =>
      request<import('@/types/project').Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
}
