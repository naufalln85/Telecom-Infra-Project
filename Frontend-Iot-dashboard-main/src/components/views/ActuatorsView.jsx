import { useState } from "react";
import { Zap, Power, Sliders, Clock, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

function ActuatorsView({ sensorData, onToggle }) {
  const [actuators, setActuators] = useState([
    { id: "act-1", name: "Water Irrigation Pump", channel: "pump", state: Boolean(sensorData.pump), pin: "Relay GPIO 12", type: "boolean" },
    { id: "act-2", name: "Grow Light Dimmer", channel: "light_dimmer", state: true, value: 85, pin: "PWM GPIO 14", type: "slider" },
    { id: "act-3", name: "Exhaust Cooling Fan", channel: "cooling_fan", state: true, pin: "Relay GPIO 27", type: "boolean" },
    { id: "act-4", name: "Solenoid Water Valve", channel: "solenoid_valve", state: false, pin: "Relay GPIO 33", type: "boolean" },
  ]);

  const handleToggle = (id, channel) => {
    setActuators((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newState = !item.state;
          if (newState) {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#10B981", "#34D399", "#A7F3D0"]
            });
          }
          if (onToggle && item.channel === "pump") onToggle(newState);
          return { ...item, state: newState };
        }
        return item;
      })
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="hero-bento-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>
            <Zap style={{ color: "var(--emerald-neon)" }} /> Actuators & Automation Controls
          </h1>
          <p>Kontrol Sakelar Relai, Dimmer Light, & Automasi Irigasi (Modul A Rule Engine Integration)</p>
        </div>
      </div>

      {/* Actuators Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {actuators.map((act) => (
          <div key={act.id} className="widget-bento-card dark-theme" style={{ gap: 16 }}>
            <div className="card-header-bento">
              <h3 style={{ fontSize: 16 }}>
                <span className="card-header-icon">
                  <Power size={16} />
                </span>
                {act.name}
              </h3>
              <span style={{ fontSize: 11, fontWeight: 700, background: act.state ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)", color: act.state ? "#A7F3D0" : "#94A3B8", padding: "3px 8px", borderRadius: 999 }}>
                {act.pin}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Status Kontrol:</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: act.state ? "#A7F3D0" : "rgba(255,255,255,0.5)" }}>
                {act.state ? "● ACTIVE / RUNNING" : "○ STANDBY / OFF"}
              </span>
            </div>

            <button
              type="button"
              className={`actuator-btn-confetti ${act.state ? "is-active" : ""}`}
              onClick={() => handleToggle(act.id, act.channel)}
            >
              <Power size={16} />
              <span>{act.state ? `TURN OFF ${act.name.toUpperCase()}` : `TURN ON ${act.name.toUpperCase()}`}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActuatorsView;
