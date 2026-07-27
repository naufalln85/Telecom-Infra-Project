import { Thermometer, Wifi, BatteryCharging, Cpu, ShieldCheck } from "lucide-react";

function StatusWidget({ title, value, unit }) {
  const displayValue = value !== undefined && value !== null ? value : "26.8";

  return (
    <div className="widget-bento-card">
      <div className="card-header-bento" style={{ marginBottom: 12 }}>
        <h3>
          <span className="card-header-icon">
            <Thermometer size={16} />
          </span>
          {title || "Smart Greenhouse Node #01"}
        </h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-emerald)", background: "var(--emerald-badge-bg)", padding: "3px 10px", borderRadius: 999 }}>
          <ShieldCheck size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> Verified Node
        </span>
      </div>

      <div className="node-hero-card">
        <img
          src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=300&q=80"
          alt="Node Sensor Hardware"
          className="node-avatar-box"
        />

        <div className="node-details-group">
          <div>
            <div className="node-title-bold">ESP32 Gateway Node</div>
            <div className="node-subtitle-muted">ID: node-01 • IP: 192.168.1.104</div>
          </div>

          <div className="node-status-online-pill">
            <span className="green-pulse-dot" />
            <span>ONLINE • 99.8% Uptime</span>
          </div>

          <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
              {displayValue}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--primary-emerald)" }}>
              {unit || "°C"}
            </span>
          </div>

          <div className="node-metric-mini-chips">
            <span className="mini-chip" title="Wi-Fi Signal Strength">
              <Wifi size={11} style={{ marginRight: 3, verticalAlign: "middle" }} /> -58 dBm
            </span>
            <span className="mini-chip" title="Battery Power">
              <BatteryCharging size={11} style={{ marginRight: 3, verticalAlign: "middle" }} /> 88%
            </span>
            <span className="mini-chip" title="Firmware Version">
              <Cpu size={11} style={{ marginRight: 3, verticalAlign: "middle" }} /> v2.4.1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatusWidget;