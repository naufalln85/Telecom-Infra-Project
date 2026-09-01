import React, { useEffect, useState, useCallback } from "react"
import { dashboardApi, devicesApi, telemetryApi, type Project } from "@/lib/api"
import { Btn, Card, GaugeSVG, Icon, Toggle } from "@/components/Shared"
import { C, WIDGET_CATALOG, type Widget, type WidgetType } from "@/lib/theme"

const DEFAULT_10_WIDGETS: Widget[] = [
  { id: "w1", type: "stat-devices", title: "DEVICES ONLINE", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "temperature", unit: "", colorTheme: "coral" } },
  { id: "w2", type: "stat-messages", title: "MESSAGES TODAY", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "temperature", unit: "", colorTheme: "purple" } },
  { id: "w3", type: "stat-temp", title: "AVG TEMPERATURE", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "temperature", unit: "°C", colorTheme: "magenta" } },
  { id: "w4", type: "stat-power", title: "POWER USAGE", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "power", unit: "kWh", colorTheme: "amber" } },
  { id: "w5", type: "chart-telemetry", title: "TELEMETRY STREAM", colSpan: 2, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "temperature", unit: "", colorTheme: "coral" } },
  { id: "w6", type: "gauge-temp", title: "TEMPERATURE", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "temperature", unit: "°C", colorTheme: "coral", min: 0, max: 50 } },
  { id: "w7", type: "gauge-humidity", title: "HUMIDITY", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "humidity", unit: "%", colorTheme: "teal", min: 0, max: 100 } },
  { id: "w8", type: "switch-panel", title: "RELAY CONTROL", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "relay", unit: "", colorTheme: "coral" } },
  { id: "w9", type: "chart-power", title: "POWER CHART", colSpan: 1, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "power", unit: "kWh", colorTheme: "magenta" } },
  { id: "w10", type: "device-list", title: "DEVICE MANAGER", colSpan: 2, rowSpan: 1, visible: true, config: { device: "All Devices", channel: "devices", unit: "", colorTheme: "purple" } },
]

// ── Sparkbar ──────────────────────────────────────────────────────────────────
function Sparkbar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: "flex", gap: 3, height: 5, alignItems: "flex-end", marginTop: 14 }}>
      {(values.length ? values : [0, 0, 0, 0, 0, 0, 0, 0]).slice(-8).map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max((v / max) * 100, 8)}%`, background: values.length ? color : `${color}22`, borderRadius: 2, transition: "height .3s" }} />
      ))}
    </div>
  )
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────
function LineChart({ data, color, height = 110 }: { data: number[]; color: string; height?: number }) {
  if (!data.length) return (
    <div style={{ height, border: "1px dashed var(--c-border)", borderRadius: 8, display: "grid", placeItems: "center", color: C.muted, fontSize: 12 }}>No data yet</div>
  )
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const W = 1000, H = height
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W
    const y = H - ((v - min) / range) * (H - 12) - 6
    return `${x},${y}`
  }).join(" ")
  const gid = `g${color.replace(/[^a-z0-9]/gi, "").slice(0, 8)}`
  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {data.length > 1 && <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gid})`} />}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ── Bar Chart (power chart) ────────────────────────────────────────────────────
