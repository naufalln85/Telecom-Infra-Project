import React from "react"
import { Btn, Card, Icon, PageHeader } from "@/components/Shared"
import { C } from "@/lib/theme"
import type { Project } from "@/lib/api"

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
  return <div><PageHeader icon="data" title="Sensors Management" sub="Live telemetry data channels dari perangkat aktif." action={<Btn icon="refresh" onClick={() => onNavigate("devices")}>Sync Sensor Channels</Btn>} /><EmptyPanel icon="data" title="Belum ada channel sensor" text="Tambahkan perangkat kemudian channel sensor untuk menampilkan kartu Temperature, Humidity, status relay, dan telemetry di sini." action={<Btn icon="plus" onClick={() => onNavigate("devices")}>Tambah perangkat</Btn>} /></div>
}

export function GatewayView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  const protocols = [["HTTP Protocol", "3000", C.coral], ["MQTT Protocol", "1884", C.purple], ["CoAP Protocol", "5683", C.magenta]] as const
  return <div><PageHeader icon="gateway" title="Gateway Monitor" sub="Multi-protocol ingestion: HTTP · MQTT · CoAP" action={<Btn icon="refresh" onClick={() => onNavigate("devices")}>Hubungkan perangkat</Btn>} />
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:18 }}>{protocols.map(([name, port, color]) => <Card key={name} style={{ padding:30, minHeight:210 }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><b style={{ color:C.light, fontSize:17 }}>{name}</b><span style={{ color:C.muted, fontSize:11 }}>Menunggu data</span></div><div style={{ fontSize:48, color, fontWeight:800, margin:"32px 0 24px", fontFamily:"DM Mono,monospace" }}>0</div><div style={{ display:"flex", justifyContent:"space-between", color:C.muted, fontSize:12 }}><span>Port</span><b style={{ color:C.light }}>{port}</b></div></Card>)}</div>
    <Card style={{ padding:28, marginTop:20, display:"grid", gridTemplateColumns:"repeat(5, 1fr)", textAlign:"center" }}>{["Total pesan", "Errors", "HTTP", "MQTT", "CoAP"].map(label => <div key={label}><div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{label}</div><div style={{ fontSize:32, fontWeight:800, color:C.light, marginTop:12 }}>0</div></div>)}</Card>
  </div>
}

export function AnalyticsView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  return <div><PageHeader icon="analytics" title="Telemetry Analytics & Export" sub="Visualisasi data dan laporan performa perangkat." action={<Btn icon="download" onClick={() => onNavigate("devices")}>Export JSON / CSV</Btn>} />
    <Card style={{ minHeight:390, padding:28 }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><b style={{ color:C.light, fontSize:17 }}>Real-time Telemetry Performance</b><div style={{ display:"flex", gap:8 }}>{["1h", "24h", "7d", "30d"].map(range => <span key={range} style={{ fontSize:11, color:C.muted, padding:"6px 9px", background:range === "24h" ? `${C.coral}22` : "transparent", borderRadius:6 }}>{range}</span>)}</div></div><div style={{ height:290, border:"1px dashed var(--c-border)", borderRadius:12, marginTop:24, display:"grid", placeItems:"center", color:C.muted, textAlign:"center", padding:30 }}><div><Icon name="analytics" size={30} color={C.muted} /><p style={{ margin:"12px 0 0" }}>Grafik akan muncul setelah telemetry pertama diterima.</p></div></div></Card>
  </div>
}

export function AlertView({ project, onNavigate }: { project: Project | null; onNavigate: Navigate }) {
  return <div><PageHeader icon="alerts" title="Alert Engine" sub="Buat aturan ambang batas dan pantau riwayat notifikasi." />
    <Card style={{ padding:28, marginBottom:20, border:`1px solid ${C.coral}44` }}><div style={{ display:"flex", alignItems:"center", gap:12 }}><div style={{ width:42, height:42, display:"grid", placeItems:"center", borderRadius:12, background:`${C.coral}18` }}><Icon name="plus" size={20} color={C.coral} /></div><div><b style={{ color:C.light, fontSize:17 }}>Quick Threshold Builder</b><div style={{ color:C.muted, fontSize:12, marginTop:4 }}>Pilih perangkat dan channel sensor untuk membuat aturan otomatis.</div></div></div><div style={{ marginTop:20 }}><Btn icon="plus" onClick={() => onNavigate("devices")}>Tambahkan perangkat terlebih dahulu</Btn></div></Card>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}><EmptyPanel icon="shield" title="Belum ada active rules" text="Aturan akan tersedia setelah perangkat dan channel sensor ditambahkan." /><EmptyPanel icon="bell" title="Belum ada alert history" text="Notifikasi yang dipicu perangkat akan muncul di sini." /></div>
  </div>
}

export function AimlView() {
  return <div><PageHeader icon="brain" title="AI / ML Builder" sub="Bangun model dari data telemetry project Anda." /><EmptyPanel icon="brain" title="Belum ada data untuk model" text="Hubungkan perangkat dan kumpulkan telemetry terlebih dahulu untuk mulai melatih atau menjalankan model." /></div>
}
