const API_BASE_URL = "http://localhost:8000";

const getToken = () => localStorage.getItem("tip_jwt_token");
const setToken = (token) => localStorage.setItem("tip_jwt_token", token);
const removeToken = () => localStorage.removeItem("tip_jwt_token");

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || data.message || "Terjadi kesalahan pada server API.");
  }

  return data;
}

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

  getToken,
};

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
    return await apiFetch(`/api/v1/projects/${projectId}`, {
      method: "DELETE",
    });
  },
};

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

export const rulesAPI = {
  async list(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}/rules`);
  },
};

export const alertHistoryAPI = {
  async list(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}/alerts/history`);
  },
};

export const notifChannelsAPI = {
  async list(projectId) {
    return await apiFetch(`/api/v1/projects/${projectId}/notifications/channels`);
  },
};

export const dashboardAPI = {
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

export const gatewayAPI = {
  async getLogs(limit = 50) {
    return await apiFetch(`/api/v1/gateway/logs?limit=${limit}`);
  },

  async getStats() {
    return await apiFetch("/api/v1/gateway/stats");
  },

  async sendTestData(apiKey, deviceId, temperature, humidity) {
    // Kirim data test langsung ke HTTP gateway endpoint
    const GATEWAY_URL = window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : `http://${window.location.hostname}:3000`;

    const response = await fetch(`${GATEWAY_URL}/api/v1/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        device_id: deviceId,
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
      }),
    });
    return await response.json();
  },
};
