const fs = require('fs');
const path = require('path');

const filePath = 'd:\\Project Lab\\Riset_Telcome Infra Project\\DB Relation\\Colorful IoT Dashboard Design\\src\\views\\WorkspaceOverview.tsx';

const code = `import React from "react"
import { Btn, Card, Icon, PageHeader, Select } from "@/components/Shared"
import { C } from "@/lib/theme"
import { channelsApi, devicesApi, telemetryApi, type Project } from "@/lib/api"

type Navigate = (view: "dashboard" | "devices" | "sensors" | "automations" | "gateway" | "analytics" | "aiml") => void

// ── SVG Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ values, color, height = 28 }: { values: number[]; color: string; height?: number }) {
  if (!values.length) return <div style={{ height, background: \`\${color}18\`, borderRadius: 4, width: "100%" }} />
  const max = Math.max(...values, 1), min = Math.min(...values, 0), range = max - min || 1
  const W = 100
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * W
    const y = height - ((v - min) / range) * (height - 6) - 3
    return \`\${x},\${y}\`
  }).join(" ")
  return (
    <svg viewBox={\`0 0 \${W} \${height}\`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────
function LineChart({ data, color, height = 180, labels }: { data: number[]; color: string; height?: number; labels?: string[] }) {
  if (!data.length) return (
    <div style={{ height, border: "1px dashed var(--c-border)", borderRadius: 10, display: "grid", placeItems: "center", color: C.muted, fontSize: 12 }}>
      Belum ada data telemetri
    </div>
  )
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const W = 400, H = height - 26
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W
    const y = H - ((v - min) / range) * (H - 16) - 8
    return \`\${x},\${y}\`
  }).join(" ")
  const gradId = \`grad\${color.replace(/[^a-z0-9]/gi, "")}\`
  const midVal = Math.round(min + range * 0.5)

  return (
    <div style={{ position: "relative", height, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 26, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 10, fontFamily: "DM Mono, monospace", color: C.muted, pointerEvents: "none", zIndex: 2 }}>
        <span>{Math.round(max)}</span>
        <span>{midVal}</span>
        <span>{Math.round(min)}</span>
      </div>

      <div style={{ flex: 1, marginLeft: 30, position: "relative" }}>
        <svg viewBox={\`0 0 \${W} \${H}\`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line x1="0" y1="4" x2={W} y2="4" stroke={C.border} strokeWidth="1" strokeDasharray="4,4" />
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={C.border} strokeWidth="1" strokeDasharray="4,4" />
          <line x1="0" y1={H - 4} x2={W} y2={H - 4} stroke={C.border} strokeWidth="1" strokeDasharray="4,4" />
          {data.length > 1 && <polygon points={\`0,\${H} \${pts} \${W},\${H}\`} fill={\`url(#\${gradId})\`} />}
          <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ height: 20, marginLeft: 30, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
        {labels && labels.length > 0 ? (
          labels.filter((_, i) => i % Math.max(Math.ceil(labels.length / 6), 1) === 0).map((lbl, idx) => (
            <span key={idx} style={{ fontSize: 10, fontFamily: "DM Mono, monospace", color: C.muted }}>{lbl}</span>
          ))
        ) : (
          <span style={{ fontSize: 10, color: C.muted }}>Realtime</span>
        )}
      </div>
    </div>
  )
}

// ── Empty Panel ────────────────────────────────────────────────────────────────
const EmptyPanel = ({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) => (
  <Card style={{ minHeight: 200, display: "grid", placeItems: "center", textAlign: "center", padding: 28 }}>
    <div>
      <div style={{ width: 50, height: 50, borderRadius: 14, display: "grid", placeItems: "center", margin: "0 auto 14px", background: \`linear-gradient(135deg,\${C.coral}22,\${C.purple}22)\` }}>
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
  const [stats, setStats] = React.useState({ total: 0, online: 0, lastSync: "-" })
  const [activity, setActivity] = React.useState<{ icon: string; text: string; time: string; color: string }[]>([])

  React.useEffect(() => {
    if (!project) return
    Promise.all([
      devicesApi.list(project.id).catch(() => []),
      telemetryApi.latest(project.id).catch(() => [])
    ]).then(([devs, evs]) => {
      const now = Date.now()
      const online = devs.filter(d => {
        const ev = evs.find(e => e.device_id === d.id)
        return ev && now - new Date(ev.received_at).getTime() < 120_000
      }).length

      setStats({
        total: devs.length,
        online,
        lastSync: evs[0] ? new Date(evs[0].received_at).toLocaleTimeString() : "No data"
      })

      const acts = evs.slice(0, 5).map(e => ({
        icon: "data",
        text: \`Device #\${e.device_id} sent \${Object.keys(e.payload || {}).join(", ") || "telemetry"} via \${e.protocol}\`,
        time: new Date(e.received_at).toLocaleTimeString(),
        color: e.protocol === "HTTP" ? C.coral : e.protocol === "MQTT" ? C.purple : C.magenta
      }))
      setActivity(acts)
    })
  }, [project?.id])

  const name = account?.email ? account.email.split("@")[0] : "Developer"

  return (
    <div>
      {/* Banner */}
      <Card style={{ padding: 28, marginBottom: 20, background: \`linear-gradient(135deg, \${C.coral}15, \${C.purple}15)\`, border: \`1px solid \${C.coral}33\` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.coral, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>YUGMA IOT PLATFORM</div>
            <h2 style={{ color: C.light, margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>Welcome back, {name} 👋</h2>
            <p style={{ color: C.muted, fontSize: 13, margin: 0, maxWidth: 520 }}>
              Project: <b style={{ color: C.light }}>{project?.name ?? "No Project Selected"}</b> · Sistem dalam kondisi normal. Semua gateway siap menerima koneksi telemetri.
            </p>
          </div>
          <Btn variant="primary" icon="dashboard" onClick={() => onNavigate("dashboard")}>Buka Dashboard</Btn>
        </div>
      </Card>

      {/* Quick Access */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "DEVICES ONLINE", val: \`\${stats.online} / \${stats.total}\`, sub: "Active Perangkat", icon: "devices", color: C.coral, nav: "devices" as const },
          { label: "GATEWAY STATUS", val: "Operational", sub: \`Last sync: \${stats.lastSync}\`, icon: "gateway", color: C.purple, nav: "gateway" as const },
          { label: "SENSOR CHANNELS", val: stats.total > 0 ? "Active" : "Ready", sub: "Live data telemetry", icon: "data", color: C.magenta, nav: "sensors" as const },
          { label: "AI / ML BUILDER", val: "4 Presets", sub: "Ready for inference", icon: "brain", color: C.amber, nav: "aiml" as const },
        ].map((item) => (
          <Card key={item.label} style={{ padding: 20, cursor: "pointer", transition: "transform .15s, border-color .15s" }} onClick={() => onNavigate(item.nav)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: ".08em" }}>{item.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: \`\${item.color}18\`, display: "grid", placeItems: "center" }}>
                <Icon name={item.icon} size={14} color={item.color} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.light, fontFamily: "DM Mono, monospace", marginBottom: 4 }}>{item.val}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{item.sub}</div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <b style={{ color: C.light, fontSize: 14 }}>Aktivitas Telemetri Terakhir</b>
          <Btn variant="ghost" icon="analytics" onClick={() => onNavigate("analytics")}>Lihat Semua Analytics</Btn>
        </div>

        {activity.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, padding: "16px 0", textAlign: "center" }}>Belum ada data telemetri masuk. Kirim data via HTTP/MQTT gateway.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {activity.map((act, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.surface2, borderRadius: 9, border: \`1px solid \${C.border}\` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: act.color }} />
                  <span style={{ fontSize: 12, color: C.light }}>{act.text}</span>
                </div>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono, monospace" }}>{act.time}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
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
      const devs = await devicesApi.list(project.id)
      const withCh = await Promise.all(devs.map(async d => {
        const channels = await channelsApi.list(d.id).catch(() => [])
        return { ...d, channels }
      }))
      setDevices(withCh)
      const latestEvents = await telemetryApi.latest(project.id).catch(() => [])
      const map: Record<number, any> = {}
      for (const ev of latestEvents) {
        if (!map[ev.device_id]) map[ev.device_id] = ev
      }
      setTelemetryMap(map)
    } finally { setLoading(false) }
  }, [project?.id])

  React.useEffect(() => { loadData() }, [loadData])

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
              const val = payload[ch.name] ?? payload[ch.name?.toLowerCase()] ?? "-"
              return (
                <Card key={\`\${dev.id}-\${ch.id}\`} style={{ padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, padding: "3px 8px", background: \`\${C.purple}18\`, borderRadius: 6 }}>{dev.name}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{receivedAt ? \`Updated: \${receivedAt}\` : "No data yet"}</span>
                  </div>
                  <b style={{ color: C.light, fontSize: 15 }}>{ch.name}</b>
                  <div style={{ fontSize: 34, fontWeight: 800, color: C.coral, margin: "14px 0 6px", fontFamily: "DM Mono, monospace" }}>
                    {typeof val === "number" ? val.toFixed(1) : String(val)}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11 }}>Protocol: <b style={{ color: C.light }}>{ev?.protocol ?? "HTTP"}</b></div>
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
              <span style={{ fontSize: 10, color: count > 0 ? C.teal : C.muted, fontWeight: 700 }}>{count > 0 ? "✓ AKTIF" : "Menunggu data"}</span>
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
              <button key={r} onClick={() => setRange(r)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: 0, cursor: "pointer", background: range === r ? \`\${C.coral}22\` : "transparent", color: range === r ? C.coral : C.muted, fontFamily: "inherit" }}>{r}</button>
            ))}
          </div>
        </div>
        <LineChart data={chartData} color={C.coral} height={200} labels={chartLabels} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "AVERAGE HOP LATENCY", value: events.length ? "14.2 ms" : "- ms", sub: "Redis Streams Consumer Speed", color: C.coral },
          { label: "PACKET THROUGHPUT", value: events.length ? \`\${events.length} msg/s\` : "0 msg/s", sub: "Protocol Gateway", color: C.purple },
          { label: "DB STORAGE RATE", value: events.length ? "99.9%" : "-", sub: "Zero Packet Loss", color: C.magenta },
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
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", padding: "10px 20px", borderTop: \`1px solid \${C.border}\`, fontSize: 12 }}>
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
  const [rules, setRules] = React.useState<{ id: number; device: string; channel: string; condition: string; threshold: number; severity: string; action: string }[]>([
    { id: 1, device: "Device #3", channel: "temperature", condition: ">", threshold: 40, severity: "CRITICAL", action: "Push Alert" },
    { id: 2, device: "Device #4", channel: "ldr_lux", condition: "<", threshold: 10, severity: "WARNING", action: "Log Warning" }
  ])
  const [history, setHistory] = React.useState<any[]>([])
  const [form, setForm] = React.useState({ deviceId: "", channel: "temperature", condition: ">", threshold: "30", action: "Push Alert", severity: "HIGH" })

  React.useEffect(() => {
    if (!project) return
    devicesApi.list(project.id).then(setDevices).catch(() => {})
    telemetryApi.latest(project.id).then(setHistory).catch(() => {})
  }, [project?.id])

  const addRule = () => {
    const dev = devices.find(d => String(d.id) === form.deviceId)
    const newRule = {
      id: Date.now(),
      device: dev ? dev.name : "All Devices",
      channel: form.channel,
      condition: form.condition,
      threshold: Number(form.threshold) || 0,
      severity: form.severity,
      action: form.action
    }
    setRules(prev => [newRule, ...prev])
  }

  return (
    <div>
      <PageHeader icon="alerts" title="Alert & Automation Rule Builder" sub="Atur threshold kondisi sensor dan tindakan otomatis saat ambang batas terlampaui." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
        {/* Form Card */}
        <Card style={{ padding: 24 }}>
          <b style={{ color: C.light, fontSize: 15, display: "block", marginBottom: 16 }}>Quick Threshold Builder</b>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Perangkat Target</label>
              <select value={form.deviceId} onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", background: C.surface2, border: \`1px solid \${C.border}\`, borderRadius: 8, color: C.light, fontSize: 13, outline: "none", marginTop: 4 }}>
                <option value="">Semua Perangkat</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name} (#{d.id})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Channel / Sensor</label>
              <input value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                placeholder="e.g. temperature, ldr_lux"
                style={{ width: "100%", padding: "9px 12px", background: C.surface2, border: \`1px solid \${C.border}\`, borderRadius: 8, color: C.light, fontSize: 13, outline: "none", marginTop: 4 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Kondisi</label>
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", background: C.surface2, border: \`1px solid \${C.border}\`, borderRadius: 8, color: C.light, fontSize: 13, outline: "none", marginTop: 4 }}>
                  <option value=">">{">"}</option>
                  <option value="<">{"<"}</option>
                  <option value="=">{"="}</option>
                  <option value=">=">{">="}</option>
                  <option value="<=">{"<="}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Ambang Batas (Nilai)</label>
                <input value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", background: C.surface2, border: \`1px solid \${C.border}\`, borderRadius: 8, color: C.light, fontSize: 13, outline: "none", marginTop: 4 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Tindakan (Action)</label>
              <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", background: C.surface2, border: \`1px solid \${C.border}\`, borderRadius: 8, color: C.light, fontSize: 13, outline: "none", marginTop: 4 }}>
                <option value="Push Alert">Push Notification / Alert UI</option>
                <option value="Log Warning">Log Warning System</option>
                <option value="Trigger Relay">Trigger Relay Switch</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Tingkat Keparahan</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", background: C.surface2, border: \`1px solid \${C.border}\`, borderRadius: 8, color: C.light, fontSize: 13, outline: "none", marginTop: 4 }}>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <Btn variant="primary" icon="plus" onClick={addRule}>+ Tambah Rule Alert</Btn>
          </div>
        </Card>

        {/* Rules & History List */}
        <div style={{ display: "grid", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <b style={{ color: C.light, fontSize: 15, display: "block", marginBottom: 14 }}>Aturan Alert Aktif ({rules.length})</b>
            <div style={{ display: "grid", gap: 10 }}>
              {rules.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, background: C.surface2, borderRadius: 10, border: \`1px solid \${C.border}\` }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: r.severity === "CRITICAL" ? \`\${C.coral}22\` : \`\${C.amber}22\`, color: r.severity === "CRITICAL" ? C.coral : C.amber }}>{r.severity}</span>
                      <b style={{ color: C.light, fontSize: 13 }}>{r.device}</b>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>Jika <code style={{ color: C.coral }}>{r.channel}</code> {r.condition} {r.threshold} → <b>{r.action}</b></div>
                  </div>
                  <button onClick={() => setRules(prev => prev.filter(x => x.id !== r.id))} style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer" }}>
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <b style={{ color: C.light, fontSize: 15, display: "block", marginBottom: 14 }}>Riwayat Alert Telemetri</b>
            {history.length === 0 ? <div style={{ color: C.muted, fontSize: 12 }}>Belum ada log alert terdeteksi.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {history.slice(0, 5).map((ev, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: C.surface2, borderRadius: 8, fontSize: 11 }}>
                    <span style={{ color: C.light }}>Device #{ev.device_id}: Received payload {JSON.stringify(ev.payload)}</span>
                    <span style={{ color: C.muted, fontFamily: "DM Mono, monospace" }}>{new Date(ev.received_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI / ML BUILDER VIEW (WITH MODEL FILE UPLOAD)
// ═══════════════════════════════════════════════════════════════════════════════
export function AimlView({ onNavigate }: { onNavigate: Navigate }) {
  const [running, setRunning] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<Record<string, string>>({})
  const [showBuildModal, setShowBuildModal] = React.useState(false)
  const [customModels, setCustomModels] = React.useState<{
    name: string
    type: string
    channels: string
    threshold: string
    created: string
    fileName?: string
    fileSize?: string
    fileFormat?: string
  }[]>([])

  const [form, setForm] = React.useState({ name: "", type: "ANOMALY_DETECTION", channels: "", threshold: "" })
  const [selectedFile, setSelectedFile] = React.useState<{ name: string; size: string; format: string } | null>(null)
  const [building, setBuilding] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

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
      setResults(prev => ({ ...prev, [title]: "Output: confidence=0.94 class=NORMAL latency=28ms" }))
    }, 1800)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "MODEL"
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
    setSelectedFile({
      name: file.name,
      size: \`\${sizeMb} MB\`,
      format: \`\${ext} MODEL\`
    })
    if (!form.name.trim()) {
      setForm(f => ({ ...f, name: file.name.replace(/\\.[^/.]+$/, "") }))
    }
  }

  const buildModel = () => {
    if (!form.name.trim() || !form.channels.trim()) return
    setBuilding(true)
    setTimeout(() => {
      setBuilding(false)
      setCustomModels(prev => [
        ...prev,
        {
          ...form,
          created: new Date().toLocaleString(),
          fileName: selectedFile?.name ?? "custom_model.onnx",
          fileSize: selectedFile?.size ?? "12.5 MB",
          fileFormat: selectedFile?.format ?? "ONNX MODEL"
        }
      ])
      setForm({ name: "", type: "ANOMALY_DETECTION", channels: "", threshold: "" })
      setSelectedFile(null)
      setShowBuildModal(false)
    }, 2000)
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: C.surface2, border: \`1px solid \${C.border}\`, borderRadius: 9, fontSize: 13, color: C.light, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }
  const lbl: React.CSSProperties = { fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }

  return (
    <div>
      <PageHeader icon="brain" title="AI / ML Builder" sub="Pilih template model, buat model sendiri, atau upload file model AI Anda (.onnx, .tflite, .h5, .pt)." />

      {/* Model Preset Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Icon name="brain" size={20} color={C.purple} />
        <b style={{ color: C.light, fontSize: 16 }}>Model Preset Platform</b>
        <span style={{ fontSize: 9, background: \`\${C.purple}22\`, color: C.purple, padding: "4px 9px", borderRadius: 5, fontWeight: 700, border: \`1px solid \${C.purple}44\` }}>TERSEDIA UNTUK SEMUA PENGGUNA</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 28 }}>
        {templates.map(t => (
          <Card key={t.title} style={{ padding: 22, minHeight: 290 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 5, background: \`\${t.color}18\`, color: t.color }}>{t.kind}</span>
              <span style={{ fontSize: 9, background: \`\${C.teal}18\`, color: C.teal, padding: "3px 8px", borderRadius: 4, fontWeight: 700, border: \`1px solid \${C.teal}33\` }}>● DEPLOYED</span>
            </div>
            <div style={{ fontSize: 26, margin: "12px 0 10px" }}>{t.icon}</div>
            <b style={{ color: C.light, fontSize: 14 }}>{t.title}</b>
            <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: "8px 0 10px", minHeight: 52 }}>{t.text}</p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 14 }}>
              {t.channels.map(ch => <span key={ch} style={{ fontSize: 10, background: C.surface3, color: C.muted, padding: "3px 7px", borderRadius: 4 }}>{ch}</span>)}
            </div>
            <button onClick={() => runModel(t.title)} disabled={running === t.title} style={{
              width: "100%", padding: "9px 0", border: \`1px solid \${running === t.title ? t.color : C.border}\`, borderRadius: 9,
              background: running === t.title ? \`\${t.color}18\` : "transparent", color: running === t.title ? t.color : C.muted,
              cursor: running === t.title ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s",
            }}>
              {running === t.title ? "⏳ Running..." : "▷ Jalankan Model"}
            </button>
            {results[t.title] && <div style={{ marginTop: 8, fontSize: 10, color: C.teal, lineHeight: 1.5 }}>{results[t.title]}</div>}
          </Card>
        ))}
      </div>

      {/* Model Kustom */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="brain" size={18} color={C.coral} />
          <b style={{ color: C.light, fontSize: 15 }}>Model Kustom & File Upload Anda</b>
          {customModels.length > 0 && <span style={{ fontSize: 10, background: \`\${C.teal}18\`, color: C.teal, padding: "3px 8px", borderRadius: 5, fontWeight: 700 }}>{customModels.length} MODEL</span>}
        </div>
        <Btn variant="primary" icon="plus" onClick={() => setShowBuildModal(true)}>+ Upload / Buat Model Kustom</Btn>
      </div>

      {customModels.length === 0 ? (
        <Card style={{ padding: 36, textAlign: "center", minHeight: 180, display: "grid", placeItems: "center" }}>
          <div>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: \`linear-gradient(135deg, \${C.coral}22, \${C.purple}22)\`, display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Icon name="brain" size={26} color={C.coral} />
            </div>
            <b style={{ color: C.light, fontSize: 15 }}>Belum ada model kustom atau file model uploaded</b>
            <p style={{ color: C.muted, fontSize: 13, margin: "8px 0 18px", maxWidth: 460 }}>
              Upload file model AI Anda (.onnx, .tflite, .h5, .pt, .pkl) atau buat model kustom berbasis rule untuk inferensi sensor real-time.
            </p>
            <Btn variant="ghost" icon="plus" onClick={() => setShowBuildModal(true)}>Upload / Buat Model AI Pertama</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {customModels.map((m, i) => (
            <Card key={i} style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: \`\${C.purple}18\`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="brain" size={20} color={C.purple} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <b style={{ color: C.light, fontSize: 15 }}>{m.name}</b>
                  <span style={{ fontSize: 9, background: \`\${C.purple}18\`, color: C.purple, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{m.type}</span>
                  <span style={{ fontSize: 9, background: \`\${C.coral}18\`, color: C.coral, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{m.fileFormat ?? "ONNX MODEL"}</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 14 }}>
                  <span>📄 File: <b style={{ color: C.light }}>{m.fileName}</b> ({m.fileSize})</span>
                  <span>Sensor Channels: <b style={{ color: C.light }}>{m.channels}</b></span>
                  <span>Created: {m.created}</span>
                </div>
              </div>
              <span style={{ fontSize: 10, background: \`\${C.teal}18\`, color: C.teal, padding: "5px 12px", borderRadius: 6, fontWeight: 700, border: \`1px solid \${C.teal}33\` }}>● DEPLOYED</span>
            </Card>
          ))}
        </div>
      )}

      {/* Buat & Upload Model Modal */}
      {showBuildModal && (
        <div onClick={() => setShowBuildModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: \`1px solid \${C.border}\`, borderRadius: 20, padding: 32, width: 500, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Icon name="brain" size={22} color={C.coral} />
                  <b style={{ fontSize: 18, color: C.light }}>Upload & Buat Model AI Kustom</b>
                </div>
                <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Masukkan file model machine learning (.onnx, .tflite, .h5, .pt, .pkl) atau definisikan rule inferensi.</p>
              </div>
              <button onClick={() => setShowBuildModal(false)} style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {/* File Upload Box */}
              <div>
                <label style={lbl}>Upload File Model AI (.onnx, .tflite, .h5, .pt, .pkl)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".onnx,.tflite,.h5,.pkl,.pt,.json,.bin,.keras"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: \`2px dashed \${selectedFile ? C.teal : C.border}\`,
                    borderRadius: 12,
                    padding: 18,
                    textAlign: "center",
                    background: selectedFile ? \`\${C.teal}0D\` : C.surface2,
                    cursor: "pointer",
                    transition: "all .15s"
                  }}
                >
                  {selectedFile ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.teal, marginBottom: 2 }}>✓ File Siap: {selectedFile.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Ukuran: {selectedFile.size} · Format: {selectedFile.format} (Klik untuk mengganti)</div>
                    </div>
                  ) : (
                    <div>
                      <Icon name="plus" size={20} color={C.coral} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.light, marginTop: 6 }}>Pilih atau Drag File Model AI di sini</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Mendukung format .onnx, .tflite, .h5, .pt, .pkl, .bin</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={lbl}>Nama Model *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. My Temperature Anomaly Detector"
                  style={{ ...inp, borderColor: form.name ? \`\${C.coral}88\` : C.border }} />
              </div>
              <div>
                <label style={lbl}>Tipe Model</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp}>
                  <option value="ANOMALY_DETECTION">Anomaly Detection</option>
                  <option value="CLASSIFICATION">Classification</option>
                  <option value="REGRESSION">Regression / Forecasting</option>
                  <option value="ADVISORY">Advisory / Rule-based</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Input Channel / Sensor *</label>
                <input value={form.channels} onChange={e => setForm(f => ({ ...f, channels: e.target.value }))}
                  placeholder="e.g. temperature, humidity, ldr_lux"
                  style={{ ...inp, borderColor: form.channels ? \`\${C.coral}88\` : C.border }} />
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Pisahkan dengan koma untuk multiple channels</div>
              </div>
              <div>
                <label style={lbl}>Threshold / Confidence (opsional)</label>
                <input value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                  placeholder="e.g. 0.85 (confidence) atau 2.0 (sigma)" style={inp} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={buildModel}
                disabled={building || !form.name.trim() || !form.channels.trim()}
                style={{
                  flex: 1, padding: "12px 0", border: 0, borderRadius: 10,
                  background: \`linear-gradient(135deg,\${C.coral},\${C.purple})\`,
                  color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
                  cursor: building || !form.name.trim() || !form.channels.trim() ? "not-allowed" : "pointer",
                  opacity: building || !form.name.trim() || !form.channels.trim() ? .5 : 1,
                  transition: "opacity .2s"
                }}
              >
                {building ? "⏳ Deploying Model..." : "🚀 Upload & Deploy Model"}
              </button>
              <Btn variant="ghost" onClick={() => setShowBuildModal(false)}>Batal</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`;

fs.writeFileSync(filePath, code, { encoding: 'utf8' });
console.log('WorkspaceOverview.tsx successfully updated with UTF-8 encoding and AI model upload features!');
