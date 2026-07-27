import { useState, useEffect } from "react";
import { Zap, AlertTriangle, ShieldCheck, Plus, Clock, Check, X } from "lucide-react";
import confetti from "canvas-confetti";
import { dashboardAPI } from "../../services/api";

function AlertsView() {
  const [rules, setRules] = useState([
    {
      id: "rule-1",
      channel: "temperature",
      operator: ">",
      threshold: 30.0,
      unit: "°C",
      cooldown: 60,
      active: true,
      target: "Telegram Bot & Webhook"
    },
    {
      id: "rule-2",
      channel: "humidity",
      operator: "<",
      threshold: 40.0,
      unit: "% RH",
      cooldown: 120,
      active: true,
      target: "Email Dispatcher"
    }
  ]);

  const [history, setHistory] = useState([
    { id: "h-1", rule: "Temperature > 30.0 °C", value: 31.4, time: "00:30:14", status: "Notified (Telegram)" },
    { id: "h-2", rule: "Humidity < 40.0 % RH", value: 38.2, time: "23:15:00", status: "Notified (Email)" }
  ]);

  useEffect(() => {
    async function loadAlertData() {
      try {
        const res = await dashboardAPI.getData();
        if (res && res.rules && res.rules.length > 0) {
          const loadedRules = res.rules.map((r) => ({
            id: `rule-${r.id}`,
            channel: `channel-${r.channel_id}`,
            operator: r.operator,
            threshold: r.threshold_value,
            unit: "unit",
            cooldown: r.cooldown_seconds,
            active: r.is_active,
            target: "Telegram Bot / Email"
          }));
          setRules(loadedRules);
        }

        if (res && res.history && res.history.length > 0) {
          const loadedHistory = res.history.map((h) => ({
            id: `h-${h.id}`,
            rule: `Rule #${h.alert_rule_id}`,
            value: h.value_at_trigger,
            time: new Date(h.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "Triggered & Dispatched"
          }));
          setHistory(loadedHistory);
        }
      } catch {
        // use fallback mock data if API is not reachable
      }
    }
    loadAlertData();
  }, []);

  const toggleRule = (id) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="hero-bento-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>
            <Zap style={{ color: "var(--emerald-neon)" }} /> Alert Engine & Cooldown Rules
          </h1>
          <p>Evaluasi Event Threshold Per Data Point & Dispatch Notifikasi Multi-Channel (Modul A)</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Active Alert Rules Table */}
        <div className="widget-bento-card">
          <div className="card-header-bento">
            <h3>
              <span className="card-header-icon">
                <ShieldCheck size={16} />
              </span>
              Active Threshold Rules (`active_alert_rules` View)
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "rgba(3, 18, 12, 0.7)",
                  border: "1px solid var(--glass-card-border)",
                  borderRadius: 18
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                    {rule.channel} {rule.operator} {rule.threshold} {rule.unit}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>
                    Cooldown: {rule.cooldown}s • Target: {rule.target}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-glass-pill"
                  onClick={() => toggleRule(rule.id)}
                  style={{
                    background: rule.active ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)",
                    borderColor: rule.active ? "var(--emerald-neon)" : "transparent",
                    color: rule.active ? "#A7F3D0" : "#94A3B8",
                    padding: "6px 14px",
                    fontSize: 12
                  }}
                >
                  {rule.active ? "● ENABLED" : "○ DISABLED"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Alert History Audit Record */}
        <div className="widget-bento-card">
          <div className="card-header-bento">
            <h3>
              <span className="card-header-icon">
                <Clock size={16} />
              </span>
              Alert History Audit Record (`alert_history`)
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 16
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#FCA5A5" }}>
                    ⚠️ {item.rule} (Triggered at {item.value})
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {item.time} • Status: {item.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertsView;
