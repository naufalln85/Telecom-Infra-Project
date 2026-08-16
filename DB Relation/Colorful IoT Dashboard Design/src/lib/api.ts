const TOKEN_KEY = "tip_jwt_token"
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

export type Account = { id: number; email: string; tier: "free" | "paid"; created_at?: string }
export type Project = { id: number; name: string; role: "owner" | "collaborator"; created_at?: string }
export type Device = { id: number; name: string; project_id: number; api_key?: string; created_at?: string }
export type Channel = { id: number; device_id: number; name: string; channel_type: "numeric" | "boolean" | "string"; unit?: string | null }
export type Member = { id: number; email: string; tier: string; role: "owner" | "collaborator"; created_at?: string }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(TOKEN_KEY)
    throw new Error(body.detail ?? `HTTP ${response.status}`)
  }
  return body as T
}

export const authApi = {
  hasSession: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  async login(email: string, password: string) {
    const result = await request<{ access_token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
    localStorage.setItem(TOKEN_KEY, result.access_token)
  },
  async register(email: string, password: string) {
    const result = await request<{ access_token: string }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) })
    localStorage.setItem(TOKEN_KEY, result.access_token)
  },
  me: () => request<Account>("/api/auth/me"),
  logout: () => localStorage.removeItem(TOKEN_KEY),
}

export const projectsApi = {
  async list() { return (await request<{ data: Project[] }>("/api/v2/projects")).data },
  async create(name: string) { return (await request<{ data: Project }>("/api/v2/projects", { method: "POST", body: JSON.stringify({ name }) })).data },
  remove: (id: number) => request<void>(`/api/v2/projects/${id}`, { method: "DELETE" }),
}
export const devicesApi = {
  async list(projectId: number) { return (await request<{ data: Device[] }>(`/api/v2/projects/${projectId}/devices`)).data },
  async create(projectId: number, name: string) { return (await request<{ data: Device }>(`/api/v2/projects/${projectId}/devices`, { method: "POST", body: JSON.stringify({ name }) })).data },
}
export const channelsApi = {
  async list(deviceId: number) { return (await request<{ data: Channel[] }>(`/api/v2/devices/${deviceId}/channels`)).data },
  async create(deviceId: number, name: string, channelType: Channel["channel_type"] = "numeric", unit?: string) {
    return (await request<{ data: Channel }>(`/api/v2/devices/${deviceId}/channels`, { method: "POST", body: JSON.stringify({ name, channel_type: channelType, unit }) })).data
  },
}
export const membersApi = {
  async list(projectId: number) { return (await request<{ data: Member[] }>(`/api/v2/projects/${projectId}/members`)).data },
  invite: (projectId: number, email: string) => request(`/api/v2/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ email }) }),
  remove: (projectId: number, memberId: number) => request<void>(`/api/v2/projects/${projectId}/members/${memberId}`, { method: "DELETE" }),
}
export const dashboardApi = {
  async get(projectId: number) { return (await request<{ data: { widgets: Record<string, unknown>[] } }>(`/api/v2/projects/${projectId}/dashboard`)).data.widgets ?? [] },
  save: (projectId: number, widgets: Record<string, unknown>[]) => request(`/api/v2/projects/${projectId}/dashboard`, { method: "PUT", body: JSON.stringify({ widgets }) }),
}
export const telemetryApi = {
  ingest: (apiKey: string, data: Record<string, string | number | boolean>) => request<{ accepted: boolean }>("/api/v2/telemetry", { method: "POST", body: JSON.stringify({ protocol: "HTTP", api_key: apiKey, data }) }),
}
