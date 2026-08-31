import React, { useEffect, useState } from "react"
import { channelsApi, devicesApi, membersApi, publicTelemetryUrl, telemetryApi, type Channel, type Device, type Member, type Project, type TelemetryEvent } from "@/lib/api"
import { Btn, Card, Icon, Input, PageHeader, Pill } from "@/components/Shared"
import { C } from "@/lib/theme"
import { Empty } from "./Dashboard"

const errorText = (error: unknown) => error instanceof Error ? error.message : "Permintaan gagal."
export function DevicesView({ project }: { project: Project | null }) {
  const [devices, setDevices] = useState<Device[]>([]), [latestEvents, setLatestEvents] = useState<TelemetryEvent[]>([]), [name, setName] = useState(""), [apiKey, setApiKey] = useState(""), [channel, setChannel] = useState(""), [value, setValue] = useState(""), [error, setError] = useState(""), [simulated, setSimulated] = useState(false)

  useEffect(() => {
    if (!project) {
      setDevices([])
      setLatestEvents([])
      return
    }
    let active = true
    const refresh = () => Promise.all([devicesApi.list(project.id), telemetryApi.latest(project.id)])
      .then(([nextDevices, events]) => { if (active) { setDevices(nextDevices); setLatestEvents(events) } })
      .catch(e => { if (active) setError(errorText(e)) })
    refresh()
    const timer = window.setInterval(refresh, 10_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [project?.id])

  if (!project) return <Empty title="Belum ada project aktif" text="Buat project terlebih dahulu sebelum menambahkan perangkat." />
  const refresh = () => Promise.all([devicesApi.list(project.id), telemetryApi.latest(project.id)]).then(([nextDevices, events]) => { setDevices(nextDevices); setLatestEvents(events) }).catch(e => setError(errorText(e)))
  const add = async () => { try { const device = await devicesApi.create(project.id, name); setName(""); setApiKey(device.api_key ?? ""); refresh() } catch (e) { setError(errorText(e)) } }
  return <div><PageHeader icon="devices" title="Devices" sub={`Perangkat hanya dapat mengirim data ke project ${project.name}.`} action={<Btn icon="plus" disabled={name.trim().length < 2} onClick={add}>New Device</Btn>} />
    <div style={{ display: "flex", gap: 8, maxWidth: 520, margin: "-4px 0 20px" }}><Input value={name} onChange={setName} placeholder="Nama perangkat, mis. ESP32 Ruang Server" /></div>
    {error && <p style={{ color: C.coral, fontSize: 12 }}>{error}</p>}{apiKey && <Card style={{ padding: 16, marginBottom: 18, border: `1px solid ${C.amber}` }}><b style={{ color: C.light }}>Simpan API key ini sekarang</b><code style={{ display: "block", color: C.amber, overflowWrap: "anywhere", marginTop: 8 }}>{apiKey}</code><small style={{ color: C.muted }}>Key tidak dapat dilihat lagi setelah panel ini ditutup.</small><div style={{ marginTop: 14, color: C.light, fontWeight: 700, fontSize: 13 }}>Endpoint perangkat publik</div><code style={{ display: "block", color: C.teal, overflowWrap: "anywhere", marginTop: 8 }}>{publicTelemetryUrl()}</code><small style={{ color: C.muted }}>Kirim POST HTTPS ke endpoint ini dengan header <code>x-api-key</code>. Perangkat dapat berada di jaringan mana pun; gunakan nama domain website, bukan IP server.</small><div style={{ marginTop: 14, color: C.light, fontWeight: 700, fontSize: 13 }}>Simulasi telemetry HTTP</div><div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}><Input value={channel} onChange={setChannel} placeholder="channel, mis. temperature" style={{ maxWidth: 210 }} /><Input value={value} onChange={setValue} placeholder="nilai, mis. 25.4" style={{ maxWidth: 150 }} /><Btn size="sm" disabled={!channel.trim() || !value.trim()} onClick={async () => { try { const numeric = Number(value); await telemetryApi.ingest(apiKey, { [channel.trim()]: Number.isFinite(numeric) && value.trim() !== "" ? numeric : value }); setSimulated(true); refresh() } catch (e) { setError(errorText(e)) } }}>Kirim simulasi</Btn></div>{simulated && <small style={{ color: C.teal }}>Telemetry diterima oleh API.</small>}</Card>}
    {devices.length === 0 ? <Empty title="Belum ada perangkat" text="Tidak ada data dummy. Daftarkan perangkat IoT pertama Anda melalui tombol New Device." /> : <div style={{ display: "grid", gap: 10 }}>{devices.map(d => <DeviceCard key={d.id} device={d} telemetry={latestEvents.find(event => event.device_id === d.id)} />)}</div>}
  </div>
}
function DeviceCard({ device, telemetry }: { device: Device; telemetry?: TelemetryEvent }) {
  const [channels, setChannels] = useState<Channel[]>([]), [channel, setChannel] = useState(""), [error, setError] = useState("")
  const refresh = () => channelsApi.list(device.id).then(setChannels).catch(e => setError(errorText(e)))
  useEffect(() => { void refresh() }, [device.id])
  const add = async () => { try { await channelsApi.create(device.id, channel); setChannel(""); refresh() } catch (e) { setError(errorText(e)) } }
  const receivedAt = telemetry?.received_at ? new Date(telemetry.received_at) : null
  const online = Boolean(receivedAt && Date.now() - receivedAt.getTime() < 120_000)
  return <Card style={{ padding: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width:38, height:38, display:"grid", placeItems:"center", borderRadius:10, background:`${C.coral}18` }}><Icon name="devices" color={C.coral} /></div><div style={{ flex:1 }}><b style={{ color: C.light }}>{device.name}</b><div style={{ color:C.muted, fontSize:11, marginTop:3 }}>ID · {device.id} · {receivedAt ? `${telemetry?.protocol} · terakhir ${receivedAt.toLocaleString()}` : "Menunggu telemetry"}</div></div><Pill text={online ? "online" : "ready"} color={online ? C.teal : C.purple} /></div>
    <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>{channels.map(c => <Pill key={c.id} text={`${c.name}${c.unit ? ` (${c.unit})` : ""}`} color={C.purple} />)}</div>
    <div style={{ display: "flex", gap: 8, marginTop: 12, maxWidth: 420 }}><Input value={channel} onChange={setChannel} placeholder="Nama channel, mis. temperature" /><Btn size="sm" disabled={!channel.trim()} onClick={add}>Tambah channel</Btn></div>{error && <small style={{ color: C.coral }}>{error}</small>}
  </Card>
}
export function MembersView({ project, accountId }: { project: Project | null; accountId?: number }) {
  const [members, setMembers] = useState<Member[]>([]), [email, setEmail] = useState(""), [error, setError] = useState("")
  const refresh = () => { if (project) membersApi.list(project.id).then(setMembers).catch(e => setError(errorText(e))) }
  useEffect(refresh, [project?.id])
  if (!project) return <Empty title="Belum ada project aktif" text="Anggota ditambahkan ke masing-masing project." />
  const canManage = project.role === "owner"
  const invite = async () => { try { await membersApi.invite(project.id, email); setEmail(""); refresh() } catch (e) { setError(errorText(e)) } }
  return <div><PageHeader icon="users" title="Users" sub="Anggota ditambahkan pada masing-masing project." action={canManage ? <Btn icon="plus" disabled={!email.includes("@") } onClick={invite}>Create New User</Btn> : undefined} />
    {canManage && <div style={{ display: "flex", gap: 8, maxWidth: 520, margin: "-4px 0 18px" }}><Input value={email} onChange={setEmail} placeholder="email anggota yang sudah terdaftar" type="email" /></div>}
    {error && <p style={{ color: C.coral, fontSize: 12 }}>{error}</p>}<div style={{ display: "grid", gap: 9 }}>{members.map(m => <Card key={m.id} style={{ padding: 15, display: "flex", alignItems: "center", gap: 10 }}><Icon name="user" color={m.role === "owner" ? C.coral : C.purple} /><span style={{ color: C.light, flex: 1 }}>{m.email}</span><Pill text={m.role === "owner" ? "ketua" : "anggota"} color={m.role === "owner" ? C.coral : C.purple} />{canManage && m.id !== accountId && <button onClick={() => membersApi.remove(project.id, m.id).then(refresh).catch(e => setError(errorText(e)))} style={{ border: 0, background: "transparent", color: C.muted, cursor: "pointer" }}><Icon name="close" /></button>}</Card>)}</div>
  </div>
}
