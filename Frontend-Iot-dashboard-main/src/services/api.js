// =============================================================================
// IoT Platform TIP — API Service Layer
// Dynamic base URL: works on localhost dev AND production VM server
// =============================================================================

const getBaseUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const h = window.location.hostname;
  // Jika akses via localhost atau 127.x — pakai port 8000 lokal
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:8000";
  // Jika akses dari VM/server — gunakan hostname yang sama dengan port 8000
  return `http://${h}:8000`;
};

const API_BASE_URL = getBaseUrl();

// Token management
const TOKEN_KEY = "tip_jwt_token";
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Jika 401 → token expired, bersihkan storage
    if (response.status === 401) removeToken();
    throw new Error(data.detail || data.message || `HTTP ${response.status}`);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const authAPI = {
  async register(email, password, tier = "free") {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, tier }),
    });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async login(email, password) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async getMe() {
    return await apiFetch("/api/auth/me");
  },

  logout() {
    removeToken();
  },

  isLoggedIn() {
    return !!getToken();
  },

  getToken,
};

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────────────────
export const projectsAPI = {
  async list() {
    return await apiFetch("/api/v1/projects");
  },
  async create(name) {
    return await apiFetch("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
  async delete(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}`, { method: "DELETE" });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEVICES
// ─────────────────────────────────────────────────────────────────────────────
export const devicesAPI = {
  async list(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}/devices`);
  },
  async create(projectId, name) {
    return await apiFetch(`/api/v1/projects/${projectId}/devices`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA CHANNELS
// ─────────────────────────────────────────────────────────────────────────────
export const channelsAPI = {
  async list(deviceId) {
    return await apiFetch(`/api/v1/devices/${deviceId}/channels`);
  },
  async create(deviceId, name, channelType = "numeric", unit = null) {
    return await apiFetch(`/api/v1/devices/${deviceId}/channels`, {
      method: "POST",
      body: JSON.stringify({ name, channel_type: channelType, unit }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT RULES (FULL CRUD)
// ─────────────────────────────────────────────────────────────────────────────
export const rulesAPI = {
  async list(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}/rules`);
  },
  /** payload: { device_id, channel_id, operator, threshold_value, cooldown_seconds, notification_channel_ids[] } */
  async create(projectId, payload) {
    return await apiFetch(`/api/v1/projects/${projectId}/rules`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async delete(ruleId) {
    return await apiFetch(`/api/v1/rules/${ruleId}`, { method: "DELETE" });
  },
  async toggle(ruleId) {
    return await apiFetch(`/api/v1/rules/${ruleId}/toggle`, { method: "PUT" });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT HISTORY
// ─────────────────────────────────────────────────────────────────────────────
export const alertHistoryAPI = {
  async list(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}/alerts/history`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CHANNELS (FULL CRUD)
// ─────────────────────────────────────────────────────────────────────────────
export const notifChannelsAPI = {
  async list(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}/notifications/channels`);
  },
  /** payload: { name, type: 'telegram'|'webhook'|'email', config: {} } */
  async create(projectId, payload) {
    return await apiFetch(`/api/v1/projects/${projectId}/notifications/channels`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async delete(channelId) {
    return await apiFetch(`/api/v1/notifications/channels/${channelId}`, {
      method: "DELETE",
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY HISTORY
// ─────────────────────────────────────────────────────────────────────────────
export const telemetryAPI = {
  async getHistory(deviceId = null, channel = null, limit = 100) {
    const params = new URLSearchParams({ limit });
    if (deviceId !== null) params.append("device_id", deviceId);
    if (channel) params.append("channel", channel);
    return await apiFetch(`/api/v1/telemetry/history?${params}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI / ML MODELS
// ─────────────────────────────────────────────────────────────────────────────
export const aiModelsAPI = {
  /** Daftar semua model: preset platform + custom user */
  async list() {
    return await apiFetch("/api/v1/ai-models");
  },
  /**
   * Buat custom AI model.
   * payload: { name, description, category, code, required_channels[] }
   * code harus berisi fungsi Python: def run(data: dict) -> dict
   */
  async create(payload) {
    return await apiFetch("/api/v1/ai-models", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  /**
   * Jalankan model pada data sensor.
   * modelId: 'preset_weather' | 'preset_anomaly' | 'preset_trend' | 'preset_soil' | 'custom_N'
   * data: { temperature: 28.5, humidity: 75, ... }
   */
  async run(modelId, data) {
    return await apiFetch(`/api/v1/ai-models/${modelId}/run`, {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GATEWAY
// ─────────────────────────────────────────────────────────────────────────────
export const gatewayAPI = {
  async getLogs(limit = 50) {
    return await apiFetch(`/api/v1/gateway/logs?limit=${limit}`);
  },
  async getStats() {
    return await apiFetch("/api/v1/gateway/stats");
  },
  async sendTestData(apiKey, data = {}) {
    const gwHost = window.location.hostname;
    const gwPort = gwHost === "localhost" ? 3000 : 3000;
    const GATEWAY_URL = `http://${gwHost}:${gwPort}`;
    const response = await fetch(`${GATEWAY_URL}/api/v1/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(data),
    });
    return await response.json();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD / SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  async getStatus() {
    return await apiFetch("/api/status");
  },
  async getData() {
    return await apiFetch("/api/dashboard-data");
  },
  async seedMock() {
    return await apiFetch("/api/seed-mock", { method: "POST" });
  },
  async simulateTelemetry(deviceId, channelName, value) {
    return await apiFetch("/api/simulate-telemetry", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId, channel_name: channelName, value }),
    });
  },
};

export { API_BASE_URL };
