import { useState } from "react";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";

function CalendarLogWidget({ title }) {
  const [selectedDate, setSelectedDate] = useState(24);

  const dates = [
    { day: "Mon", num: 22 },
    { day: "Tue", num: 23 },
    { day: "Wed", num: 24 },
    { day: "Thu", num: 25 },
    { day: "Fri", num: 26 },
    { day: "Sat", num: 27 },
  ];

  const events = [
    {
      time: "09:00 am",
      title: "Weekly Telemetry Calibration",
      desc: "Discuss progress on sensor nodes",
      tag: "Modul B",
    },
    {
      time: "11:30 am",
      title: "AI Inference Model Run",
      desc: "ONNX Leaf Disease Detection Batch",
      tag: "Modul D",
    },
    {
      time: "02:15 pm",
      title: "Telegram Alert Rule Check",
      desc: "Threshold test & dispatch verification",
      tag: "Modul A",
    },
  ];

  return (
    <div className="widget-bento-card">
      <div className="card-header-bento" style={{ marginBottom: 10 }}>
        <h3>
          <span className="card-header-icon">
            <Calendar size={16} />
          </span>
          {title || "Activity Schedule & Logs"}
        </h3>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
          September 2024
        </span>
      </div>

      <div className="calendar-bar-container">
        {dates.map((item) => (
          <div
            key={item.num}
            className={`date-pill-item ${selectedDate === item.num ? "active" : ""}`}
            onClick={() => setSelectedDate(item.num)}
          >
            <span className="date-day-name">{item.day}</span>
            <span className="date-day-num">{item.num}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {events.map((ev, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#F8FAFC",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Clock size={16} style={{ color: "var(--primary-emerald)" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main)" }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                  {ev.time} • {ev.desc}
                </div>
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, background: "var(--emerald-badge-bg)", color: "var(--emerald-dark)", padding: "3px 8px", borderRadius: 999 }}>
              {ev.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CalendarLogWidget;