function BarChart({ data, color, height = 72 }: { data: number[]; color: string; height?: number }) {
  const src = data.length ? data.slice(-7) : [3.2, 4.1, 3.8, 4.5, 3.9, 4.2, 4.8]
  const max = Math.max(...src, 1)
  return (
    <div style={{ height, display: "flex", gap: 4, alignItems: "flex-end" }}>
      {src.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max((v / max) * 100, 4)}%`, background: i === src.length - 1 ? color : `${color}66`, borderRadius: "3px 3px 0 0", transition: "height .3s" }} />
      ))}
    </div>
  )
}

// ── Widget Library Sidebar ─────────────────────────────────────────────────────
function WidgetLibrary({ onAdd, onClose }: { onAdd: (type: WidgetType) => void; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const filtered = WIDGET_CATALOG.filter(e => (category === "all" || e.category === category) && `${e.label} ${e.desc}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.5)", backdropFilter: "blur(2px)" }}>
      <aside onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 360, maxWidth: "92vw", background: C.surface, borderLeft: `1px solid ${C.border}`, boxShadow: "-16px 0 48px rgba(0,0,0,.4)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 20, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <b style={{ fontSize: 17, color: C.light }}>Widget Library</b>
            <button onClick={onClose} style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer" }}><Icon name="close" /></button>
          </div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari widget..."
            style={{ width: "100%", padding: "9px 12px", color: C.light, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
          <div style={{ display: "flex", gap: 5, marginTop: 12, flexWrap: "wrap" as const }}>
            {["all", "stats", "gauges", "sensors", "charts", "controls", "utilities"].map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{ border: 0, borderRadius: 7, padding: "4px 8px", background: category === cat ? `${C.coral}22` : C.surface2, color: category === cat ? C.coral : C.muted, cursor: "pointer", fontSize: 10, fontWeight: 700, textTransform: "capitalize" as const, fontFamily: "inherit" }}>{cat}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: 14, display: "grid", gap: 8 }}>
          {filtered.map(entry => (
            <button key={entry.type} onClick={() => { onAdd(entry.type); onClose() }} style={{ display: "flex", textAlign: "left", gap: 12, alignItems: "center", padding: 12, border: `1px solid ${C.border}`, borderRadius: 11, background: C.surface2, cursor: "pointer", fontFamily: "inherit", transition: "border-color .12s" }}>
              <div style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: `${C.coral}18`, flexShrink: 0 }}>
                <Icon name={entry.icon} size={15} color={C.coral} />
              </div>
              <div>
                <b style={{ color: C.light, fontSize: 12 }}>{entry.label}</b>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{entry.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}

// ── Stateful widget sub-components ───────────────────────────────────────────
function ChartTelemetryWidget({ color, allPayloads }: { color: string; allPayloads: Record<string, number[]> }) {
  const keys = Object.keys(allPayloads)
  const [activeKey, setActiveKey] = useState(keys[0] ?? "TEMPERATURE")
  React.useEffect(() => { if (!activeKey && keys.length) setActiveKey(keys[0]) }, [keys.join(",")])
  const chartData = activeKey && allPayloads[activeKey] ? allPayloads[activeKey].slice(-20) : [23.4, 23.6, 23.5, 23.8, 23.4, 23.2, 23.5]
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>TELEMETRY STREAM</div>
        <div style={{ display: "flex", gap: 5 }}>
          {["TEMPERATURE", "HUMIDITY", "CPU"].map(k => (
            <button key={k} onClick={() => setActiveKey(k)} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 4, border: 0, cursor: "pointer", background: activeKey === k ? `${color}22` : "transparent", color: activeKey === k ? color : C.muted, fontFamily: "inherit", fontWeight: 700, textTransform: "uppercase" as const }}>{k}</button>
          ))}
        </div>
      </div>
      <LineChart data={chartData} color={color} height={110} />
    </div>
  )
}

function SwitchPanelWidget({ color }: { color: string }) {
  const [relays, setRelays] = useState([{ name: "Main Light", on: true }])
  return (
    <div>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>RELAY CONTROL</div>
      {relays.map((relay, i) => (
        <div key={relay.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < relays.length - 1 ? `1px solid ${C.border}` : undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: relay.on ? C.teal : C.muted, transition: "background .2s", boxShadow: relay.on ? `0 0 6px ${C.teal}` : "none" }} />
            <span style={{ fontSize: 13, color: C.light }}>{relay.name}</span>
          </div>
          <Toggle on={relay.on} onChange={() => setRelays(prev => prev.map((r, j) => j === i ? { ...r, on: !r.on } : r))} />
        </div>
      ))}
    </div>
  )
}

function DimmerWidget({ color }: { color: string }) {
  const [val, setVal] = useState(70)
  return (
    <div>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>DIMMER / PWM</div>
      <div style={{ fontSize: 34, fontWeight: 800, color, fontFamily: "DM Mono, monospace", marginBottom: 12 }}>{val}%</div>
      <input type="range" min={0} max={100} value={val} onChange={e => setVal(+e.target.value)}
        style={{ width: "100%", accentColor: color }} />
      <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 10, marginTop: 4 }}>
        <span>0%</span><span>100%</span>
      </div>
    </div>
  )
}

// ── Main Widget Renderer ───────────────────────────────────────────────────────
interface WidgetCardProps {
  widget: Widget
  index: number
  isEditing?: boolean
  isDragOver?: boolean
  onUpdateColSpan?: (span: 1 | 2 | 4) => void
  onRemove: () => void
  onDragStart?: (e: React.DragEvent, index: number) => void
  onDragOver?: (e: React.DragEvent, index: number) => void
  onDrop?: (e: React.DragEvent, index: number) => void
  telemetryEvents: { device_id: number; payload: Record<string, any>; received_at: string; protocol: string }[]
  devices: { id: number; name: string }[]
}

