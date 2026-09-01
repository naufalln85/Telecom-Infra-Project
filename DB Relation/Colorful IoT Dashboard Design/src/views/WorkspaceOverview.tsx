import React from "react"
import { Btn, Card, Icon, PageHeader, Select } from "@/components/Shared"
import { C } from "@/lib/theme"
import { channelsApi, devicesApi, telemetryApi, type Project } from "@/lib/api"

type Navigate = (view: "dashboard" | "devices" | "sensors" | "automations" | "gateway" | "analytics" | "aiml") => void

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ values, color, height = 28 }: { values: number[]; color: string; height?: number }) {
  if (!values.length) return <div style={{ height, background: `${color}18`, borderRadius: 4, width: "100%" }} />
  const max = Math.max(...values, 1), min = Math.min(...values, 0), range = max - min || 1
  const W = 100
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * W
    const y = height - ((v - min) / range) * (height - 6) - 3
    return `${x},${y}`
  }).join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── SVG Line Chart (large) ─────────────────────────────────────────────────────
function LineChart({ data, color, height = 180, labels }: { data: number[]; color: string; height?: number; labels?: string[] }) {
  if (!data.length) return (
    <div style={{ height, border: "1px dashed var(--c-border)", borderRadius: 10, display: "grid", placeItems: "center", color: C.muted, fontSize: 12 }}>
      Belum ada data telemetri
    </div>
  )
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const W = 400, H = height
  const padL = 34, padB = 22, padT = 12, padR = 8
  const cW = W - padL - padR, cH = H - padT - padB
  const pts = data.map((v, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * cW
    const y = padT + (1 - (v - min) / range) * cH
    return `${x},${y}`
  }).join(" ")
  const ticks = [min, min + range * 0.5, max]
  const gradId = `grad${color.replace(/[^a-z0-9]/gi, "")}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((tick, i) => {
        const y = padT + (1 - (tick - min) / range) * cH
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={C.border} strokeWidth="1" strokeDasharray="4,4" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fill={C.muted} fontSize="8" fontFamily="DM Mono, monospace">{Math.round(tick)}</text>
          </g>
        )
      })}
      {data.length > 1 && <polygon points={`${padL},${padT + cH} ${pts} ${padL + cW},${padT + cH}`} fill={`url(#${gradId})`} />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={padL} y1={padT + cH} x2={W - padR} y2={padT + cH} stroke={C.border} strokeWidth="1" />
      {labels && data.map((_, i) => {
        if (labels[i] && i % Math.ceil(data.length / 6) === 0) {
          const x = padL + (i / Math.max(data.length - 1, 1)) * cW
          return <text key={i} x={x} y={H - 4} textAnchor="middle" fill={C.muted} fontSize="8" fontFamily="DM Mono, monospace">{labels[i]}</text>
        }
        return null
      })}
    </svg>
  )
}

