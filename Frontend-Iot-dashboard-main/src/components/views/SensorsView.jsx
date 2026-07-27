import { useState, useEffect } from "react";
import { Cpu, RefreshCw, Activity, ShieldCheck, Thermometer, Droplets, Zap, Eye } from "lucide-react";
import { dashboardAPI } from "../../services/api";

function SensorsView({ sensorData }) {
  const [filterType, setFilterType] = useState("all");
  const [dbChannels, setDbChannels] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getData();
      if (res && res.channels && res.channels.length > 0) {
        setDbChannels(res.channels);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const defaultSensorList = [
    {
      id: "ch-01",
      name: "Air Temperature",
      deviceId: "node-01",
      channel: "temperature",
      type: "numeric",
      value: sensorData.temperature || 26.8,
      unit: "°C",
      status: "Optimal",
      signal: "-58 dBm",
      lastUpdate: "Just now"
    },
    {
      id: "ch-02",
      name: "Soil Humidity",
      deviceId: "node-01",
      channel: "humidity",
      type: "numeric",
      value: sensorData.humidity || 68.4,
      unit: "% RH",
      status: "Optimal",
      signal: "-58 dBm",
      lastUpdate: "Just now"
    },
    {
      id: "ch-03",
      name: "GPS Latitude",
      deviceId: "node-01",
      channel: "latitude",
      type: "geo",
      value: sensorData.latitude || -6.914744,
      unit: "deg",
      status: "Locked",
      signal: "-60 dBm",
      lastUpdate: "2 min ago"
    },
    {
      id: "ch-04",
      name: "GPS Longitude",
      deviceId: "node-01",
      channel: "longitude",
      type: "geo",
      value: sensorData.longitude || 107.60981,
      unit: "deg",
      status: "Locked",
      signal: "-60 dBm",
      lastUpdate: "2 min ago"
    },
    {
      id: "ch-05",
      name: "AI Camera Stream",
      deviceId: "node-01",
      channel: "ai_image",
      type: "image",
      value: "ONNX Leaf Detection",
      unit: "Feed",
      status: "Active",
      signal: "-52 dBm",
      lastUpdate: "Just now"
    }
  ];

  const sensorList = dbChannels.length > 0
    ? dbChannels.map((c) => ({
        id: `ch-${c.id}`,
        name: c.name.charAt(0).toUpperCase() + c.name.slice(1),
        deviceId: `device-${c.device_id}`,
        channel: c.name,
        type: c.channel_type,
        value: sensorData[c.name] ?? (c.channel_type === "numeric" ? 25.5 : c.channel_type === "boolean" ? "ACTIVE" : "OK"),
        unit: c.unit || "",
        status: "Optimal",
        signal: "-58 dBm",
        lastUpdate: "Just now"
      }))
    : defaultSensorList;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="hero-bento-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>
            <Cpu style={{ color: "var(--emerald-neon)" }} /> Sensors Management
          </h1>
          <p>Daftar Data Channel Telemetri Perangkat Active (PostgreSQL / TimescaleDB)</p>
        </div>
        <button type="button" className="btn-emerald-primary" onClick={fetchChannels}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> {loading ? "Syncing..." : "Sync Sensor Channels"}
        </button>
      </div>

      {/* Sensor Metric Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {sensorList.map((sensor) => (
          <div key={sensor.id} className="widget-bento-card" style={{ gap: 14 }}>
            <div className="card-header-bento">
              <h3 style={{ fontSize: 16 }}>
                <span className="card-header-icon">
                  <Activity size={16} />
                </span>
                {sensor.name}
              </h3>
              <span style={{ fontSize: 11, fontWeight: 700, background: "var(--emerald-soft-bg)", color: "var(--emerald-neon)", padding: "3px 8px", borderRadius: 999 }}>
                {sensor.type}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyBetween: "space-between" }}>
              <div>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>
                  {typeof sensor.value === "number" ? sensor.value.toFixed(1) : sensor.value}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--emerald-mint)", marginLeft: 6 }}>
                  {sensor.unit}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
              <span>Device: <b>{sensor.deviceId}</b></span>
              <span>Signal: <b>{sensor.signal}</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SensorsView;