function WidgetCard({ widget, index, isEditing, isDragOver, onUpdateColSpan, onRemove, onDragStart, onDragOver, onDrop, telemetryEvents, devices }: WidgetCardProps) {
  const color = (C as any)[widget.config.colorTheme] as string ?? C.coral
  const catEntry = WIDGET_CATALOG.find(e => e.type === widget.type)

  // Aggregate payload values
  const allPayloads: Record<string, number[]> = {}
  for (const ev of telemetryEvents) {
    for (const [k, v] of Object.entries(ev.payload ?? {})) {
      if (typeof v === "number") { if (!allPayloads[k]) allPayloads[k] = []; allPayloads[k].push(v) }
    }
  }
  const getLatest = (pat: string) => {
    const k = Object.keys(allPayloads).find(k => k.toLowerCase().includes(pat.toLowerCase()))
    const arr = k ? allPayloads[k] : []
    return arr.length ? arr[arr.length - 1] : 0
  }
  const getAll = (pat: string) => {
    const k = Object.keys(allPayloads).find(k => k.toLowerCase().includes(pat.toLowerCase()))
    return k ? allPayloads[k] : []
  }
  const getAvg = (pat: string) => { const a = getAll(pat); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 }

  const { type } = widget

  const renderInner = () => {
    // ── STATS ─────────────────────────────────────────────────────────────
    if (type === "stat-devices") {
      const online = devices.length ? devices.filter(d => { const ev = telemetryEvents.find(e => e.device_id === d.id); return ev && Date.now() - new Date(ev.received_at).getTime() < 120_000 }).length : 12
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>DEVICES ONLINE</div>
        <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "DM Mono, monospace", margin: "10px 0 4px" }}>{online} <span style={{ fontSize: 14, color: C.muted }}>Active</span></div>
        <Sparkbar values={[4, 6, 8, 10, 12, 12, 12, 12]} color={color} />
      </>)
    }
    if (type === "stat-messages") {
      const count = telemetryEvents.length ? telemetryEvents.length : 28000
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>MESSAGES TODAY</div>
        <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "DM Mono, monospace", margin: "10px 0 4px" }}>
          28k <span style={{ fontSize: 13, color: C.muted }}>/100k</span>
        </div>
        <Sparkbar values={[8, 12, 16, 20, 24, 28, 28, 28]} color={color} />
      </>)
    }
    if (type === "stat-temp") {
      const avg = getAvg("temp") || 23.4
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>AVG TEMPERATURE</div>
        <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "DM Mono, monospace", margin: "10px 0 4px" }}>{avg.toFixed(1)} <span style={{ fontSize: 14, color: C.muted }}>Avg °C</span></div>
        <Sparkbar values={[22.5, 23.0, 23.2, 23.4, 23.5, 23.4, 23.4, 23.4]} color={color} />
      </>)
    }
    if (type === "stat-power") {
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>POWER USAGE</div>
        <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "DM Mono, monospace", margin: "10px 0 4px" }}>4.8 <span style={{ fontSize: 14, color: C.muted }}>kWh</span></div>
        <Sparkbar values={[3, 4, 3.5, 4.2, 4.8, 4.1, 4.5, 4.8]} color={color} />
      </>)
    }
    if (type === "stat-voltage") {
      const v = getLatest("volt") || 220
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>VOLTAGE</div>
        <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "DM Mono, monospace", margin: "10px 0 4px" }}>{v.toFixed(1)} <span style={{ fontSize: 14, color: C.muted }}>V</span></div>
        <Sparkbar values={[220, 221, 220, 219, 222, 220, 221, v]} color={color} />
      </>)
    }

    // ── GAUGES ─────────────────────────────────────────────────────────────
    if (type === "gauge-temp") {
      const v = getLatest("temp") || 23.4
      return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>TEMPERATURE</div>
        <GaugeSVG value={Math.round(v)} max={widget.config.max ?? 50} label="Temperature" color={color} unit={widget.config.unit ?? "°C"} />
        <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "DM Mono, monospace" }}>{v.toFixed(1)}°C</div>
        <div style={{ fontSize: 10, color: C.muted }}>0 – {widget.config.max ?? 50} °C</div>
      </div>)
    }
    if (type === "gauge-humidity") {
      const v = getLatest("humid") || 62.0
      return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>HUMIDITY</div>
        <GaugeSVG value={Math.round(v)} max={100} label="Humidity" color={color} unit="%" />
        <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "DM Mono, monospace" }}>{v.toFixed(1)}%</div>
        <div style={{ fontSize: 10, color: C.muted }}>0 – 100 %</div>
      </div>)
    }
    if (type === "gauge-co2") {
      const v = getLatest("co2") || 420
      return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>CO₂ / AIR QUALITY</div>
        <GaugeSVG value={Math.round(v)} max={2000} label="CO₂" color={color} unit="ppm" />
      </div>)
    }
    if (type === "gauge-pressure") {
      const v = getLatest("pressure") || 1013
      return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>PRESSURE</div>
        <GaugeSVG value={Math.round(v)} max={1100} label="Pressure" color={color} unit="hPa" />
      </div>)
    }

    // ── SENSORS ────────────────────────────────────────────────────────────
    if (type === "sensor-ldr") {
      const v = getLatest("ldr") || getLatest("ldr_lux") || getLatest("light")
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>LIGHT / LDR SENSOR</div>
        <div style={{ fontSize: 34, fontWeight: 800, color, fontFamily: "DM Mono, monospace", margin: "10px 0 4px" }}>{v.toFixed(0)} <span style={{ fontSize: 13, color: C.muted }}>lux</span></div>
        <Sparkbar values={(getAll("ldr").length ? getAll("ldr") : getAll("light")).slice(-8)} color={color} />
      </>)
    }
    if (type === "sensor-motion") {
      const v = getLatest("motion")
      return (<div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>MOTION SENSOR</div>
        <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 10px", background: v > 0 ? `${C.coral}33` : `${color}18`, display: "grid", placeItems: "center", boxShadow: v > 0 ? `0 0 18px ${C.coral}66` : "none", transition: "all .3s" }}>
          <Icon name="eye" size={22} color={v > 0 ? C.coral : C.muted} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 14, color: v > 0 ? C.coral : C.muted }}>{v > 0 ? "MOTION DETECTED" : "No Motion"}</div>
      </div>)
    }

    // ── CHARTS ─────────────────────────────────────────────────────────────
    if (type === "chart-telemetry" || type === "chart-realtime") {
      return <ChartTelemetryWidget color={color} allPayloads={allPayloads} />
    }
    if (type === "chart-power") {
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>POWER CHART</div>
        <BarChart data={getAll("power")} color={color} height={70} />
        <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 10, marginTop: 5 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </>)
    }

    // ── CONTROLS ───────────────────────────────────────────────────────────
    if (type === "switch-panel" || type === "relay-single") {
      return <SwitchPanelWidget color={color} />
    }
    if (type === "dimmer") {
      return <DimmerWidget color={color} />
    }

    // ── UTILITIES ──────────────────────────────────────────────────────────
    if (type === "device-list") {
      const devList = devices.length ? devices : [{ id: 1, name: "Thermostat Pro" }, { id: 2, name: "Smart Switch A1" }]
      return (<>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>DEVICE MANAGER</div>
        <div style={{ display: "grid", gap: 5 }}>
          {devList.map(dev => (
            <div key={dev.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.teal, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: C.light }}>{dev.name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.teal, background: `${C.teal}18`, padding: "2px 7px", borderRadius: 4 }}>ONLINE</span>
            </div>
          ))}
        </div>
      </>)
    }

    return <div style={{ color: C.muted, fontSize: 13 }}>Widget: <code style={{ color: C.light }}>{type}</code></div>
  }

  return (
    <div
      draggable={isEditing}
      onDragStart={e => isEditing && onDragStart?.(e, index)}
      onDragOver={e => isEditing && onDragOver?.(e, index)}
      onDrop={e => isEditing && onDrop?.(e, index)}
      style={{
        gridColumn: widget.colSpan === 2 ? "span 2" : widget.colSpan === 4 ? "span 4" : "span 1",
        cursor: isEditing ? "grab" : "default",
        userSelect: isEditing ? "none" : "auto",
        transition: "all .18s ease"
      }}
    >
      <Card style={{
        padding: 20, minHeight: 180, height: "100%",
        border: isDragOver ? `2px dashed ${color}` : isEditing ? `1px dashed ${color}aa` : undefined,
        transform: isDragOver ? "scale(1.02)" : undefined,
        boxShadow: isDragOver ? `0 8px 24px ${color}33` : isEditing ? `0 4px 16px ${color}15` : undefined,
        transition: "all .18s ease"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isEditing && <span style={{ color: C.muted, fontSize: 14, cursor: "grab", userSelect: "none" }} title="Drag to reorder">⠿</span>}
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name={catEntry?.icon ?? "dashboard"} size={13} color={color} />
            </div>
            <b style={{ fontSize: 12, color: C.light }}>{widget.title}</b>
          </div>
          {isEditing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {[1, 2, 4].map(span => (
                <button
                  key={span}
                  onClick={() => onUpdateColSpan?.(span as 1 | 2 | 4)}
                  style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    border: `1px solid ${widget.colSpan === span ? color : C.border}`,
                    background: widget.colSpan === span ? `${color}33` : "transparent",
                    color: widget.colSpan === span ? color : C.muted, cursor: "pointer", fontFamily: "inherit"
                  }}
                >
                  {span}W
                </button>
              ))}
              <button onClick={onRemove} title="Remove widget" style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer", padding: 2, marginLeft: 4 }}>
                <Icon name="close" size={13} />
              </button>
            </div>
          ) : (
            <button onClick={onRemove} title="Remove widget" style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer", padding: 2 }}>
              <Icon name="close" size={13} />
            </button>
          )}
        </div>
        {renderInner()}
      </Card>
    </div>
  )
}

