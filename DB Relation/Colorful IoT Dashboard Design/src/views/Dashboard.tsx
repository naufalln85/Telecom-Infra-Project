import React, { useEffect, useState } from "react"
import { dashboardApi, devicesApi, type Project } from "@/lib/api"
import { Btn, Card, Icon } from "@/components/Shared"
import { C } from "@/lib/theme"

type Widget = { id: string; title: string; kind: "device-count" | "note"; text?: string }

export default function DashboardView({ project }: { project: Project | null }) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [deviceCount, setDeviceCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  useEffect(() => {
    setWidgets([]); setDeviceCount(0); setMessage("")
    if (!project) return
    setLoading(true)
    Promise.all([dashboardApi.get(project.id), devicesApi.list(project.id)])
      .then(([saved, devices]) => { setWidgets(saved as Widget[]); setDeviceCount(devices.length) })
      .catch(error => setMessage(error instanceof Error ? error.message : "Gagal memuat dashboard."))
      .finally(() => setLoading(false))
  }, [project?.id])
  const save = async (next: Widget[]) => {
    if (!project) return
    setWidgets(next); setMessage("")
    try { await dashboardApi.save(project.id, next as unknown as Record<string, unknown>[]) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan dashboard.") }
  }
  if (!project) return <Empty title="Pilih atau buat project" text="Dashboard dibuat terpisah untuk setiap project." />
  if (loading) return <div style={{ color: C.muted }}>Memuat dashboard...</div>
  return <div>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div><h2 style={{ margin: 0, color: C.light }}>Dashboard {project.name}</h2><p style={{ color: C.muted, fontSize: 12 }}>Data dan susunan widget hanya milik project ini.</p></div>
      <div style={{ marginLeft: "auto" }}><Btn icon="plus" onClick={() => save([...widgets, { id: crypto.randomUUID(), title: "Catatan project", kind: "note", text: "Tambahkan perangkat untuk mulai menerima telemetry." }])}>Tambah Widget</Btn></div>
    </div>
    {message && <p style={{ color: C.coral, fontSize: 12 }}>{message}</p>}
    {widgets.length === 0 ? <Empty title="Dashboard masih kosong" text="Ini normal. Tambahkan widget atau daftarkan perangkat pertama Anda." /> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {widgets.map(widget => <Card key={widget.id} style={{ padding: 20, minHeight: 130 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ color: C.light }}>{widget.title}</b><button onClick={() => save(widgets.filter(item => item.id !== widget.id))} style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer" }}><Icon name="close" size={15} /></button></div>
          {widget.kind === "device-count" ? <div style={{ fontSize: 42, marginTop: 22, color: C.coral }}>{deviceCount}</div> : <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{widget.text}</p>}
        </Card>)}
      </div>}
  </div>
}
export function Empty({ title, text }: { title: string; text: string }) {
  return <Card style={{ padding: 42, textAlign: "center" }}><Icon name="dashboard" size={32} color={C.muted} /><h3 style={{ color: C.light }}>{title}</h3><p style={{ color: C.muted, fontSize: 13 }}>{text}</p></Card>
}
