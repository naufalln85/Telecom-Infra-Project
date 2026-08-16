import React, { useEffect, useState } from "react"
import { dashboardApi, type Project } from "@/lib/api"
import { Btn, Card, Icon } from "@/components/Shared"
import { C, WIDGET_CATALOG } from "@/lib/theme"

type CanvasWidget = { id: string; type: string; title: string; color: string; size: "normal" | "wide" }
const defaultColor = (index: number) => [C.coral, C.purple, C.magenta, C.amber, C.teal][index % 5]

function WidgetLibrary({ onAdd, onClose }: { onAdd: (entry: (typeof WIDGET_CATALOG)[number]) => void; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const filtered = WIDGET_CATALOG.filter(entry => (category === "all" || entry.category === category) && `${entry.label} ${entry.desc}`.toLowerCase().includes(query.toLowerCase()))
  return <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.45)" }}><aside onClick={event => event.stopPropagation()} style={{ position:"absolute", top:0, right:0, bottom:0, width:360, maxWidth:"92vw", background:C.surface, borderLeft:`1px solid ${C.border}`, boxShadow:"-18px 0 54px rgba(0,0,0,.35)", display:"flex", flexDirection:"column" }}>
    <div style={{ padding:20, borderBottom:`1px solid ${C.border}` }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><b style={{ fontSize:17, color:C.light }}>Widget Library</b><button onClick={onClose} style={{ border:0, background:"transparent", color:C.muted, cursor:"pointer" }}><Icon name="close" /></button></div><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari widget..." style={{ width:"100%", padding:"10px 12px", color:C.light, background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, outline:"none", fontFamily:"inherit" }} /><div style={{ display:"flex", gap:5, marginTop:12, flexWrap:"wrap" }}>{["all", "stats", "gauges", "sensors", "charts", "controls", "utilities"].map(item => <button key={item} onClick={() => setCategory(item)} style={{ border:0, borderRadius:7, padding:"5px 8px", background:category === item ? `${C.coral}22` : C.surface2, color:category === item ? C.coral : C.muted, cursor:"pointer", fontSize:10, fontWeight:700, textTransform:"capitalize" }}>{item}</button>)}</div></div>
    <div style={{ overflowY:"auto", padding:14, display:"grid", gap:8 }}>{filtered.map(entry => <button key={entry.type} onClick={() => onAdd(entry)} style={{ display:"flex", textAlign:"left", gap:12, alignItems:"center", padding:12, border:`1px solid ${C.border}`, borderRadius:11, background:C.surface2, cursor:"pointer", fontFamily:"inherit" }}><div style={{ width:34, height:34, display:"grid", placeItems:"center", borderRadius:9, background:`${C.coral}18` }}><Icon name={entry.icon} size={16} color={C.coral} /></div><div><b style={{ color:C.light, fontSize:12 }}>{entry.label}</b><div style={{ color:C.muted, fontSize:10, marginTop:3 }}>{entry.desc}</div></div></button>)}</div>
  </aside></div>
}

function EmptyCanvas({ onAdd }: { onAdd: () => void }) {
  return <Card style={{ minHeight:450, display:"grid", placeItems:"center", textAlign:"center", padding:36 }}><div><div style={{ width:64, height:64, display:"grid", placeItems:"center", margin:"0 auto 18px", borderRadius:18, background:`linear-gradient(135deg,${C.coral}22,${C.purple}22)` }}><Icon name="dashboard" size={30} color={C.coral} /></div><h2 style={{ color:C.light, margin:"0 0 10px" }}>Canvas Anda masih kosong</h2><p style={{ maxWidth:440, color:C.muted, fontSize:13, lineHeight:1.7, margin:"0 auto 20px" }}>Tidak ada widget atau data dummy. Pilih widget yang ingin dipakai, lalu hubungkan perangkat dan channel saat IoT Anda sudah tersedia.</p><Btn icon="plus" onClick={onAdd}>Tambah widget pertama</Btn></div></Card>
}

export default function DashboardView({ project }: { project: Project | null }) {
  const [widgets, setWidgets] = useState<CanvasWidget[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showLibrary, setShowLibrary] = useState(false)

  useEffect(() => {
    setWidgets([]); setMessage("")
    if (!project) return
    setLoading(true)
    dashboardApi.get(project.id).then(saved => {
      const valid = Array.isArray(saved) ? saved.filter((item): item is CanvasWidget => Boolean(item && typeof item.id === "string" && typeof item.type === "string" && typeof item.title === "string")).map((item, index) => ({ ...item, color:typeof item.color === "string" ? item.color : defaultColor(index), size:item.size === "wide" ? "wide" : "normal" })) : []
      setWidgets(valid)
    }).catch(error => setMessage(error instanceof Error ? error.message : "Gagal memuat dashboard.")).finally(() => setLoading(false))
  }, [project?.id])

  const save = async (next: CanvasWidget[]) => {
    if (!project) return
    setWidgets(next); setMessage("")
    try { await dashboardApi.save(project.id, next as unknown as Record<string, unknown>[]) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan dashboard.") }
  }
  const add = (entry: (typeof WIDGET_CATALOG)[number]) => {
    const widget: CanvasWidget = { id: crypto.randomUUID(), type:entry.type, title:entry.label, color:defaultColor(widgets.length), size:entry.defaultColSpan > 1 ? "wide" : "normal" }
    save([...widgets, widget]); setShowLibrary(false)
  }
  if (!project) return <Empty title="Pilih atau buat project" text="Dashboard dibuat terpisah untuk setiap project." />
  if (loading) return <div style={{ color:C.muted }}>Memuat canvas dashboard...</div>
  return <div>
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}><Btn variant="ghost" icon="edit">Edit Layout</Btn><Btn variant="ghost" icon="plus" onClick={() => setShowLibrary(true)}>Add Widget</Btn><span style={{ marginLeft:"auto", color:C.muted, fontSize:11 }}>{widgets.length} widget{widgets.length === 1 ? "" : "s"} active</span></div>
    {message && <p style={{ color:C.coral, fontSize:12 }}>{message}</p>}
    {widgets.length === 0 ? <EmptyCanvas onAdd={() => setShowLibrary(true)} /> : <div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:14 }}>{widgets.map(widget => <Card key={widget.id} style={{ minHeight:180, padding:20, gridColumn:widget.size === "wide" ? "span 2" : "span 1", position:"relative" }}><button onClick={() => save(widgets.filter(item => item.id !== widget.id))} title="Hapus widget" style={{ position:"absolute", top:12, right:12, border:0, background:"transparent", color:C.muted, cursor:"pointer" }}><Icon name="close" size={15} /></button><div style={{ width:38, height:38, display:"grid", placeItems:"center", borderRadius:10, background:`${widget.color}18`, marginBottom:16 }}><Icon name={WIDGET_CATALOG.find(entry => entry.type === widget.type)?.icon ?? "dashboard"} size={18} color={widget.color} /></div><b style={{ color:C.light }}>{widget.title}</b><div style={{ marginTop:24, color:C.muted, fontSize:12, lineHeight:1.55 }}>Belum ada telemetry.<br />Hubungkan perangkat dan pilih channel untuk menampilkan data.</div></Card>)}</div>}
    {showLibrary && <WidgetLibrary onAdd={add} onClose={() => setShowLibrary(false)} />}
  </div>
}

export function Empty({ title, text }: { title: string; text: string }) {
  return <Card style={{ padding:42, textAlign:"center" }}><Icon name="dashboard" size={32} color={C.muted} /><h3 style={{ color:C.light }}>{title}</h3><p style={{ color:C.muted, fontSize:13 }}>{text}</p></Card>
}
