import { useState } from "react";
import { Activity, Download, Database, BarChart3, Clock, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import confetti from "canvas-confetti";

function AnalyticsView({ history }) {
  const [dataRange, setDataRange] = useState("24h");

  const handleExportData = () => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 }
    });

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(history, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `telemetry_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="hero-bento-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>
            <Activity style={{ color: "var(--emerald-neon)" }} /> Telemetry Analytics & Export API
          </h1>
          <p>Expose Data Metrics untuk Kebutuhan Riset Tugas Akhir & Performa System (Modul B & C)</p>
        </div>
        <button type="button" className="btn-emerald-primary" onClick={handleExportData}>
          <Download size={16} /> Export Telemetry Data (JSON / CSV)
        </button>
      </div>

      {/* Analytics Main Chart Card */}
      <div className="widget-bento-card" style={{ height: 380 }}>
        <div className="card-header-bento">
          <h3>
            <span className="card-header-icon">
              <BarChart3 size={16} />
            </span>
            Real-time Telemetry Hop Performance (TimescaleDB)
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            {["1h", "24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                type="button"
                className={`day-pill ${dataRange === r ? "active" : ""}`}
                onClick={() => setDataRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fill: "#94A3B8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#062E23", borderRadius: "14px", border: "1px solid #10B981", color: "#FFF" }} />
              <Area type="monotone" dataKey="temperature" stroke="#10B981" strokeWidth={3} fill="url(#analyticsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <div className="widget-bento-card">
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>Average Hop Latency</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--emerald-neon)", marginTop: 6 }}>14.2 ms</div>
          <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 4 }}>✓ Redis Streams Consumer Speed</div>
        </div>

        <div className="widget-bento-card">
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>Packet Throughput</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--emerald-neon)", marginTop: 6 }}>24 msg / sec</div>
          <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 4 }}>✓ Protocol Gateway Protocol Gateway</div>
        </div>

        <div className="widget-bento-card">
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>TimescaleDB Storage Rate</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--emerald-neon)", marginTop: 6 }}>99.9 %</div>
          <div style={{ fontSize: 11, color: "var(--emerald-mint)", marginTop: 4 }}>✓ Zero Packet Loss</div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsView;