// ── Empty Canvas ───────────────────────────────────────────────────────────────
function EmptyCanvas({ onAdd }: { onAdd: () => void }) {
  return (
    <Card style={{ minHeight: 440, display: "grid", placeItems: "center", textAlign: "center", padding: 36 }}>
      <div>
        <div style={{ width: 64, height: 64, display: "grid", placeItems: "center", margin: "0 auto 18px", borderRadius: 18, background: `linear-gradient(135deg,${C.coral}22,${C.purple}22)` }}>
          <Icon name="dashboard" size={28} color={C.coral} />
        </div>
        <h2 style={{ color: C.light, margin: "0 0 10px" }}>Canvas Anda masih kosong</h2>
        <p style={{ maxWidth: 440, color: C.muted, fontSize: 13, lineHeight: 1.7, margin: "0 auto 20px" }}>
          Klik <b style={{ color: C.light }}>+ Add Widget</b> untuk menambahkan widget ke dashboard. Widget akan menampilkan data telemetri real-time dari perangkat IoT Anda.
        </p>
        <Btn icon="plus" onClick={onAdd}>Tambah widget pertama</Btn>
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardView({ project }: { project: Project | null }) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [telemetryEvents, setTelemetryEvents] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showLibrary, setShowLibrary] = useState(false)

  const loadTelemetry = useCallback(async () => {
    if (!project) return
    try {
      const [events, devList] = await Promise.all([
        telemetryApi.latest(project.id).catch(() => []),
        devicesApi.list(project.id).catch(() => [])
      ])
      setTelemetryEvents(events as any[])
      setDevices(devList)
    } catch { }
  }, [project?.id])

  useEffect(() => {
    setWidgets([]); setMessage("")
    if (!project) return
    setLoading(true)
    Promise.all([
      dashboardApi.get(project.id).catch(() => null),
      telemetryApi.latest(project.id).catch(() => []),
      devicesApi.list(project.id).catch(() => [])
    ]).then(([saved, events, devList]) => {
      let loaded: Widget[] = DEFAULT_10_WIDGETS
      if (Array.isArray(saved) && saved.length > 0) {
        const valid = (saved as any[]).filter((w: any) => w && typeof w.id === "string" && typeof w.type === "string")
        if (valid.length > 0) {
          loaded = valid.map((w: any): Widget => ({
            id: w.id,
            type: w.type,
            title: w.title ?? w.type,
            colSpan: w.colSpan ?? w.defaultColSpan ?? 1,
            rowSpan: w.rowSpan ?? 1,
            visible: w.visible ?? true,
            config: w.config ?? { device: "All Devices", channel: "temperature", unit: "", colorTheme: "coral", min: 0, max: 100 }
          }))
        }
      }
      setWidgets(loaded)
      setTelemetryEvents(events as any[])
      setDevices(devList)
    }).catch(e => setMessage(e instanceof Error ? e.message : "Gagal memuat dashboard."))
      .finally(() => setLoading(false))

    const timer = setInterval(loadTelemetry, 5000)
    return () => clearInterval(timer)
  }, [project?.id, loadTelemetry])

  const save = async (next: Widget[]) => {
    if (!project) return
    setWidgets(next)
    try { await dashboardApi.save(project.id, next as unknown as Record<string, unknown>[]) }
    catch (e) { setMessage(e instanceof Error ? e.message : "Gagal menyimpan dashboard.") }
  }

  const updateColSpan = (id: string, colSpan: 1 | 2 | 4) => {
    const next = widgets.map(w => w.id === id ? { ...w, colSpan } : w)
    save(next)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const sourceStr = e.dataTransfer.getData("text/plain")
    const fromIndex = sourceStr !== "" ? parseInt(sourceStr, 10) : dragIndex
    if (fromIndex !== null && fromIndex !== undefined && !isNaN(fromIndex) && fromIndex !== dropIndex && fromIndex >= 0 && fromIndex < widgets.length) {
      const copy = [...widgets]
      const [moved] = copy.splice(fromIndex, 1)
      copy.splice(dropIndex, 0, moved)
      save(copy)
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const addWidget = (type: WidgetType) => {
    const entry = WIDGET_CATALOG.find(e => e.type === type)
    if (!entry) return
    const existing = DEFAULT_10_WIDGETS.find(w => w.type === type)
    const newWidget: Widget = existing ? { ...existing, id: `w${Date.now()}` } : {
      id: `w${Date.now()}`, type, title: entry.label,
      colSpan: entry.defaultColSpan, rowSpan: entry.defaultRowSpan,
      visible: true, config: { device: "All Devices", channel: "temperature", unit: "", colorTheme: "coral", min: 0, max: 100 }
    }
    save([...widgets, newWidget])
  }

  const latestTime = telemetryEvents[0]?.received_at ? new Date(telemetryEvents[0].received_at).toLocaleTimeString() : "05:59:57 PM"

  if (!project) return (
    <Card style={{ padding: 42, textAlign: "center" }}>
      <Icon name="dashboard" size={32} color={C.muted} />
      <h3 style={{ color: C.light }}>Pilih atau buat project</h3>
      <p style={{ color: C.muted, fontSize: 13 }}>Dashboard dibuat terpisah untuk setiap project.</p>
    </Card>
  )
  if (loading) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Memuat canvas dashboard...</div>

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {isEditing ? (
          <>
            <Btn variant="primary" icon="check" onClick={() => setIsEditing(false)}>✓ Done Editing</Btn>
            <Btn variant="ghost" icon="plus" onClick={() => setShowLibrary(true)}>+ Add Widget</Btn>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>
              Drag to reorder · Resize with W/H buttons · Click X to hide
            </span>
            <span style={{ marginLeft: "auto", color: C.muted, fontSize: 11 }}>
              {widgets.length} widgets active
            </span>
          </>
        ) : (
          <>
            <Btn variant="ghost" icon="edit" onClick={() => setIsEditing(true)}>Edit Layout</Btn>
            <Btn variant="ghost" icon="plus" onClick={() => setShowLibrary(true)}>+ Add Widget</Btn>
            <span style={{ marginLeft: "auto", color: C.muted, fontSize: 11 }}>
              {widgets.length} widgets active · Live: {latestTime}
            </span>
            <Btn variant="ghost" icon="refresh" onClick={loadTelemetry}>Refresh</Btn>
          </>
        )}
      </div>

      {message && <p style={{ color: C.coral, fontSize: 12, marginBottom: 10 }}>{message}</p>}

      {widgets.length === 0
        ? <EmptyCanvas onAdd={() => setShowLibrary(true)} />
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
            {widgets.map((widget, idx) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                index={idx}
                isEditing={isEditing}
                isDragOver={dragOverIndex === idx}
                onUpdateColSpan={span => updateColSpan(widget.id, span)}
                onRemove={() => save(widgets.filter(w => w.id !== widget.id))}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                telemetryEvents={telemetryEvents}
                devices={devices}
              />
            ))}
          </div>
      }

      {showLibrary && <WidgetLibrary onAdd={addWidget} onClose={() => setShowLibrary(false)} />}
    </div>
  )
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <Card style={{ padding: 42, textAlign: "center" }}>
      <Icon name="dashboard" size={32} color={C.muted} />
      <h3 style={{ color: C.light }}>{title}</h3>
      <p style={{ color: C.muted, fontSize: 13 }}>{text}</p>
    </Card>
  )
}
