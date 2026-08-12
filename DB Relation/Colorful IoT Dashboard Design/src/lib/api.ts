const TOKEN_KEY = 'tip_jwt_token'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export type Account = { id?: number; email: string; tier?: string }
export type Project = { id: number; name: string }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(TOKEN_KEY)
    throw new Error(data.detail || data.message || `HTTP ${response.status}`)
  }
  return data as T
}

export const authApi = {
  hasSession: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  async login(email: string, password: string) {
    const data = await request<{ access_token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    localStorage.setItem(TOKEN_KEY, data.access_token)
  },
  me: () => request<Account>('/api/auth/me'),
  logout: () => localStorage.removeItem(TOKEN_KEY),
}

export const projectsApi = {
  async list() { const data = await request<{ data?: Project[] }>('/api/v1/projects'); return data.data ?? [] },
  async create(name: string) { const data = await request<{ data: Project }>('/api/v1/projects', { method: 'POST', body: JSON.stringify({ name }) }); return data.data },
  remove: (id: number) => request(`/api/v1/projects/${id}`, { method: 'DELETE' }),
}
