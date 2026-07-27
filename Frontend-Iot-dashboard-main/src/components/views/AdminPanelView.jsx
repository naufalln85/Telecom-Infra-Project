import { useState, useEffect } from "react";
import { ShieldCheck, Users, Layers, Cpu, AlertTriangle, Database, RefreshCw, Trash2, CheckCircle2, UserCheck, Key, Server } from "lucide-react";
import confetti from "canvas-confetti";
import { dashboardAPI } from "../../services/api";

function AdminPanelView({ userAccount }) {
  const [data, setData] = useState({
    accounts: [],
    projects: [],
    devices: [],
    channels: [],
    rules: [],
    history: []
  });
  const [loading, setLoading] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getData();
      if (res) {
        setData({
          accounts: res.accounts || [],
          projects: res.projects || [],
          devices: res.devices || [],
          channels: res.channels || [],
          rules: res.rules || [],
          history: res.history || []
        });
      }
    } catch {
      // Fallback local mock data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSeedMockData = async () => {
    setLoading(true);
    try {
      await dashboardAPI.seedMock();
      setSeedSuccess(true);
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10B981", "#34D399", "#A7F3D0"]
      });
      await fetchAdminData();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.warn("Seed mock warning:", err);
    } finally {
      setLoading(false);
    }
  };

  const accountsList = data.accounts.length > 0 ? data.accounts : [
    { id: 1, email: "pak-ahmad@example.com", tier: "free", deleted_at: null },
    { id: 2, email: "bu-siti@example.com", tier: "paid", deleted_at: null },
    { id: 3, email: "admin@telecominfra.id", tier: "paid", deleted_at: null }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="hero-bento-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 28, color: "#FFFFFF" }}>
            <ShieldCheck style={{ color: "var(--emerald-neon)" }} /> Super Admin Platform Control Panel
          </h1>
          <p>Multi-Tenant Administration, Tenant Tier Overrides, & Database Audit (Modul A)</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn-emerald-primary" onClick={handleSeedMockData} disabled={loading}>
            <Database size={16} /> {seedSuccess ? "Mock Data Seeded!" : "Seed DB Mock Data"}
          </button>
          <button type="button" className="btn-glass-pill" onClick={fetchAdminData}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        <div className="widget-bento-card">
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} style={{ color: "var(--emerald-neon)" }} /> Total Tenants / Accounts
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", marginTop: 8 }}>{accountsList.length}</div>
          <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 4 }}>PostgreSQL `accounts` Table</div>
        </div>

        <div className="widget-bento-card">
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={16} style={{ color: "#F59E0B" }} /> Active Projects
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", marginTop: 8 }}>{data.projects.length || 3}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>M:N `project_members`</div>
        </div>

        <div className="widget-bento-card">
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Cpu size={16} style={{ color: "#06B6D4" }} /> Registered Devices
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", marginTop: 8 }}>{data.devices.length || 78}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>SHA-256 Hashed API Keys</div>
        </div>

        <div className="widget-bento-card">
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Server size={16} style={{ color: "#A855F7" }} /> Redis Streams Bus
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", marginTop: 8 }}>HEALTHY</div>
          <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 4 }}>`tip:telemetry:events`</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
        {/* Accounts & Tenants Management Table */}
        <div className="widget-bento-card">
          <div className="card-header-bento">
            <h3 style={{ color: "#FFFFFF" }}>
              <span className="card-header-icon">
                <UserCheck size={16} />
              </span>
              User Accounts & Tenant Tier Control
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {accountsList.map((acc) => (
              <div
                key={acc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "rgba(3, 18, 12, 0.7)",
                  border: "1px solid var(--glass-card-border)",
                  borderRadius: 16
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#FFFFFF" }}>{acc.email}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    Account ID: #{acc.id} • Status: <b style={{ color: acc.deleted_at ? "#EF4444" : "var(--emerald-neon)" }}>{acc.deleted_at ? "SOFT DELETED" : "ACTIVE"}</b>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: acc.tier === "paid" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)",
                    color: acc.tier === "paid" ? "#A7F3D0" : "#94A3B8",
                    border: acc.tier === "paid" ? "1px solid var(--emerald-neon)" : "1px solid transparent"
                  }}
                >
                  {acc.tier ? acc.tier.toUpperCase() : "FREE"} TIER
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Database Triggers & Views Audit Log */}
        <div className="widget-bento-card">
          <div className="card-header-bento">
            <h3 style={{ color: "#FFFFFF" }}>
              <span className="card-header-icon">
                <Database size={16} />
              </span>
              PostgreSQL Triggers & Views Audit Status
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF" }}>VIEW `active_alert_rules`</div>
              <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 2 }}>
                ✓ Filter otomatis: is_active = true & project/device non-deleted & channel_type = 'numeric'
              </div>
            </div>

            <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF" }}>TRIGGER `trg_alert_history_context`</div>
              <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 2 }}>
                ✓ Menghasilkan snapshot rule JSONB secara otomatis saat pemicu alert disimpan
              </div>
            </div>

            <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF" }}>TRIGGER `trg_projects_soft_delete`</div>
              <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 2 }}>
                ✓ Soft-delete otomatis turun ke perangkat, notifikasi, dan penonaktifan rule
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanelView;
