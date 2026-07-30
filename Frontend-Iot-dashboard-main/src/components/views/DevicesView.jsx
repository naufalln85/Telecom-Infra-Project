import { useState, useEffect } from "react";
import {
  Cpu, Plus, Search, Filter, Grid, List, RefreshCw, Key,
  CheckCircle2, AlertCircle, Copy, Trash2, ExternalLink
} from "lucide-react";
import { devicesAPI, projectsAPI } from "../../services/api";

function DevicesView({ activeProjectId, onSelectDevice }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  // New Device Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [createdDeviceKey, setCreatedDeviceKey] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const targetProjId = activeProjectId || 1;
      const res = await devicesAPI.list(targetProjId);
      if (res && res.data) {
        setDevices(res.data);
      }
    } catch {
      // Fallback staging mock list if DB empty
      setDevices([
        {
          id: 1,
          name: "Quickstart Device (Greenhouse Node)",
          status: "Offline",
          last_reported_at: "11:25 AM Jul 2, 2026",
          api_key_hash: "8a12dbe8a6bc943a4163ad4d..."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [activeProjectId]);

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    setIsSubmitting(true);
    try {
      const targetProjId = activeProjectId || 1;
      const res = await devicesAPI.create(targetProjId, newDeviceName);
      if (res && res.data) {
        setCreatedDeviceKey(res.data.api_key);
        fetchDevices();
      }
    } catch (err) {
      alert("Gagal menambahkan device: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("API Key tersalin ke clipboard!");
  };

  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="blynk-devices-container">
      {/* ── TOP TITLE & ACTION BAR (Matching Image 3) ── */}
      <div className="blynk-devices-header">
        <h1 className="blynk-page-title">Devices</h1>

        <button
          type="button"
          className="btn-blynk-green-action"
          onClick={() => { setIsAddModalOpen(true); setCreatedDeviceKey(null); setNewDeviceName(""); }}
        >
          <Plus size={16} /> New Device
        </button>
      </div>

      {/* ── TOOLBAR: SEARCH & FILTERS ── */}
      <div className="blynk-devices-toolbar">
        <div className="blynk-search-input-box">
          <Search size={16} className="search-icon" />
          <input
            placeholder="Start typing..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button type="button" className="btn-blynk-toolbar-filter">
          <Filter size={14} /> Add Filter
        </button>

        <div className="blynk-devices-filter-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All {filteredDevices.length}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "my" ? "active" : ""}`}
            onClick={() => setActiveTab("my")}
          >
            My devices
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <button type="button" className="btn-icon-square" onClick={fetchDevices} title="Refresh Devices">
          <RefreshCw size={15} className={loading ? "spin" : ""} />
        </button>

        <div className="blynk-view-mode-toggle">
          <button
            type="button"
            className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <Grid size={16} />
          </button>
        </div>
      </div>

      {/* ── DEVICES DATA TABLE (Matching Image 3) ── */}
      {viewMode === "table" ? (
        <div className="blynk-table-card">
          <table className="blynk-data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" /></th>
                <th>Name</th>
                <th>Status</th>
                <th>Last Reported At</th>
                <th>API Key Hash / Token</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                    <Cpu size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>Belum ada device terdaftar di project ini. Klik <b>+ New Device</b> untuk membuat device baru.</div>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id}>
                    <td><input type="checkbox" /></td>
                    <td className="device-name-cell">
                      <div className="device-cube-icon"><Cpu size={16} /></div>
                      <div>
                        <strong>{device.name}</strong>
                        <span className="device-sub-info">ID: #{device.id}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge-pill ${device.status === "Online" ? "online" : "offline"}`}>
                        <span className="dot" />
                        {device.status || "Offline"}
                      </span>
                    </td>
                    <td className="time-cell">
                      {device.last_reported_at || device.created_at || "11:25 AM Jul 2, 2026"}
                    </td>
                    <td className="hash-cell">
                      <code>{device.api_key_hash ? device.api_key_hash.substring(0, 16) + "..." : "sha256:hashed"}</code>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn-action-sm"
                        onClick={() => onSelectDevice && onSelectDevice(device)}
                      >
                        View Channels <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="blynk-devices-grid">
          {filteredDevices.map((device) => (
            <div key={device.id} className="blynk-device-card-item">
              <div className="device-card-top">
                <div className="device-cube-icon"><Cpu size={20} /></div>
                <span className={`status-badge-pill ${device.status === "Online" ? "online" : "offline"}`}>
                  <span className="dot" /> {device.status || "Offline"}
                </span>
              </div>
              <h4>{device.name}</h4>
              <p className="device-sub-info">Device ID: #{device.id}</p>
              <div className="device-card-footer">
                <span>Last report: {device.last_reported_at || "Jul 2, 2026"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REGISTER NEW DEVICE MODAL ── */}
      {isAddModalOpen && (
        <div className="blynk-modal-overlay">
          <div className="blynk-modal-box">
            <h3>Add New Device</h3>
            <p>Daftarkan perangkat IoT baru ke database PostgreSQL. API Key SHA-256 akan di-generate otomatis.</p>

            {!createdDeviceKey ? (
              <form onSubmit={handleCreateDevice} style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label>Device Name</label>
                  <input
                    required
                    placeholder="Contoh: Sensor Suhu Kebun #01"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-blynk-outlined" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-blynk-green-action" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Device"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div className="success-key-box">
                  <div style={{ color: "#22C55E", fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={16} /> Device Berhasil Didaftarkan!
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
                    Simpan API Key ini di firmware perangkat Anda (ESP32/Arduino/MQTT). API Key hanya ditampilkan <b>sekali ini</b>!
                  </p>
                  <div className="key-display-row">
                    <code>{createdDeviceKey}</code>
                    <button type="button" className="btn-icon-square" onClick={() => copyToClipboard(createdDeviceKey)}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="btn-blynk-green-action" onClick={() => setIsAddModalOpen(false)}>
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DevicesView;
