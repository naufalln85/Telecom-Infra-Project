import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

function ChartWidget({ title, data, dataKey, unit }) {
  const [selectedDay, setSelectedDay] = useState("W");
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="widget-bento-card">
      <div className="card-header-bento" style={{ marginBottom: 8 }}>
        <h3>
          <span className="card-header-icon">
            <TrendingUp size={16} />
          </span>
          {title || "Telemetry Analytics"}
        </h3>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary-emerald)", background: "var(--emerald-badge-bg)", padding: "4px 12px", borderRadius: 999 }}>
          6.1h Work Time
        </span>
      </div>

      <div className="day-selector-pills">
        {days.map((day, idx) => (
          <button
            key={idx}
            type="button"
            className={`day-pill ${selectedDay === day && idx === 3 ? "active" : ""}`}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="chart-widget-body">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldSplineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "#64748B", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderColor: "transparent",
                borderRadius: "16px",
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: "700"
              }}
              itemStyle={{ color: "#A7F3D0" }}
              formatter={(val) => [`${val} ${unit || "°C"}`, title || "Telemetry"]}
            />

            <Area
              type="monotone"
              dataKey={dataKey || "temperature"}
              stroke="#10B981"
              strokeWidth={3.5}
              fillOpacity={1}
              fill="url(#emeraldSplineGrad)"
              dot={{ r: 4, fill: "#10B981", stroke: "#FFFFFF", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: "#047857", stroke: "#FFFFFF", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartWidget;