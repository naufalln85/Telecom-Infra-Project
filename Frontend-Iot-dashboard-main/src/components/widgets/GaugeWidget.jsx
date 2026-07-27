import { useState } from "react";
import { Gauge, Play, Pause, RotateCcw } from "lucide-react";

function GaugeWidget({ title, value, unit, min = 0, max = 100 }) {
  const [isPaused, setIsPaused] = useState(false);
  const numericValue = typeof value === "number" ? value : parseFloat(value) || 68.4;
  const percentage = Math.min(100, Math.max(0, ((numericValue - min) / (max - min)) * 100));

  const size = 136;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="widget-bento-card">
      <div className="card-header-bento">
        <h3>
          <span className="card-header-icon">
            <Gauge size={16} />
          </span>
          {title || "Soil Humidity Ring"}
        </h3>
        <span style={{ fontSize: 11, fontWeight: 700, background: "var(--emerald-badge-bg)", color: "var(--emerald-dark)", padding: "3px 8px", borderRadius: 999 }}>
          {isPaused ? "Paused" : "Live Stream"}
        </span>
      </div>

      <div className="circular-gauge-container">
        <div className="ring-svg-wrapper">
          <svg width={size} height={size}>
            <defs>
              <linearGradient id="emeraldGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            {/* Background Track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />
            {/* Progress Stroke */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="url(#emeraldGaugeGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
            />
          </svg>

          <div className="ring-center-text">
            <span className="ring-center-value">{numericValue.toFixed(1)}</span>
            <span className="ring-center-unit">{unit || "% RH"}</span>
          </div>
        </div>

        <div className="gauge-controls-bar">
          <button
            type="button"
            className="gauge-ctrl-btn"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume Stream" : "Pause Stream"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>

          <button
            type="button"
            className="gauge-ctrl-btn"
            onClick={() => setIsPaused(false)}
            title="Reset Gauge"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GaugeWidget;
