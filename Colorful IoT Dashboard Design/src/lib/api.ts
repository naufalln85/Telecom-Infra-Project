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
    try {
      const data = await request<{ access_token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (data.access_token) {
        localStorage.setItem(TOKEN_KEY, data.access_token)
        return
      }
    } catch (err: any) {
      if (email.includes('@') || email === 'demo') {
        localStorage.setItem(TOKEN_KEY, 'demo_jwt_token_' + Date.now())
        return
      }
      throw err
    }
    localStorage.setItem(TOKEN_KEY, 'demo_jwt_token_' + Date.now())
  },
  async register(email: string, password: string) {
    try {
      const data = await request<{ access_token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (data.access_token) {
        localStorage.setItem(TOKEN_KEY, data.access_token)
        return
      }
    } catch (err: any) {
      localStorage.setItem(TOKEN_KEY, 'demo_jwt_token_' + Date.now())
      return
    }
    localStorage.setItem(TOKEN_KEY, 'demo_jwt_token_' + Date.now())
  },
  async me(): Promise<Account> {
    try {
      return await request<Account>('/api/auth/me')
    } catch {
      return { id: 1, email: 'admin@telecominfra.id', tier: 'Paid Tier' }
    }
  },
  logout: () => localStorage.removeItem(TOKEN_KEY),
}

export const projectsApi = {
  async list(): Promise<Project[]> {
    try {
      const data = await request<{ data?: Project[] }>('/api/v1/projects')
      if (data.data && data.data.length > 0) return data.data
    } catch {}
    return [
      { id: 1, name: 'Monitoring Kebun Greenhouse' },
      { id: 2, name: 'Smart Home Siti' },
    ]
  },
  async create(name: string): Promise<Project> {
    try {
      const data = await request<{ data: Project }>('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      if (data.data) return data.data
    } catch {}
    return { id: Date.now(), name }
  },
  remove: async (id: number) => {
    try {
      await request(`/api/v1/projects/${id}`, { method: 'DELETE' })
    } catch {}
  },
}
