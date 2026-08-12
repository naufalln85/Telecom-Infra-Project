import { useState, useEffect, useCallback } from "react";
import {
  Radio, RefreshCw, Send, Activity, Wifi, Globe, Server,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2,
  Clock, Zap, Hash
} from "lucide-react";
import { gatewayAPI } from "../../services/api";

const PROTOCOL_CONFIG = {
  HTTP: {
    icon: Globe,
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    port: 3000,
    desc: "REST API — POST /api/v1/telemetry"
  },
  MQTT: {
    icon: Wifi,
    color: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.15)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    port: 1884,
    desc: "Broker Aedes — Topic: telemetry/data"
  },
  CoAP: {
    icon: Radio,
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    port: 5683,
    desc: "UDP Server — POST /telemetry"
  },
};

function GatewayView() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testForm, setTestForm] = useState({
    apiKey: "key_greenhouse_123",
    deviceId: "sensor-greenhouse-01",
    temperature: "28.5",
    humidity: "65.0",
  });
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        gatewayAPI.getStats(),
        gatewayAPI.getLogs(30),
      ]);
      setStats(statsRes);
      setLogs(logsRes?.data || []);
    } catch {
      // backend not reachable — use empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleTestSend = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await gatewayAPI.sendTestData(testForm.apiKey, {
        device_id: testForm.deviceId.trim(),
        temperature: Number(testForm.temperature),
        humidity: Number(testForm.humidity),
      });
      setTestResult({ success: true, data: result });
      // Refresh data after send
      setTimeout(fetchData, 1000);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const totalMessages = stats?.total || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* ── HEADER ── */}
      <div className="hero-bento-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>
            <Radio style={{ color: "var(--emerald-neon)" }} /> Gateway Monitor
          </h1>
          <p>IoT Protocol Gateway (Modul B) — Multi-Protocol Ingestion: HTTP • MQTT • CoAP</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className={`btn-glass-pill ${autoRefresh ? "active" : ""}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={autoRefresh ? { background: "rgba(16, 185, 129, 0.2)", borderColor: "rgba(16, 185, 129, 0.4)" } : {}}
          >
            <Activity size={14} />
            {autoRefresh ? "Live ●" : "Auto Refresh"}
          </button>
          <button type="button" className="btn-emerald-primary" onClick={fetchData}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> {loading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── PROTOCOL STATUS CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {Object.entries(PROTOCOL_CONFIG).map(([name, cfg]) => {
          const Icon = cfg.icon;
          const count = stats?.protocols?.[name]?.count || 0;
          return (
            <div key={name} className="widget-bento-card" style={{ gap: 16 }}>
              <div className="card-header-bento">
                <h3 style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: cfg.bgColor, border: `1px solid ${cfg.borderColor}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon size={18} style={{ color: cfg.color }} />
                  </span>
                  {name} Protocol
                </h3>
                <span
                  style={{
                    fontSize: 11, fontWeight: 700,
                    background: "rgba(16, 185, 129, 0.15)", color: "#10B981",
                    padding: "4px 10px", borderRadius: 999,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <CheckCircle2 size={12} /> Active
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: cfg.color }}>
                  {count}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                  pesan diterima
                </span>
              </div>

              <div style={{
                fontSize: 12, color: "var(--text-secondary)",
                borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10,
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Port</span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{cfg.port}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Endpoint</span>
                  <span style={{ fontWeight: 700, color: cfg.color, fontSize: 11 }}>
                    {stats?.protocols?.[name]?.endpoint || stats?.protocols?.[name]?.topic || stats?.protocols?.[name]?.resource || cfg.desc}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── STATS OVERVIEW BAR ── */}
      <div
        className="widget-bento-card"
        style={{
          flexDirection: "row", display: "flex", alignItems: "center",
          justifyContent: "space-around", padding: "20px 30px", gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>Total Pesan</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--emerald-neon)", lineHeight: 1.2 }}>{totalMessages}</div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>Errors</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: stats?.errors > 0 ? "#EF4444" : "var(--text-primary)", lineHeight: 1.2 }}>
            {stats?.errors || 0}
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>HTTP</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: PROTOCOL_CONFIG.HTTP.color, lineHeight: 1.2 }}>
            {stats?.protocols?.HTTP?.count || 0}
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>MQTT</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: PROTOCOL_CONFIG.MQTT.color, lineHeight: 1.2 }}>
            {stats?.protocols?.MQTT?.count || 0}
          </div>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>CoAP</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: PROTOCOL_CONFIG.CoAP.color, lineHeight: 1.2 }}>
            {stats?.protocols?.CoAP?.count || 0}
          </div>
        </div>
      </div>

      {/* ── TWO COLUMN: TEST PANEL + LOGS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }}>
        {/* TEST PANEL */}
        <div className="widget-bento-card" style={{ gap: 14 }}>
          <div className="card-header-bento">
            <h3 style={{ fontSize: 16 }}>
              <span className="card-header-icon"><Send size={16} /></span>
              Test HTTP Ingestion
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
              API Key (x-api-key)
            </label>
            <input
              className="no-drag"
              value={testForm.apiKey}
              onChange={(e) => setTestForm(p => ({ ...p, apiKey: e.target.value }))}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 13,
                fontFamily: "monospace", outline: "none",
              }}
            />

            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Device ID</label>
            <input
              className="no-drag"
              value={testForm.deviceId}
              onChange={(e) => setTestForm(p => ({ ...p, deviceId: e.target.value }))}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 13, outline: "none",
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Temperature (°C)</label>
                <input
                  className="no-drag"
                  type="number"
                  value={testForm.temperature}
                  onChange={(e) => setTestForm(p => ({ ...p, temperature: e.target.value }))}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                    padding: "10px 14px", color: "white", fontSize: 13, outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Humidity (%)</label>
                <input
                  className="no-drag"
                  type="number"
                  value={testForm.humidity}
                  onChange={(e) => setTestForm(p => ({ ...p, humidity: e.target.value }))}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                    padding: "10px 14px", color: "white", fontSize: 13, outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-emerald-primary"
              onClick={handleTestSend}
              disabled={testLoading}
              style={{ marginTop: 6, justifyContent: "center" }}
            >
              {testLoading ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
              {testLoading ? "Mengirim..." : "Kirim Data Test ke Gateway"}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              style={{
                background: testResult.success
                  ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${testResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                borderRadius: 12, padding: 14, fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6, color: testResult.success ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 6 }}>
                {testResult.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {testResult.success ? "Berhasil Diterima!" : "Gagal!"}
              </div>
              <pre style={{
                margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all",
                color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 11,
                maxHeight: 160, overflow: "auto",
              }}>
                {JSON.stringify(testResult.success ? testResult.data : testResult.error, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* LIVE LOGS TABLE */}
        <div className="widget-bento-card" style={{ gap: 14, overflow: "hidden" }}>
          <div className="card-header-bento">
            <h3 style={{ fontSize: 16 }}>
              <span className="card-header-icon"><Activity size={16} /></span>
              Telemetry Ingestion Log
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
              background: "rgba(16, 185, 129, 0.15)", color: "#10B981",
            }}>
              {logs.length} entries
            </span>
          </div>

          <div style={{ overflow: "auto", maxHeight: 480 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 700, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>#</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 700, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Protocol</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 700, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Device</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 700, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Data</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 700, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>
                      <Server size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div>Belum ada data masuk. Kirim data test atau hubungkan device ke gateway.</div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const cfg = PROTOCOL_CONFIG[log.protocol] || PROTOCOL_CONFIG.HTTP;
                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                          <Hash size={11} style={{ opacity: 0.5 }} /> {log.id}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: cfg.bgColor, color: cfg.color,
                            padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11,
                          }}>
                            {log.protocol}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {log.device_name || `Device #${log.device_id}`}
                        </td>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11, color: "var(--text-secondary)" }}>
                          {log.data?.temperature != null && (
                            <span style={{ marginRight: 8 }}>🌡️ {log.data.temperature}°C</span>
                          )}
                          {log.data?.humidity != null && (
                            <span>💧 {log.data.humidity}%</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} />
                          {log.received_at ? new Date(log.received_at).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── HOW TO CONNECT GUIDE ── */}
      <div className="widget-bento-card" style={{ gap: 16 }}>
        <div className="card-header-bento">
          <h3 style={{ fontSize: 16 }}>
            <span className="card-header-icon"><Zap size={16} /></span>
            Panduan Koneksi Device ke Gateway
          </h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {/* HTTP */}
          <div style={{
            background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)",
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: PROTOCOL_CONFIG.HTTP.color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Globe size={16} /> HTTP (curl)
            </div>
            <pre style={{
              margin: 0, fontSize: 11, color: "var(--text-secondary)",
              fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.5,
            }}>{`curl -X POST http://<GATEWAY_IP>:3000/api/v1/telemetry \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: <API_KEY>" \\
  -d '{"device_id":"sensor-01",
       "temperature":28.5,
       "humidity":65.0}'`}</pre>
          </div>

          {/* MQTT */}
          <div style={{
            background: "rgba(139, 92, 246, 0.06)", border: "1px solid rgba(139, 92, 246, 0.15)",
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: PROTOCOL_CONFIG.MQTT.color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Wifi size={16} /> MQTT (mosquitto)
            </div>
            <pre style={{
              margin: 0, fontSize: 11, color: "var(--text-secondary)",
              fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.5,
            }}>{`mosquitto_pub -h <GATEWAY_IP> -p 1884 \\
  -t telemetry/data \\
  -u "" -P "<API_KEY>" \\
  -m '{"device_id":"sensor-01",
       "temperature":28.5,
       "humidity":65.0}'`}</pre>
          </div>

          {/* CoAP */}
          <div style={{
            background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.15)",
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: PROTOCOL_CONFIG.CoAP.color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Radio size={16} /> CoAP (coap-client)
            </div>
            <pre style={{
              margin: 0, fontSize: 11, color: "var(--text-secondary)",
              fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.5,
            }}>{`coap-client -m post \\
  coap://<GATEWAY_IP>:5683/telemetry \\
  -O authorization,<API_KEY> \\
  -e '{"device_id":"sensor-01",
       "temperature":28.5,
       "humidity":65.0}'`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GatewayView;
