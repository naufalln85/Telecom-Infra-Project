import React from "react"
import { Btn, Card, Icon, PageHeader } from "@/components/Shared"
import { C } from "@/lib/theme"
import { devicesApi, channelsApi, telemetryApi, type Project } from "@/lib/api"

type Navigate = (view: "dashboard" | "devices" | "sensors" | "automations" | "gateway" | "analytics" | "aiml") => void

const EmptyPanel = ({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) => <Card style={{ minHeight:260, display:"grid", placeItems:"center", textAlign:"center", padding:32 }}>
  <div><div style={{ width:54, height:54, borderRadius:16, display:"grid", placeItems:"center", margin:"0 auto 16px", background:`linear-gradient(135deg,${C.coral}22,${C.purple}22)` }}><Icon name={icon} size={25} color={C.coral} /></div><h2 style={{ margin:"0 0 8px", fontSize:18, color:C.light }}>{title}</h2><p style={{ maxWidth:460, margin:"0 auto 18px", color:C.muted, fontSize:13, lineHeight:1.65 }}>{text}</p>{action}</div>
</Card>

export function HomeView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const links: { key: Parameters<Navigate>[0]; icon: string; title: string; text: string; color: string }[] = [
    { key:"dashboard", icon:"dashboard", title:"Open Dashboard", text:"Susun canvas IoT Anda", color:C.coral },
    { key:"devices", icon:"devices", title:"Manage Devices", text:"Tambahkan dan konfigurasi perangkat", color:C.purple },
    { key:"analytics", icon:"analytics", title:"Analytics", text:"Data historis dan laporan", color:C.magenta },
    { key:"automations", icon:"alerts", title:"Alert", text:"Atur aturan dan notifikasi", color:C.amber },
    { key:"gateway", icon:"gateway", title:"Fleet & Gateway", text:"Pantau jaringan perangkat", color:C.teal },
    { key:"aiml", icon:"brain", title:"AI / ML Builder", text:"Jalankan inferensi dari sensor", color:C.coral },
  ]
  return <div><PageHeader icon="home" title={project ? `Welcome to ${project.name}` : "Welcome to Yugma"} sub="Workspace IoT Anda siap untuk dikonfigurasi." />
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:16 }}>{links.map(link => <button key={link.key} onClick={() => onNavigate(link.key)} style={{ textAlign:"left", padding:0, border:0, background:"transparent", cursor:"pointer", fontFamily:"inherit" }}><Card style={{ minHeight:150, padding:28 }}><div style={{ width:42, height:42, borderRadius:12, display:"grid", placeItems:"center", background:`${link.color}18`, marginBottom:20 }}><Icon name={link.icon} size={20} color={link.color} /></div><b style={{ fontSize:17, color:C.light }}>{link.title}</b><div style={{ marginTop:8, color:C.muted, fontSize:13 }}>{link.text}</div></Card></button>)}</div>
    <div style={{ marginTop:28 }}><div style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:".08em", marginBottom:12 }}>RECENT ACTIVITY</div><EmptyPanel icon="signal" title="Belum ada aktivitas" text="Aktivitas perangkat, telemetry, dan notifikasi akan muncul di sini setelah perangkat IoT terhubung." /></div>
  </div>
}