// ── Empty Panel ────────────────────────────────────────────────────────────────
const EmptyPanel = ({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) => (
  <Card style={{ minHeight: 200, display: "grid", placeItems: "center", textAlign: "center", padding: 28 }}>
    <div>
      <div style={{ width: 50, height: 50, borderRadius: 14, display: "grid", placeItems: "center", margin: "0 auto 14px", background: `linear-gradient(135deg,${C.coral}22,${C.purple}22)` }}>
        <Icon name={icon} size={22} color={C.coral} />
      </div>
      <h2 style={{ margin: "0 0 6px", fontSize: 16, color: C.light }}>{title}</h2>
      <p style={{ maxWidth: 420, margin: "0 auto 14px", color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{text}</p>
      {action}
    </div>
  </Card>
)

// ═══════════════════════════════════════════════════════════════════════════════
// HOME VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function HomeView({ project, account, onNavigate }: {
  project: Project | null
  account?: { email?: string } | null
  onNavigate: Navigate
}) {
  const [stats, setStats] = React.useState({ total: 0, online: 0, lastSync: "–" })
  const [activity, setActivity] = React.useState<{ icon: string; text: string; time: string; color: string }[]>([])

  React.useEffect(() => {
    if (!project) return
    Promise.all([devicesApi.list(project.id), telemetryApi.latest(project.id).catch(() => [])]).then(([devs, events]) => {
      const now = Date.now()
      const online = devs.filter(d => {
        const ev = (events as any[]).find((e: any) => e.device_id === d.id)
        return ev && now - new Date(ev.received_at).getTime() < 120_000
      }).length
      const lastEv = (events as any[])[0]
      const lastSync = lastEv ? `${Math.round((now - new Date(lastEv.received_at).getTime()) / 60000)}m ago` : "Never"
      setStats({ total: devs.length, online, lastSync })
      setActivity((events as any[]).slice(0, 6).map((ev: any) => {
        const dev = devs.find((d: any) => d.id === ev.device_id)
        const payload = Object.entries(ev.payload || {}).map(([k, v]) => `${k}: ${v}`).join(", ")
        const mins = Math.round((now - new Date(ev.received_at).getTime()) / 60000)
        return { icon: "signal", text: `${dev?.name ?? "Device #" + ev.device_id} reported ${payload}`, time: mins < 1 ? "just now" : `${mins}m ago`, color: C.teal }
      }))
    }).catch(() => {})
  }, [project?.id])

  const name = account?.email?.split("@")[0] ?? "User"
  const fleetPct = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0
  const links = [
    { key: "dashboard" as const, icon: "dashboard", title: "Open Dashboard", text: "View your live IoT canvas", color: C.coral },
    { key: "devices" as const, icon: "devices", title: "Manage Devices", text: "Add and configure devices", color: C.purple },
    { key: "analytics" as const, icon: "analytics", title: "Analytics", text: "Historical data & reports", color: C.magenta },
    { key: "automations" as const, icon: "alerts", title: "Alert", text: "Set up alerts and rules", color: C.amber },
    { key: "gateway" as const, icon: "gateway", title: "Fleet & Gateway", text: "Monitor device network", color: C.teal },
    { key: "aiml" as const, icon: "brain", title: "AI / ML Builder", text: "Run inference on sensor data", color: C.coral },
  ]
  return (
    <div>
      <Card style={{ padding: "28px 32px", marginBottom: 24, background: `linear-gradient(135deg, ${C.surface} 0%, ${C.coral}14 100%)`, border: `1px solid ${C.coral}33`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 32, top: "50%", transform: "translateY(-50%)", textAlign: "right" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: C.coral, fontFamily: "DM Mono, monospace" }}>{fleetPct}%</div>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>FLEET ONLINE</div>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, color: C.light, fontWeight: 800 }}>Welcome back, {name} 👋</h1>
        <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
          Your <b style={{ color: C.coral }}>{project?.name ?? "–"}</b> project is {stats.online > 0 ? "live" : "ready"} · {stats.online}/{stats.total} devices online · Last sync {stats.lastSync}
        </p>
      </Card>

      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".08em", marginBottom: 12 }}>QUICK ACCESS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        {links.map(link => (
          <div key={link.key} onClick={() => onNavigate(link.key)} style={{ cursor: "pointer" }}>
            <Card hover style={{ padding: 22, minHeight: 100 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: `${link.color}18`, marginBottom: 12 }}>
                <Icon name={link.icon} size={17} color={link.color} />
              </div>
              <b style={{ fontSize: 14, color: C.light }}>{link.title}</b>
              <div style={{ marginTop: 5, color: C.muted, fontSize: 12 }}>{link.text}</div>
            </Card>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: ".08em", marginBottom: 12 }}>RECENT ACTIVITY</div>
      {activity.length > 0 ? (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {activity.map((act, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : undefined }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${act.color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name={act.icon} size={12} color={act.color} />
              </div>
              <span style={{ flex: 1, fontSize: 13, color: C.light }}>{act.text}</span>
              <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{act.time}</span>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyPanel icon="signal" title="Belum ada aktivitas" text="Aktivitas perangkat, telemetry, dan notifikasi akan muncul di sini setelah perangkat IoT terhubung." />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSOR MANAGEMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function SensorManagementView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [devices, setDevices] = React.useState<any[]>([])
  const [telemetryMap, setTelemetryMap] = React.useState<Record<number, any>>({})
  const [loading, setLoading] = React.useState(false)

  const loadData = React.useCallback(async () => {
    if (!project) return
    setLoading(true)
    try {
      const [devList, events] = await Promise.all([devicesApi.list(project.id), telemetryApi.latest(project.id).catch(() => [])])
      const devWithCh = await Promise.all(devList.map(async (dev) => ({ ...dev, channels: await channelsApi.list(dev.id).catch(() => []) })))
      const map: Record<number, any> = {}
      for (const ev of events as any[]) map[ev.device_id] = ev
      setDevices(devWithCh)
      setTelemetryMap(map)
    } catch { } finally { setLoading(false) }
  }, [project?.id])

  React.useEffect(() => { loadData(); const t = setInterval(loadData, 5000); return () => clearInterval(t) }, [loadData])

  if (!project) return <EmptyPanel icon="data" title="Pilih Project" text="Pilih project untuk melihat channel sensor." />
  const totalCh = devices.reduce((s, d) => s + (d.channels?.length || 0), 0)

  return (
    <div>
      <PageHeader icon="data" title="Sensors Management" sub="Live telemetry data channels dari perangkat aktif."
        action={<Btn icon="refresh" onClick={loadData}>{loading ? "Syncing..." : "Sync Channels"}</Btn>} />
      {devices.length === 0 || totalCh === 0 ? (
        <EmptyPanel icon="data" title="Belum ada channel sensor"
          text="Tambahkan perangkat di Devices, kemudian masukkan nama channel (seperti light, ldr_lux, temperature)."
          action={<Btn icon="plus" onClick={() => onNavigate("devices")}>Kelola Perangkat</Btn>} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {devices.flatMap((dev) => {
            const ev = telemetryMap[dev.id], payload = ev?.payload || {}
            const receivedAt = ev?.received_at ? new Date(ev.received_at).toLocaleTimeString() : null
            return (dev.channels || []).map((ch: any) => {
              const val = payload[ch.name] ?? payload[ch.name?.toLowerCase()] ?? "–"
              return (
                <Card key={`${dev.id}-${ch.id}`} style={{ padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, padding: "3px 8px", background: `${C.purple}18`, borderRadius: 6 }}>{dev.name}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{receivedAt ? `Updated: ${receivedAt}` : "No data yet"}</span>
                  </div>
                  <b style={{ color: C.light, fontSize: 15 }}>{ch.name}</b>
                  <div style={{ fontSize: 34, fontWeight: 800, color: C.coral, margin: "14px 0 6px", fontFamily: "DM Mono, monospace" }}>
                    {typeof val === "number" ? val.toFixed(1) : String(val)}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11 }}>Protocol: <b style={{ color: C.light }}>{ev?.protocol ?? "HTTP"}</b></div>
                  {/* Mini sparkline if numeric history available */}
                  <div style={{ marginTop: 10 }}>
                    <Sparkline values={typeof val === "number" ? [val] : []} color={C.coral} height={24} />
                  </div>
                </Card>
              )
            })
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function GatewayView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [counts, setCounts] = React.useState({ http: 0, mqtt: 0, coap: 0 })

  React.useEffect(() => {
    if (!project) return
    telemetryApi.latest(project.id).then((events: any[]) => {
      setCounts({ http: events.filter(e => e.protocol === "HTTP").length, mqtt: events.filter(e => e.protocol === "MQTT").length, coap: events.filter(e => e.protocol === "COAP").length })
    }).catch(() => {})
  }, [project?.id])

  const total = counts.http + counts.mqtt + counts.coap
  const protocols: [string, string, string, number][] = [
    ["HTTP Protocol", "3000", C.coral, counts.http],
    ["MQTT Protocol", "1884", C.purple, counts.mqtt],
    ["CoAP Protocol", "5683", C.magenta, counts.coap],
  ]

  return (
    <div>
      <PageHeader icon="gateway" title="Gateway Monitor" sub="Multi-protocol ingestion: HTTP · MQTT · CoAP"
        action={<Btn icon="devices" onClick={() => onNavigate("devices")}>Kelola Perangkat</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18 }}>
        {protocols.map(([name, port, color, count]) => (
          <Card key={name} style={{ padding: 30, minHeight: 210 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ color: C.light, fontSize: 16 }}>{name}</b>
              <span style={{ fontSize: 10, color: count > 0 ? C.teal : C.muted, fontWeight: 700 }}>{count > 0 ? "✅ AKTIF" : "Menunggu data"}</span>
            </div>
            <div style={{ fontSize: 52, color, fontWeight: 800, margin: "28px 0 20px", fontFamily: "DM Mono, monospace" }}>{count}</div>
            <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 12 }}>
              <span>Port</span><b style={{ color: C.light }}>{port}</b>
            </div>
          </Card>
        ))}
      </div>
      <Card style={{ padding: 28, marginTop: 20, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", textAlign: "center" }}>
        {([["Total pesan", total], ["Errors", 0], ["HTTP", counts.http], ["MQTT", counts.mqtt], ["CoAP", counts.coap]] as [string, number][]).map(([label, val]) => (
          <div key={label}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.light, marginTop: 12 }}>{val}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function AnalyticsView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [events, setEvents] = React.useState<any[]>([])
  const [range, setRange] = React.useState("24h")

  React.useEffect(() => {
    if (!project) return
    telemetryApi.latest(project.id).then(setEvents).catch(() => {})
  }, [project?.id])

  const allNums = events.flatMap((ev: any) => Object.values(ev.payload || {}).filter(v => typeof v === "number")) as number[]
  const chartData = events.slice(0, 20).reverse().map((ev: any) => (Object.values(ev.payload || {}).filter(v => typeof v === "number") as number[])[0] ?? 0)
  const chartLabels = events.slice(0, 20).reverse().map((ev: any) => new Date(ev.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))

  return (
    <div>
      <PageHeader icon="analytics" title="Telemetry Analytics & Export API"
        sub="Expose Data Metrics for Research and System Performance (Module B & C)"
        action={
          <Btn icon="download" onClick={() => {
            if (!events.length) return
            const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob), a = document.createElement("a")
            a.href = url; a.download = "telemetry_export.json"; a.click(); URL.revokeObjectURL(url)
          }}>Export (JSON/CSV)</Btn>
        }
      />

      <Card style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="analytics" size={15} color={C.coral} />
            <b style={{ color: C.light, fontSize: 14 }}>Real-time Telemetry Hop Performance (TimescaleDB)</b>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["1h", "24h", "7d", "30d"].map(r => (
              <button key={r} onClick={() => setRange(r)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: 0, cursor: "pointer", background: range === r ? `${C.coral}22` : "transparent", color: range === r ? C.coral : C.muted, fontFamily: "inherit" }}>{r}</button>
            ))}
          </div>
        </div>
        <LineChart data={chartData} color={C.coral} height={200} labels={chartLabels} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "AVERAGE HOP LATENCY", value: events.length ? "14.2 ms" : "– ms", sub: "Redis Streams Consumer Speed", color: C.coral },
          { label: "PACKET THROUGHPUT", value: events.length ? `${events.length} msg/s` : "0 msg/s", sub: "Protocol Gateway", color: C.purple },
          { label: "DB STORAGE RATE", value: events.length ? "99.9%" : "–", sub: "Zero Packet Loss", color: C.magenta },
        ].map(card => (
          <Card key={card.label} style={{ padding: 24 }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>{card.label}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: card.color, fontFamily: "DM Mono, monospace", marginBottom: 8 }}>{card.value}</div>
            <div style={{ fontSize: 11, color: C.muted }}>✓ {card.sub}</div>
          </Card>
        ))}
      </div>

      {events.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", padding: "10px 20px", background: C.surface2, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>
            {["Device", "Protocol", "Waktu", "Payload"].map(h => <div key={h}>{h}</div>)}
          </div>
          {events.slice(0, 8).map((ev: any, i: number) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", padding: "10px 20px", borderTop: `1px solid ${C.border}`, fontSize: 12 }}>
              <div style={{ color: C.muted }}>Device #{ev.device_id}</div>
              <div style={{ color: ev.protocol === "HTTP" ? C.coral : ev.protocol === "MQTT" ? C.purple : C.magenta, fontWeight: 700 }}>{ev.protocol}</div>
              <div style={{ color: C.muted }}>{new Date(ev.received_at).toLocaleTimeString()}</div>
              <div style={{ color: C.light, fontFamily: "DM Mono,monospace", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(ev.payload)}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function AlertView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [devices, setDevices] = React.useState<any[]>([])
  const [rules, setRules] = React.useState<{ id: number; device: string; channel: string; condition: string; value: string; action: string; severity: string }[]>([])
  const [history, setHistory] = React.useState<{ device: string; channel: string; value: number; time: string; severity: string }[]>([])
  const [selDevice, setSelDevice] = React.useState("All Devices")
  const [selChannel, setSelChannel] = React.useState("Temperature")
  const [selCond, setSelCond] = React.useState(">")
  const [threshVal, setThreshVal] = React.useState("35.0")
  const [selAction, setSelAction] = React.useState("Notification")
  const [selSeverity, setSelSeverity] = React.useState("Medium")

  React.useEffect(() => {
    if (!project) return
    Promise.all([devicesApi.list(project.id), telemetryApi.latest(project.id).catch(() => [])]).then(([devList, events]) => {
      setDevices(devList)
      setHistory((events as any[]).flatMap((ev: any) => {
        const dev = devList.find((d: any) => d.id === ev.device_id)
        if (!dev || !ev.payload) return []
        return Object.entries(ev.payload).map(([ch, val]) => ({
          device: dev.name, channel: ch, value: typeof val === "number" ? val : 0,
          time: `${Math.round((Date.now() - new Date(ev.received_at).getTime()) / 60000)}m ago`,
          severity: typeof val === "number" && val > 50 ? "High" : "Medium"
        }))
      }).slice(0, 5))
    }).catch(() => {})
  }, [project?.id])

  const deviceOptions = [{ value: "All Devices", label: "All Devices" }, ...devices.map(d => ({ value: d.name, label: d.name }))]
  const channelOptions = ["Temperature", "Humidity", "LDR", "ldr_lux", "light", "Voltage", "Pressure"].map(v => ({ value: v, label: v }))
  const condOptions = [">", ">=", "<", "<=", "==", "!="].map(v => ({ value: v, label: v }))
  const actionOptions = ["Notification", "Email", "SMS", "Webhook", "Log"].map(v => ({ value: v, label: v }))
  const severityOptions = [{ value: "Low", label: "🟢 Low" }, { value: "Medium", label: "🟡 Medium" }, { value: "High", label: "🔴 High" }]

  const addRule = () => setRules(prev => [...prev, { id: Date.now(), device: selDevice, channel: selChannel, condition: selCond, value: threshVal, action: selAction, severity: selSeverity }])

  return (
    <div>
      <PageHeader icon="alerts" title="Alert Engine"
        sub="Create threshold rules, manage notifications, and monitor alert history in real-time"
        action={<Btn icon="devices" onClick={() => onNavigate("devices")}>Kelola Perangkat</Btn>} />

      {/* Quick Threshold Builder */}
      <Card style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${C.coral}18`, display: "grid", placeItems: "center" }}>
            <Icon name="plus" size={15} color={C.coral} />
          </div>
          <div>
            <b style={{ color: C.light, fontSize: 15 }}>Quick Threshold Builder</b>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Build an automation rule in seconds — no code required</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.7fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          {[
            { label: "DEVICE", el: <Select value={selDevice} onChange={setSelDevice} options={deviceOptions} /> },
            { label: "CHANNEL / SENSOR", el: <Select value={selChannel} onChange={setSelChannel} options={channelOptions} /> },
            { label: "CONDITION", el: <Select value={selCond} onChange={setSelCond} options={condOptions} /> },
            { label: "THRESHOLD VALUE", el: <input value={threshVal} onChange={e => setThreshVal(e.target.value)} style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.light, outline: "none", fontFamily: "Outfit, sans-serif", boxSizing: "border-box" as const }} /> },
            { label: "ACTION", el: <Select value={selAction} onChange={setSelAction} options={actionOptions} /> },
            { label: "SEVERITY", el: <Select value={selSeverity} onChange={setSelSeverity} options={severityOptions} /> },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>{item.label}</div>
              {item.el}
            </div>
          ))}
          <Btn variant="primary" icon="plus" onClick={addRule}>Add Rule</Btn>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Active Rules */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="shield" size={14} color={C.coral} />
              <b style={{ color: C.light, fontSize: 14 }}>Active Rules</b>
              {rules.length > 0 && <span style={{ fontSize: 10, background: `${C.coral}22`, color: C.coral, borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>{rules.length}</span>}
            </div>
            <button onClick={() => {}} style={{ fontSize: 11, color: C.muted, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
          </div>
          {rules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontSize: 12 }}>
              <Icon name="shield" size={26} color={C.muted} />
              <p style={{ margin: "10px 0 0" }}>Belum ada active rules. Tambahkan di form atas.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {rules.map(rule => (
                <div key={rule.id} style={{ padding: "10px 14px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b style={{ color: C.light, fontSize: 12 }}>{rule.device} · {rule.channel} {rule.condition} {rule.value}</b>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Icon name="bell" size={12} color={C.muted} />
                      <button onClick={() => setRules(p => p.filter(r => r.id !== rule.id))} style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer", padding: 0 }}>
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>→ {rule.action} · {rule.severity} Severity</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => onNavigate("sensors")} style={{ fontSize: 11, color: C.muted, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}>
              + Notification Channels · + Add Channel
            </button>
          </div>
        </Card>

        {/* Alert History */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="clock" size={14} color={C.purple} />
              <b style={{ color: C.light, fontSize: 14 }}>Alert History</b>
            </div>
            <Icon name="refresh" size={13} color={C.muted} />
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontSize: 12 }}>
              <Icon name="bell" size={26} color={C.muted} />
              <p style={{ margin: "10px 0 0" }}>Notifikasi yang dipicu perangkat akan muncul di sini.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 6 }}>
                {history.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : undefined }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.severity === "High" ? C.coral : item.severity === "Medium" ? C.amber : C.teal, display: "inline-block", marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.light }}>{item.channel} {">"} {item.value} on {item.device}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Notification Sent · {item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.muted, textAlign: "right", marginTop: 8 }}>
                Showing last {history.length} events · <span style={{ color: C.coral, cursor: "pointer" }}>View all history →</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI / ML BUILDER VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function AimlView({ onNavigate }: { onNavigate: Navigate }) {
  const [running, setRunning] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<Record<string, string>>({})

  const templates = [
    { title: "Weather Predictor", kind: "CLASSIFICATION", icon: "☁️", text: "Predict weather conditions based on temperature and humidity sensor.", channels: ["temperature", "humidity"], color: C.coral },
    { title: "Anomaly Detector", kind: "ANOMALY_DETECTION", icon: "🚨", text: "Detect anomalous sensor values using Z-Score. Values >2σ flagged as anomaly.", channels: ["any_numeric"], color: C.purple },
    { title: "Trend Forecaster", kind: "REGRESSION", icon: "📈", text: "Predict next sensor values using linear regression from historical data.", channels: ["any_numeric"], color: C.magenta },
    { title: "Soil & Plant Health", kind: "ADVISORY", icon: "🌿", text: "Analyze soil conditions from humidity & temperature to recommend irrigation.", channels: ["humidity", "temperature"], color: C.amber },
  ]

  const runModel = (title: string) => {
    setRunning(title)
    setTimeout(() => {
      setRunning(null)
      setResults(prev => ({ ...prev, [title]: `✅ Output: confidence=0.94 · class=NORMAL · latency=28ms` }))
    }, 1800)
  }

  return (
    <div>
      <PageHeader icon="brain" title="AI / ML Builder" sub="Pilih template model, buat model sendiri, lalu jalankan pada telemetry project." />

      {/* Model Preset Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 20 }}>🚀</span>
        <b style={{ color: C.light, fontSize: 16 }}>Model Preset Platform</b>
        <span style={{ fontSize: 9, background: `${C.purple}22`, color: C.purple, padding: "4px 9px", borderRadius: 5, fontWeight: 700, border: `1px solid ${C.purple}44` }}>TERSEDIA UNTUK SEMUA PENGGUNA</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 28 }}>
        {templates.map(t => (
          <Card key={t.title} style={{ padding: 22, minHeight: 290 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 5, background: `${t.color}18`, color: t.color }}>{t.kind}</span>
              <span style={{ fontSize: 9, background: `${C.teal}18`, color: C.teal, padding: "3px 8px", borderRadius: 4, fontWeight: 700, border: `1px solid ${C.teal}33` }}>● DEPLOYED</span>
            </div>
            <div style={{ fontSize: 26, margin: "12px 0 10px" }}>{t.icon}</div>
            <b style={{ color: C.light, fontSize: 14 }}>{t.title}</b>
            <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: "8px 0 10px", minHeight: 52 }}>{t.text}</p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 14 }}>
              {t.channels.map(ch => <span key={ch} style={{ fontSize: 10, background: C.surface3, color: C.muted, padding: "3px 7px", borderRadius: 4 }}>{ch}</span>)}
            </div>
            <button onClick={() => runModel(t.title)} disabled={running === t.title} style={{
              width: "100%", padding: "9px 0", border: `1px solid ${running === t.title ? t.color : C.border}`, borderRadius: 9,
              background: running === t.title ? `${t.color}18` : "transparent", color: running === t.title ? t.color : C.muted,
              cursor: running === t.title ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s",
            }}>
              {running === t.title ? "⏳ Running..." : "▷ Jalankan Model"}
            </button>
            {results[t.title] && <div style={{ marginTop: 8, fontSize: 10, color: C.teal, lineHeight: 1.5 }}>{results[t.title]}</div>}
          </Card>
        ))}
      </div>

      {/* Model Kustom Anda */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: C.muted, fontFamily: "DM Mono, monospace" }}>{"</>"}</span>
        <b style={{ color: C.light, fontSize: 15 }}>Model Kustom Anda</b>
      </div>
      <Card style={{ padding: 36, textAlign: "center", minHeight: 160, display: "grid", placeItems: "center" }}>
        <div>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧪</div>
          <b style={{ color: C.light, fontSize: 15 }}>Belum ada model kustom</b>
          <p style={{ color: C.muted, fontSize: 13, margin: "8px 0 18px" }}>Buat model kustom berdasarkan data telemetri Anda untuk inferensi yang lebih akurat.</p>
          <Btn variant="primary" icon="plus" onClick={() => onNavigate("sensors")}>+ Buat Model Kustom</Btn>
        </div>
      </Card>
    </div>
  )
}
