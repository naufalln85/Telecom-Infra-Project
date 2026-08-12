// ═══════════════════════════════════════════════════════════════════════
// api.ts — IoT Platform TIP: Full real API client
// Semua call terhubung ke backend FastAPI. TIDAK ADA DUMMY DATA.
// ═══════════════════════════════════════════════════════════════════════

const TOKEN_KEY = 'tip_jwt_token'
// Saat production (Docker), request ke /api/** di-proxy ke backend:8000 oleh Nginx
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

// ── Types ────────────────────────────────────────────────────────────────────
export type Account    = { id: number; email: string; tier: string; created_at?: string }
export type Project    = { id: number; name: string; created_at?: string }
export type Device     = { id: number; name: string; project_id: number; created_at?: string; api_key?: string }
export type Channel    = { id: number; device_id: number; name: string; channel_type: string; unit?: string }
export type Member     = { id: number; email: string; role: string; tier?: string; status?: string }
export type AlertRule  = { id: number; device_name?: string; channel_name?: string; operator: string; threshold_value: number; cooldown_seconds: number; is_active: boolean }
export type NotifChannel = { id: number; project_id: number; name: string; type: string; config?: any }
export type TelemetryLog = { id: number; protocol: string; device_id: number; device_name: string; data: Record<string, any>; received_at: string }

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) localStorage.removeItem(TOKEN_KEY)
    throw new Error(json.detail ?? json.message ?? `HTTP ${res.status}`)
  }
  return json as T
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  hasSession: () => Boolean(localStorage.getItem(TOKEN_KEY)),

  async login(email: string, password: string): Promise<void> {
    const data = await req<{ access_token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(TOKEN_KEY, data.access_token)
  },

  async register(email: string, password: string): Promise<void> {
    const data = await req<{ access_token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(TOKEN_KEY, data.access_token)
  },

  me: () => req<Account>('/api/auth/me'),

  logout() {
    localStorage.removeItem(TOKEN_KEY)
  },
}

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  async list(): Promise<Project[]> {
    const d = await req<{ data: Project[] }>('/api/v1/projects')
    return d.data ?? []
  },
  async create(name: string): Promise<Project> {
    const d = await req<{ data: Project }>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    return d.data
  },
  async remove(id: number): Promise<void> {
    await req(`/api/v1/projects/${id}`, { method: 'DELETE' })
  },
}

// ── Devices ───────────────────────────────────────────────────────────────────
export const devicesApi = {
  async list(projectId: number): Promise<Device[]> {
    const d = await req<{ data: Device[] }>(`/api/v1/projects/${projectId}/devices`)
    return d.data ?? []
  },
  async create(projectId: number, name: string): Promise<Device> {
    const d = await req<{ data: Device; message: string }>(`/api/v1/projects/${projectId}/devices`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    return d.data
  },
}

// ── Channels ──────────────────────────────────────────────────────────────────
export const channelsApi = {
  async list(deviceId: number): Promise<Channel[]> {
    const d = await req<{ data: Channel[] }>(`/api/v1/devices/${deviceId}/channels`)
    return d.data ?? []
  },
  async create(deviceId: number, name: string, channelType = 'numeric', unit?: string): Promise<Channel> {
    const d = await req<{ data: Channel }>(`/api/v1/devices/${deviceId}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name, channel_type: channelType, unit }),
    })
    return d.data
  },
}

// ── Members ───────────────────────────────────────────────────────────────────
export const membersApi = {
  async list(projectId: number): Promise<Member[]> {
    const d = await req<{ data: Member[] }>(`/api/v1/projects/${projectId}/members`)
    return d.data ?? []
  },
  async invite(projectId: number, email: string, role = 'Staff'): Promise<void> {
    await req(`/api/v1/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
  },
}

// ── Alert Rules ───────────────────────────────────────────────────────────────
export const rulesApi = {
  async list(projectId: number): Promise<AlertRule[]> {
    const d = await req<{ data: AlertRule[] }>(`/api/v1/projects/${projectId}/rules`)
    return d.data ?? []
  },
  async create(projectId: number, payload: {
    device_id: number; channel_id: number; operator: string;
    threshold_value: number; cooldown_seconds: number; notification_channel_ids?: number[]
  }): Promise<AlertRule> {
    const d = await req<{ data: AlertRule }>(`/api/v1/projects/${projectId}/rules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return d.data
  },
  async toggle(ruleId: number): Promise<void> {
    await req(`/api/v1/rules/${ruleId}/toggle`, { method: 'PUT' })
  },
  async remove(ruleId: number): Promise<void> {
    await req(`/api/v1/rules/${ruleId}`, { method: 'DELETE' })
  },
}

// ── Notification Channels ─────────────────────────────────────────────────────
export const notifApi = {
  async list(projectId: number): Promise<NotifChannel[]> {
    const d = await req<{ data: NotifChannel[] }>(`/api/v1/projects/${projectId}/notifications/channels`)
    return d.data ?? []
  },
  async create(projectId: number, payload: { name: string; type: string; config?: any }): Promise<NotifChannel> {
    const d = await req<{ data: NotifChannel }>(`/api/v1/projects/${projectId}/notifications/channels`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return d.data
  },
  async remove(channelId: number): Promise<void> {
    await req(`/api/v1/notifications/channels/${channelId}`, { method: 'DELETE' })
  },
}

// ── Alert History ─────────────────────────────────────────────────────────────
export const alertHistoryApi = {
  async list(projectId: number) {
    const d = await req<{ data: any[] }>(`/api/v1/projects/${projectId}/alerts/history`)
    return d.data ?? []
  },
}

// ── Telemetry & Gateway ───────────────────────────────────────────────────────
export const telemetryApi = {
  async getLogs(deviceId?: number, limit = 50): Promise<TelemetryLog[]> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (deviceId) params.set('device_id', String(deviceId))
    const d = await req<{ data: TelemetryLog[] }>(`/api/v1/telemetry/history?${params}`)
    return d.data ?? []
  },
  async getGatewayLogs(limit = 50) {
    const d = await req<{ data: TelemetryLog[]; stats: any }>(`/api/v1/gateway/logs?limit=${limit}`)
    return d
  },
  async getGatewayStats() {
    return req<any>('/api/v1/gateway/stats')
  },
  async simulateSend(deviceId: number, channelName: string, value: number) {
    return req('/api/simulate-telemetry', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, channel_name: channelName, value }),
    })
  },
}

// ── Dashboard Overview ────────────────────────────────────────────────────────
export const dashboardApi = {
  async getSummary() {
    return req<any>('/api/dashboard-data')
  },
  async getStatus() {
    return req<any>('/api/status')
  },
}