export function SensorManagementView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [devices, setDevices] = React.useState<any[]>([])
  const [telemetryMap, setTelemetryMap] = React.useState<Record<number, any>>({})
  const [loading, setLoading] = React.useState(false)

  const loadData = React.useCallback(async () => {
    if (!project) return
    setLoading(true)
    try {
      const [devList, events] = await Promise.all([
        devicesApi.list(project.id),
        telemetryApi.latest(project.id).catch(() => [])
      ])

      const devWithChannels = await Promise.all(
        devList.map(async (dev) => {
          const channels = await channelsApi.list(dev.id).catch(() => [])
          return { ...dev, channels }
        })
      )

      const map: Record<number, any> = {}
      for (const ev of events) {
        map[ev.device_id] = ev
      }

      setDevices(devWithChannels)
      setTelemetryMap(map)
    } catch {
      // fallback silent
    } finally {
      setLoading(false)
    }
  }, [project?.id])

  React.useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 5000)
    return () => clearInterval(timer)
  }, [loadData])

  if (!project) return <EmptyPanel icon="data" title="Pilih Project" text="Pilih project untuk melihat channel sensor." />

  const totalChannels = devices.reduce((sum, d) => sum + (d.channels?.length || 0), 0)

  return (
    <div>
      <PageHeader
        icon="data"
        title="Sensors Management"
        sub="Live telemetry data channels dari perangkat aktif."
        action={<Btn icon="refresh" onClick={loadData}>{loading ? "Syncing..." : "Sync Sensor Channels"}</Btn>}
      />

      {devices.length === 0 || totalChannels === 0 ? (
        <EmptyPanel
          icon="data"
          title="Belum ada channel sensor"
          text="Tambahkan perangkat di menu Devices, kemudian masukkan nama channel (seperti light, ldr_lux, temperature) untuk menampilkan data di sini."
          action={<Btn icon="plus" onClick={() => onNavigate("devices")}>Kelola Perangkat</Btn>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {devices.map((dev) => {
            const ev = telemetryMap[dev.id]
            const payload = ev?.payload || {}
            const receivedAt = ev?.received_at ? new Date(ev.received_at).toLocaleTimeString() : null

            return (dev.channels || []).map((ch: any) => {
              const chName = ch.name
              // Match exact or lowercase
              const val = payload[chName] ?? payload[chName.toLowerCase()] ?? payload[chName.toUpperCase()] ?? "-"

              return (
                <Card key={`${dev.id}-${ch.id}`} style={{ padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.purple, padding: "4px 8px", background: `${C.purple}18`, borderRadius: 6 }}>
                      {dev.name}
                    </span>
                    <span style={{ fontSize: 10, color: C.muted }}>
                      {receivedAt ? `Received: ${receivedAt}` : "No Data Yet"}
                    </span>
                  </div>
                  <b style={{ color: C.light, fontSize: 16 }}>{chName}</b>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.coral, margin: "16px 0 8px", fontFamily: "DM Mono, monospace" }}>
                    {typeof val === "number" ? val.toFixed(1) : String(val)}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11 }}>
                    Protocol: <b style={{ color: C.light }}>{ev?.protocol || "HTTP"}</b>
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

export function GatewayView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [totalMessages, setTotalMessages] = React.useState({ http: 0, mqtt: 0, coap: 0, errors: 0 })

  React.useEffect(() => {
    if (!project) return
    telemetryApi.latest(project.id).then(events => {
      const http = events.filter((e: any) => e.protocol === "HTTP").length
      const mqtt = events.filter((e: any) => e.protocol === "MQTT").length
      const coap = events.filter((e: any) => e.protocol === "COAP").length
      setTotalMessages({ http, mqtt, coap, errors: 0 })
    }).catch(() => {})
  }, [project?.id])

  const protocols: [string, string, string, number][] = [
    ["HTTP Protocol", "3000", C.coral, totalMessages.http],
    ["MQTT Protocol", "1884", C.purple, totalMessages.mqtt],
    ["CoAP Protocol", "5683", C.magenta, totalMessages.coap],
  ]
  const total = totalMessages.http + totalMessages.mqtt + totalMessages.coap

  return (
    <div>
      <PageHeader
        icon="gateway"
        title="Gateway Monitor"
        sub="Multi-protocol ingestion: HTTP · MQTT · CoAP"
        action={<Btn icon="devices" onClick={() => onNavigate("devices")}>Kelola Perangkat</Btn>}
      />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:18 }}>
        {protocols.map(([name, port, color, count]) => (
          <Card key={name} style={{ padding:30, minHeight:210 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <b style={{ color:C.light, fontSize:17 }}>{name}</b>
              <span style={{ fontSize:10, color: count > 0 ? C.teal : C.muted, fontWeight:700 }}>{count > 0 ? "✅ AKTIF" : "Menunggu data"}</span>
            </div>
            <div style={{ fontSize:48, color, fontWeight:800, margin:"32px 0 24px", fontFamily:"DM Mono,monospace" }}>{count}</div>
            <div style={{ display:"flex", justifyContent:"space-between", color:C.muted, fontSize:12 }}>
              <span>Port</span><b style={{ color:C.light }}>{port}</b>
            </div>
          </Card>
        ))}
      </div>
      <Card style={{ padding:28, marginTop:20, display:"grid", gridTemplateColumns:"repeat(5, 1fr)", textAlign:"center" }}>
        {["Total pesan", "Errors", "HTTP", "MQTT", "CoAP"].map((label, i) => (
          <div key={label}>
            <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{label}</div>
            <div style={{ fontSize:32, fontWeight:800, color:C.light, marginTop:12 }}>
              {[total, totalMessages.errors, totalMessages.http, totalMessages.mqtt, totalMessages.coap][i]}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

export function AnalyticsView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [events, setEvents] = React.useState<any[]>([])
  const [range, setRange] = React.useState("24h")

  React.useEffect(() => {
    if (!project) return
    telemetryApi.latest(project.id).then(setEvents).catch(() => {})
  }, [project?.id])

  return (
    <div>
      <PageHeader
        icon="analytics"
        title="Telemetry Analytics & Export"
        sub="Visualisasi data dan laporan performa perangkat."
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn icon="devices" onClick={() => onNavigate("devices")}>Kelola Perangkat</Btn>
            <Btn icon="download" onClick={() => {
              if (!events.length) return
              const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url; a.download = "telemetry_export.json"; a.click()
              URL.revokeObjectURL(url)
            }}>Export JSON</Btn>
          </div>
        }
      />
      <Card style={{ minHeight:390, padding:28 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <b style={{ color:C.light, fontSize:17 }}>Real-time Telemetry Performance</b>
          <div style={{ display:"flex", gap:8 }}>
            {["1h", "24h", "7d", "30d"].map(r => (
              <button key={r} onClick={() => setRange(r)} style={{ fontSize:11, color: range === r ? C.coral : C.muted, padding:"6px 9px", background: range === r ? `${C.coral}22` : "transparent", borderRadius:6, border:0, cursor:"pointer" }}>{r}</button>
            ))}
          </div>
        </div>
        {events.length > 0 ? (
          <div style={{ marginTop:24 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12, marginBottom:18 }}>
              {["Total Events", "Devices Active", "Last Received"].map((label, i) => (
                <Card key={label} style={{ padding:16, textAlign:"center" }}>
                  <div style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:C.coral, marginTop:8, fontFamily:"DM Mono,monospace" }}>
                    {i === 0 ? events.length
                      : i === 1 ? new Set(events.map((e: any) => e.device_id)).size
                      : new Date(events[0]?.received_at ?? Date.now()).toLocaleTimeString()}
                  </div>
                </Card>
              ))}
            </div>
            <div style={{ border:"1px solid var(--c-border)", borderRadius:12, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 2fr", padding:"10px 16px", background:C.surface2, fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase" }}>
                {["Device ID", "Protocol", "Waktu", "Payload"].map(h => <div key={h}>{h}</div>)}
              </div>
              {events.slice(0, 10).map((ev: any, i: number) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 2fr", padding:"10px 16px", borderTop:"1px solid var(--c-border)", fontSize:12 }}>
                  <div style={{ color:C.muted }}>#{ev.device_id}</div>
                  <div style={{ color: ev.protocol === "HTTP" ? C.coral : ev.protocol === "MQTT" ? C.purple : C.magenta, fontWeight:700 }}>{ev.protocol}</div>
                  <div style={{ color:C.muted }}>{new Date(ev.received_at).toLocaleTimeString()}</div>
                  <div style={{ color:C.light, fontFamily:"DM Mono,monospace", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{JSON.stringify(ev.payload)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ height:290, border:"1px dashed var(--c-border)", borderRadius:12, marginTop:24, display:"grid", placeItems:"center", color:C.muted, textAlign:"center", padding:30 }}>
            <div>
              <Icon name="analytics" size={30} color={C.muted} />
              <p style={{ margin:"12px 0 0" }}>Grafik akan muncul setelah telemetry pertama diterima.</p>
              <Btn icon="devices" onClick={() => onNavigate("devices")} style={{ marginTop:14 }}>Tambah Perangkat IoT</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export function AlertView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const [devices, setDevices] = React.useState<any[]>([])
  const [alertHistory, setAlertHistory] = React.useState<{time: string; device: string; channel: string; value: number}[]>([])

  React.useEffect(() => {
    if (!project) return
    Promise.all([
      devicesApi.list(project.id),
      telemetryApi.latest(project.id)
    ]).then(([devList, events]) => {
      setDevices(devList)
      // Build alert history from events where values may be anomalous
      const history = events.flatMap((ev: any) => {
        const dev = devList.find((d: any) => d.id === ev.device_id)
        if (!dev || !ev.payload) return []
        return Object.entries(ev.payload).map(([ch, val]) => ({
          time: new Date(ev.received_at).toLocaleTimeString(),
          device: dev.name,
          channel: ch,
          value: typeof val === "number" ? val : 0
        }))
      }).slice(0, 5)
      setAlertHistory(history)
    }).catch(() => {})
  }, [project?.id])

  return (
    <div>
      <PageHeader
        icon="alerts"
        title="Alert Engine"
        sub="Buat aturan ambang batas dan pantau riwayat notifikasi."
        action={<Btn icon="devices" onClick={() => onNavigate("devices")}>Kelola Perangkat</Btn>}
      />
      <Card style={{ padding:28, marginBottom:20, border:`1px solid ${C.coral}44` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:42, height:42, display:"grid", placeItems:"center", borderRadius:12, background:`${C.coral}18` }}>
            <Icon name="alerts" size={20} color={C.coral} />
          </div>
          <div>
            <b style={{ color:C.light, fontSize:17 }}>Quick Threshold Builder</b>
            <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>Pilih perangkat dan channel sensor untuk membuat aturan otomatis.</div>
          </div>
        </div>
        {devices.length > 0 ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginTop:20 }}>
            {devices.map((dev: any) => (
              <button key={dev.id} onClick={() => onNavigate("sensors")} style={{ padding:"12px 16px", borderRadius:10, border:`1px solid ${C.border}`, background:C.surface2, color:C.light, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{dev.name}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>Klik untuk buat alert rule</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginTop:20 }}>
            <Btn icon="plus" onClick={() => onNavigate("devices")}>Tambahkan perangkat terlebih dahulu</Btn>
          </div>
        )}
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <EmptyPanel icon="shield" title="Belum ada active rules" text="Aturan akan tersedia setelah perangkat dan channel sensor ditambahkan." action={<Btn icon="sensors" onClick={() => onNavigate("sensors")}>Lihat Sensor</Btn>} />
        <Card style={{ padding:22 }}>
          <b style={{ color:C.light, fontSize:16 }}>Alert History</b>
          {alertHistory.length > 0 ? (
            <div style={{ marginTop:14, display:"grid", gap:8 }}>
              {alertHistory.map((item, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:8, background:C.surface2 }}>
                  <div>
                    <b style={{ color:C.light, fontSize:12 }}>{item.device}</b>
                    <span style={{ color:C.muted, fontSize:11 }}> · {item.channel}</span>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ color:C.coral, fontWeight:700, fontFamily:"DM Mono,monospace" }}>{item.value}</span>
                    <span style={{ color:C.muted, fontSize:10 }}>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop:16, color:C.muted, fontSize:12 }}>Notifikasi yang dipicu perangkat akan muncul di sini.</div>
          )}
        </Card>
      </div>
    </div>
  )
}

export function AimlView({ onNavigate }: { onNavigate: Navigate }) {
  const [tab, setTab] = React.useState<"explore" | "custom" | "run">("explore")
  const [selected, setSelected] = React.useState("")
  const templates = [
    { title:"Weather Predictor", kind:"CLASSIFICATION", icon:"☁️", text:"Prediksi kondisi berdasarkan channel temperature dan humidity.", channels:"temperature · humidity", color:C.coral },
    { title:"Anomaly Detector", kind:"ANOMALY_DETECTION", icon:"🚨", text:"Deteksi nilai sensor yang menyimpang dari pola telemetry.", channels:"any_numeric", color:C.purple },
    { title:"Trend Forecaster", kind:"REGRESSION", icon:"📈", text:"Prediksi nilai sensor berikutnya dari data historis.", channels:"any_numeric", color:C.magenta },
    { title:"Soil & Plant Health", kind:"ADVISORY", icon:"🌿", text:"Rekomendasi kondisi tanaman dari humidity dan temperature.", channels:"humidity · temperature", color:C.amber },
  ]
  const tabs = [["explore", "Jelajahi Model"], ["custom", "Buat Model Kustom"], ["run", "Jalankan & Uji"]] as const
  return <div><PageHeader icon="brain" title="AI / ML Builder" sub="Pilih template model, buat model sendiri, lalu jalankan pada telemetry project." />
    <div style={{ display:"flex", gap:28, borderBottom:`1px solid ${C.border}`, marginBottom:28 }}>{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} style={{ padding:"0 0 16px", border:0, borderBottom:`2px solid ${tab === key ? C.coral : "transparent"}`, background:"transparent", color:tab === key ? C.coral : C.muted, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:14 }}>{label}</button>)}</div>
    {tab === "explore" && <><div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}><span style={{ fontSize:22 }}>🚀</span><b style={{ color:C.light, fontSize:19 }}>Model Preset Platform</b><span style={{ padding:"5px 10px", borderRadius:6, background:`${C.purple}22`, color:C.purple, fontSize:10, fontWeight:700 }}>TEMPLATE TERSEDIA</span></div><div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:18 }}>{templates.map(template => <Card key={template.title} style={{ padding:28, minHeight:300 }}><span style={{ color:template.color, fontSize:10, fontWeight:800, padding:"6px 10px", borderRadius:6, background:`${template.color}18` }}>{template.kind}</span><div style={{ fontSize:32, margin:"26px 0 18px" }}>{template.icon}</div><b style={{ color:C.light, fontSize:18 }}>{template.title}</b><p style={{ minHeight:63, color:C.muted, fontSize:13, lineHeight:1.6 }}>{template.text}</p><span style={{ display:"inline-block", padding:"5px 8px", borderRadius:5, background:C.surface3, color:C.light, fontSize:10 }}>{template.channels}</span><button onClick={() => setSelected(template.title)} style={{ width:"100%", padding:"10px", marginTop:18, border:`1px solid ${C.border}`, borderRadius:9, background:"transparent", color:C.light, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>Pilih Template</button></Card>)}</div>{selected && <Card style={{ padding:18, marginTop:20, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}><span style={{ color:C.muted }}><b style={{ color:C.light }}>{selected}</b> dipilih. Hubungkan channel sensor sebelum model dapat dijalankan.</span><Btn icon="devices" onClick={() => onNavigate("devices")}>Tambah perangkat</Btn></Card>}</>}
    {tab === "custom" && <><div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:20 }}><Card style={{ padding:26 }}><b style={{ color:C.light, fontSize:18 }}>Buat Model Kustom</b><p style={{ color:C.muted, fontSize:13, lineHeight:1.6 }}>Tentukan sumber data, target, dan jenis model setelah telemetry tersedia.</p><div style={{ display:"grid", gap:12, marginTop:22 }}>{["Nama model", "Perangkat sumber", "Channel input", "Target / output"].map(label => <label key={label} style={{ color:C.muted, fontSize:11 }}>{label}<div style={{ marginTop:6, padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:C.surface2, color:C.muted }}>Belum ada data tersedia</div></label>)}</div><Btn disabled style={{ marginTop:20 }} icon="plus">Buat model</Btn></Card><EmptyPanel icon="data" title="Data training belum tersedia" text="Tambahkan perangkat, buat channel, dan kirim telemetry untuk mengaktifkan pembuatan model kustom." action={<Btn icon="devices" onClick={() => onNavigate("devices")}>Kelola perangkat</Btn>} /></div></>}
    {tab === "run" && <EmptyPanel icon="brain" title="Belum ada model untuk diuji" text="Pilih preset atau buat model kustom setelah project memiliki telemetry. Hasil inferensi nyata akan ditampilkan di area ini." />}
  </div>
}
