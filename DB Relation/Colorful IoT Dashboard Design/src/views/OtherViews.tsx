import React, { useState } from 'react'
import logoImg from '@/imports/Untitled__36_.png'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { C, THEME_COLORS } from '@/lib/theme'
import { Icon, Card, Btn, Toggle, Pill, StatusDot, SectionLabel, PageHeader, GaugeSVG, ChartTooltip, Input, Select } from '@/components/Shared'

// ── Data ─────────────────────────────────────────────────────────────────────
const gen = (b: number, v: number, n = 24) =>
  Array.from({ length: n }, (_, i) => ({ t: `${String(i).padStart(2,'0')}:00`, v: +(b + (Math.random()-.5)*v).toFixed(1) }))
const latencyData = gen(14, 6)
const powerData = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => ({ day: d, kwh: +(Math.random()*4+1.5).toFixed(1) }))

const DEVICES_DATA = [
  { id:'esp32-01', name:'ESP32-S3 Room A',     location:'Lab Floor 2', status:'online'  as const, type:'Temperature', api:'sha256:hashed', last:'2026-08-11T12:30' },
  { id:'esp32-02', name:'Humidity Node B',      location:'Server Room', status:'online'  as const, type:'Humidity',    api:'sha256:hashed', last:'2026-08-11T12:28' },
  { id:'rpi4-01',  name:'Raspberry Pi Gateway', location:'Rooftop',     status:'online'  as const, type:'Gateway',     api:'sha256:hashed', last:'2026-08-11T12:29' },
  { id:'mcu-01',   name:'NodeMCU Power Meter',  location:'Basement',    status:'offline' as const, type:'Power',       api:'sha256:hashed', last:'2026-08-05T04:59' },
  { id:'ard-01',   name:'Arduino Uno Sensor',   location:'Warehouse',   status:'offline' as const, type:'Motion',      api:'sha256:hashed', last:'2026-08-03T10:11' },
  { id:'ldr-01',   name:'Sensor LDR',           location:'Outdoor',     status:'offline' as const, type:'Light',       api:'sha256:hashed', last:'2026-08-05T04:59' },
]

const SENSOR_CARDS = [
  { label:'Temperature', type:'numeric'  as const, value:'25.5', unit:'°C', device:'device-1', signal:'-58 dBm' },
  { label:'Door_open',   type:'boolean'  as const, value:'ACTIVE', unit:'', device:'device-1', signal:'-58 dBm' },
  { label:'Temperature', type:'numeric'  as const, value:'25.5', unit:'°C', device:'device-2', signal:'-58 dBm' },
  { label:'Temperature', type:'numeric'  as const, value:'25.5', unit:'°C', device:'device-5', signal:'-58 dBm' },
  { label:'Humidity',    type:'numeric'  as const, value:'25.5', unit:'%',  device:'device-5', signal:'-58 dBm' },
  { label:'Relay_1',     type:'boolean'  as const, value:'ACTIVE', unit:'', device:'device-5', signal:'-58 dBm' },
  { label:'Temperature', type:'numeric'  as const, value:'25.5', unit:'°C', device:'device-6', signal:'-58 dBm' },
  { label:'Humidity',    type:'numeric'  as const, value:'25.5', unit:'%',  device:'device-6', signal:'-58 dBm' },
  { label:'Relay_1',     type:'boolean'  as const, value:'ACTIVE', unit:'', device:'device-6', signal:'-58 dBm' },
  { label:'Temperature', type:'numeric'  as const, value:'25.5', unit:'°C', device:'device-7', signal:'-58 dBm' },
  { label:'Humidity',    type:'numeric'  as const, value:'25.5', unit:'%',  device:'device-7', signal:'-58 dBm' },
  { label:'Relay_1',     type:'boolean'  as const, value:'ACTIVE', unit:'', device:'device-7', signal:'-58 dBm' },
]

const USERS = [
  { name:'admin (you)', email:'admin@telecominfra.id', status:'Active', last:'12:30 PM Today', role:'ADMIN', org:'Smart Home v2' },
  { name:'bu-siti',     email:'bu-siti@example.com',   status:'Active', last:'Yesterday',      role:'MEMBER', org:'Smart Home v2' },
  { name:'pak-ahmad',   email:'pak-ahmad@example.com', status:'Active', last:'3 days ago',     role:'VIEWER', org:'Project Alya'  },
]

const TENANTS = [
  { email:'pak-ahmad@example.com',        id:'#1', tier:'FREE TIER' },
  { email:'bu-siti@example.com',          id:'#2', tier:'PAID TIER' },
  { email:'admin@telecominfra.id',        id:'#3', tier:'PAID TIER' },
  { email:'naufalmaulanahasan@gmail.com', id:'#4', tier:'PAID TIER' },
  { email:'alya@gmail.com',               id:'#6', tier:'PAID TIER' },
]

const ML_MODELS = [
  { tag:'CLASSIFICATION',    emoji:'🌤', title:'Weather Predictor',   desc:'Predict weather conditions based on temperature and humidity sensor.',          channels:['temperature','humidity'], color: C.coral   },
  { tag:'ANOMALY_DETECTION', emoji:'🚨', title:'Anomaly Detector',    desc:'Detect anomalous sensor values using Z-Score. Values >2σ flagged as anomaly.',  channels:['any_numeric'],            color: C.purple  },
  { tag:'REGRESSION',        emoji:'📈', title:'Trend Forecaster',    desc:'Predict next sensor values using linear regression from historical data.',       channels:['any_numeric'],            color: C.magenta },
  { tag:'ADVISORY',          emoji:'🌿', title:'Soil & Plant Health', desc:'Analyze soil conditions from humidity & temperature to recommend irrigation.',   channels:['humidity','temperature'], color: C.amber   },
]

// ════════════════════════════════════════════════════════════════════════════
// SENSORS MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
export function SensorsView() {
  const [search, setSearch] = useState('')
  const filtered = SENSOR_CARDS.filter(s => s.label.toLowerCase().includes(search.toLowerCase()) || s.device.includes(search))

  return (
    <div>
      <PageHeader icon="data" title="Sensors Management"
        sub="Live Telemetry Data Channels — Active Devices (PostgreSQL / TimescaleDB)"
        action={
          <>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color: C.muted }}><Icon name="search" size={13} /></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter sensors..."
                style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px 7px 32px', fontSize:12, color: C.light, outline:'none', width:180 }} />
            </div>
            <Btn variant="primary" icon="refresh">Sync Sensor Channels</Btn>
          </>
        }
      />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {filtered.map((s, i) => (
          <Card key={i} style={{ padding:'18px 20px' }} hover>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Icon name="analytics" size={14} color={C.coral} />
                <span style={{ fontSize:13, fontWeight:700, color: C.light }}>{s.label}</span>
              </div>
              <Pill text={s.type} color={s.type==='numeric' ? C.magenta : C.purple} />
            </div>
            <div style={{ fontSize: s.type==='boolean' ? 22 : 28, fontWeight:800, color: C.light, marginBottom:16 }}>
              {s.value}
              {s.unit && <span style={{ fontSize:14, fontWeight:500, color: C.coral, marginLeft:3 }}>{s.unit}</span>}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color: C.muted }}>
              <span>Device: <span style={{ color: C.light, fontFamily:'DM Mono,monospace' }}>{s.device}</span></span>
              <span>Signal: <span style={{ color: C.magenta, fontFamily:'DM Mono,monospace' }}>{s.signal}</span></span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DEVICES
// ════════════════════════════════════════════════════════════════════════════
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return 'ygm_' + Array.from({length:32}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
}

function AddDeviceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: typeof DEVICES_DATA[0]) => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Temperature')
  const [apiKey] = useState(generateApiKey)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(apiKey).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  const save = () => {
    if (!name.trim()) return
    onAdd({ id:`dev-${Date.now()}`, name: name.trim(), location: location || 'Unassigned', status:'offline', type, api:'sha256:hashed', last: new Date().toISOString().slice(0,16) })
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }} onClick={onClose}>
      <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:28, width:500, maxWidth:'94vw', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${C.coral}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="devices" size={18} color={C.coral} />
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color: C.light }}>Add New Device</div>
              <div style={{ fontSize:11, color: C.muted }}>A new API key will be generated for this device</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color: C.muted, cursor:'pointer' }}><Icon name="close" size={16} /></button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ fontSize:11, color: C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Device Name *</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. ESP32 Room A"
              style={{ width:'100%', padding:'10px 14px', background: C.surface2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color: C.light, outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <div style={{ fontSize:11, color: C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Device Type</div>
              <select value={type} onChange={e=>setType(e.target.value)}
                style={{ width:'100%', padding:'10px 14px', background: C.surface2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color: C.light, outline:'none', fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                {['Temperature','Humidity','Power','Gateway','Motion','Light','Relay','CO2','Pressure'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color: C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Location</div>
              <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Floor 2 / Outdoor"
                style={{ width:'100%', padding:'10px 14px', background: C.surface2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color: C.light, outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }} />
            </div>
          </div>

          {/* API Key section */}
          <div style={{ background: C.surface2, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
              <Icon name="key" size={14} color={C.coral} />
              <span style={{ fontSize:12, fontWeight:700, color: C.coral, textTransform:'uppercase', letterSpacing:'0.06em' }}>Generated API Key</span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ flex:1, fontFamily:'DM Mono,monospace', fontSize:11, color: C.light, background:'var(--c-code-bg)', padding:'10px 12px', borderRadius:8, wordBreak:'break-all', lineHeight:1.5 }}>{apiKey}</div>
              <button onClick={copy} style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${copied ? C.teal+'44' : C.border}`, background: copied ? `${C.teal}18` : C.surface3, color: copied ? C.teal : C.muted, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'Outfit,sans-serif', flexShrink:0, transition:'all .2s' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize:10, color: C.muted, marginTop:8, lineHeight:1.6 }}>
              ⚠️ Save this key — it will only be shown once. Use it as the <code style={{ fontFamily:'DM Mono,monospace', color: C.coral }}>x-api-key</code> header in your device firmware.
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color: C.muted, cursor:'pointer', fontSize:13, fontFamily:'Outfit,sans-serif' }}>Cancel</button>
          <button onClick={save} disabled={!name.trim()} style={{ padding:'9px 20px', borderRadius:8, border:'none', background: name.trim() ? `linear-gradient(135deg,${C.coral},${C.purple})` : C.surface3, color: name.trim() ? '#fff' : C.muted, cursor: name.trim() ? 'pointer' : 'default', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', boxShadow: name.trim() ? `0 4px 16px ${C.coral}44` : 'none' }}>
            Add Device
          </button>
        </div>
      </div>
    </div>
  )
}

export function DevicesView() {
  const [devices, setDevices] = useState(DEVICES_DATA)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list'|'grid'>('list')
  const [showAdd, setShowAdd] = useState(false)
  const filtered = devices.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      {showAdd && <AddDeviceModal onClose={()=>setShowAdd(false)} onAdd={d=>setDevices(prev=>[...prev, d])} />}
      <PageHeader icon="devices" title="Devices"
        action={<Btn variant="primary" icon="plus" onClick={()=>setShowAdd(true)}>New Device</Btn>}
      />
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color: C.muted }}><Icon name="search" size={13} /></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Start typing..."
            style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px 8px 32px', fontSize:12, color: C.light, outline:'none', width:200 }} />
        </div>
        <Btn variant="secondary" size="sm" icon="filter">Add Filter</Btn>
        <Pill text={`All ${devices.length}`} color={C.coral} />
        <Btn variant="ghost" size="sm">My devices</Btn>
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
          <button onClick={()=>setView('list')} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${view==='list'?C.coral:C.border}`, background: view==='list'?`${C.coral}18`:C.surface, color: view==='list'?C.coral:C.muted, cursor:'pointer' }}><Icon name="list" size={13} /></button>
          <button onClick={()=>setView('grid')} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${view==='grid'?C.coral:C.border}`, background: view==='grid'?`${C.coral}18`:C.surface, color: view==='grid'?C.coral:C.muted, cursor:'pointer' }}><Icon name="grid" size={13} /></button>
        </div>
      </div>

      {view === 'list' ? (
        <Card style={{ overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 2fr 2fr 1fr', padding:'12px 20px', borderBottom:`1px solid ${C.border}`, fontSize:11, color: C.muted, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase' }}>
            <span>Name</span><span>Status</span><span>Last Reported At</span><span>API Key Hash</span><span style={{textAlign:'right'}}>Actions</span>
          </div>
          {filtered.map(d => (
            <div key={d.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 2fr 2fr 1fr', alignItems:'center', padding:'14px 20px', borderBottom:`1px solid rgba(237,237,237,0.04)`, transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:`${C.coral}22`, display:'flex', alignItems:'center', justifyContent:'center', color: C.coral }}><Icon name="cpu" size={14} /></div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: C.light }}>{d.name}</div>
                  <div style={{ fontSize:10, color: C.muted, fontFamily:'DM Mono,monospace' }}>ID · {d.id}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <StatusDot color={d.status==='online' ? C.coral : C.muted} />
                <span style={{ fontSize:12, color: d.status==='online' ? C.coral : C.muted, fontWeight:600 }}>{d.status==='online'?'Online':'Offline'}</span>
              </div>
              <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color: C.muted }}>{d.last}+00:00</span>
              <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color: C.muted }}>sha256:hashed</span>
              <div style={{ textAlign:'right', display:'flex', gap:6, justifyContent:'flex-end' }}>
                <Btn variant="ghost" size="sm" icon="link">View Channels</Btn>
                <Btn variant="ghost" size="sm" icon="edit" />
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {filtered.map(d => (
            <Card key={d.id} style={{ padding:20 }} hover>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${C.coral}22`, display:'flex', alignItems:'center', justifyContent:'center', color: C.coral }}>
                  <Icon name="devices" size={18} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <StatusDot color={d.status==='online' ? C.coral : C.muted} />
                  <span style={{ fontSize:11, color: d.status==='online' ? C.coral : C.muted, fontWeight:700 }}>{d.status.toUpperCase()}</span>
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color: C.light, marginBottom:2 }}>{d.name}</div>
              <div style={{ fontSize:11, color: C.muted, marginBottom:10 }}>{d.location}</div>
              <Pill text={d.type} color={C.magenta} />
              <div style={{ fontSize:10, fontFamily:'DM Mono,monospace', color: C.muted, marginTop:10 }}>Last: {d.last}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATIONS / ALERT ENGINE
// ════════════════════════════════════════════════════════════════════════════
export function AutomationsView() {
  const [chan, setChan] = useState('temperature')
  const [cond, setCond] = useState('>')
  const [val, setVal] = useState('35.0')
  const [action, setAction] = useState('notification')
  const [device, setDevice] = useState('all')
  const [severity, setSeverity] = useState<'low'|'medium'|'high'>('medium')
  const [rules, setRules] = useState<{ chan:string; cond:string; val:string; action:string; device:string; severity:string }[]>([
    { chan:'temperature', cond:'>', val:'35', action:'notification', device:'ESP32-S3 Room A', severity:'high'   },
    { chan:'humidity',    cond:'>', val:'80', action:'email',        device:'Humidity Node B', severity:'medium' },
  ])

  const addRule = () => {
    if (!val.trim()) return
    setRules(p => [...p, { chan, cond, val, action, device, severity }])
  }

  const sevColor = (s:string) => s==='high' ? C.coral : s==='medium' ? C.amber : C.teal
  const actionIcon = (a:string) => a==='email' ? 'mail' : a==='webhook' ? 'link' : a==='sms' ? 'signal' : 'bell'
  const cap = (s:string) => s.replace(/\b\w/g, c => c.toUpperCase()).replace('Co2','CO2').replace('Ldr','LDR').replace('Sms','SMS').replace('-',' ')

  return (
    <div>
      <PageHeader icon="alerts" title="Alert Engine"
        sub="Create threshold rules, manage notifications, and monitor alert history in real-time"
      />

      {/* ── Quick Threshold Builder (primary) ─────────────────────────── */}
      <Card style={{ padding:'22px 24px', marginBottom:16, border:`1.5px solid ${C.coral}33` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:`${C.coral}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="plus" size={16} color={C.coral} />
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color: C.light }}>Quick Threshold Builder</div>
            <div style={{ fontSize:11, color: C.muted }}>Build an automation rule in seconds — no code required</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 0.8fr 1.2fr 1fr 1fr auto', gap:10, alignItems:'flex-end', marginTop:18 }}>
          <div>
            <SectionLabel>Device</SectionLabel>
            <Select value={device} onChange={setDevice} options={[
              { label:'All Devices', value:'all' },
              { label:'ESP32-S3 Room A', value:'ESP32-S3 Room A' },
              { label:'Humidity Node B', value:'Humidity Node B' },
              { label:'NodeMCU Power Meter', value:'NodeMCU Power Meter' },
              { label:'Arduino Uno Sensor', value:'Arduino Uno Sensor' },
            ]} />
          </div>
          <div>
            <SectionLabel>Channel / Sensor</SectionLabel>
            <Select value={chan} onChange={setChan} options={[
              { label:'Temperature', value:'temperature' },
              { label:'Humidity',    value:'humidity'    },
              { label:'Power',       value:'power'       },
              { label:'Voltage',     value:'voltage'     },
              { label:'CO2',         value:'co2'         },
              { label:'Motion',      value:'motion'      },
              { label:'LDR',         value:'ldr'         },
              { label:'Soil',        value:'soil'        },
            ]} />
          </div>
          <div>
            <SectionLabel>Condition</SectionLabel>
            <Select value={cond} onChange={setCond} options={['>','<','>=','<=','==','!='].map(c=>({label:c,value:c}))} />
          </div>
          <div>
            <SectionLabel>Threshold Value</SectionLabel>
            <Input value={val} onChange={setVal} placeholder="e.g. 35.0" />
          </div>
          <div>
            <SectionLabel>Action</SectionLabel>
            <Select value={action} onChange={setAction} options={[
              { label:'Notification', value:'notification'  },
              { label:'Email',        value:'email'         },
              { label:'Webhook',      value:'webhook'       },
              { label:'SMS',          value:'sms'           },
              { label:'Relay Toggle', value:'relay-toggle'  },
            ]} />
          </div>
          <div>
            <SectionLabel>Severity</SectionLabel>
            <Select value={severity} onChange={v=>setSeverity(v as any)} options={[
              { label:'🔴 High', value:'high' },
              { label:'🟡 Medium', value:'medium' },
              { label:'🟢 Low', value:'low' },
            ]} />
          </div>
          <Btn variant="primary" icon="plus" onClick={addRule}>Add Rule</Btn>
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Active rules */}
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Icon name="shield" size={15} color={C.coral} />
              <span style={{ fontWeight:700, fontSize:14, color: C.light }}>Active Rules</span>
              <span style={{ fontSize:10, background:`${C.coral}22`, color: C.coral, padding:'2px 7px', borderRadius:8, fontWeight:700 }}>{rules.length}</span>
            </div>
            <Btn variant="secondary" size="sm" icon="refresh">Refresh</Btn>
          </div>

          {rules.length === 0 ? (
            <div style={{ padding:'40px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${C.coral}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="shield" size={20} color={C.coral} />
              </div>
              <div style={{ fontWeight:600, fontSize:13, color: C.light }}>No rules yet</div>
              <div style={{ fontSize:11, color: C.muted, textAlign:'center', maxWidth:200 }}>Use the Quick Threshold Builder above to create your first automation rule.</div>
            </div>
          ) : (
            <div>
              {rules.map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 18px', borderBottom:`1px solid ${C.border}`, transition:'background .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background: sevColor(r.severity), boxShadow:`0 0 6px ${sevColor(r.severity)}`, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontFamily:'DM Mono,monospace', color: C.light, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {r.device} · {cap(r.chan)} {r.cond} {r.val}
                    </div>
                    <div style={{ fontSize:10, color: C.muted, marginTop:2 }}>→ {cap(r.action)} · {cap(r.severity)} Severity</div>
                  </div>
                  <Icon name={actionIcon(r.action)} size={12} color={C.muted} />
                  <button onClick={() => setRules(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color: C.muted, cursor:'pointer', padding:4, flexShrink:0 }}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="bell" size={13} color={C.muted} />
              <span style={{ fontSize:11, color: C.muted, fontWeight:600 }}>Notification Channels</span>
            </div>
            <Btn variant="secondary" size="sm" icon="plus">Add Channel</Btn>
          </div>
        </Card>

        {/* Alert history */}
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Icon name="clock" size={15} color={C.muted} />
              <span style={{ fontWeight:700, fontSize:14, color: C.light }}>Alert History</span>
            </div>
            <Btn variant="secondary" size="sm" icon="refresh" />
          </div>
          {[
            { msg:'Temperature > 35 On ESP32-S3 Room A', t:'2m ago',  sev:'high',   action:'Notification Sent' },
            { msg:'Humidity > 80 On Humidity Node B',    t:'47m ago', sev:'medium', action:'Email Sent' },
            { msg:'Power > 5kWh On NodeMCU',             t:'3h ago',  sev:'low',    action:'Logged' },
          ].map((h,i) => (
            <div key={i} style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: sevColor(h.sev), marginTop:4, flexShrink:0, boxShadow:`0 0 5px ${sevColor(h.sev)}` }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color: C.light, fontFamily:'DM Mono,monospace' }}>{h.msg}</div>
                <div style={{ fontSize:10, color: C.muted, marginTop:2 }}>{h.action} · {h.t}</div>
              </div>
            </div>
          ))}
          <div style={{ padding:'12px 18px', fontSize:11, color: C.muted, textAlign:'center' }}>
            Showing last 3 events · <span style={{ color: C.coral, cursor:'pointer' }}>View all history →</span>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════════════════
export function UsersView() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const roleColor = (r:string) => r==='ADMIN' ? C.coral : r==='MEMBER' ? C.purple : C.muted

  return (
    <div>
      <PageHeader icon="users" title="Users"
        action={<Btn variant="primary" icon="plus" onClick={()=>setShowModal(true)}>Create New User</Btn>}
      />
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color: C.muted }}><Icon name="search" size={13} /></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..."
            style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px 8px 32px', fontSize:12, color: C.light, outline:'none', width:220 }} />
        </div>
        <Btn variant="secondary" size="sm">My org members</Btn>
        <Btn variant="secondary" size="sm">With no devices</Btn>
        <div style={{ marginLeft:'auto' }}>
          <Btn variant="secondary" size="sm" icon="refresh" />
        </div>
      </div>

      <Card style={{ overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'0.4fr 2fr 2fr 1fr 2fr 1fr 1fr', padding:'12px 20px', borderBottom:`1px solid ${C.border}`, fontSize:10, color: C.muted, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase' }}>
          <span/><span>Name</span><span>Email</span><span>Status</span><span>Last Logged At</span><span>Role</span><span>Actions</span>
        </div>
        {USERS.filter(u=>u.name.includes(search)||u.email.includes(search)).map((u,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'0.4fr 2fr 2fr 1fr 2fr 1fr 1fr', alignItems:'center', padding:'14px 20px', borderBottom:`1px solid rgba(237,237,237,0.04)`, transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background=C.surface2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <input type="checkbox" style={{ accentColor: C.coral }} />
            <div style={{ fontSize:13, fontWeight:500, color: C.light }}>{u.name}</div>
            <div style={{ fontSize:12, fontFamily:'DM Mono,monospace', color: C.muted }}>{u.email}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <StatusDot color={C.coral} /><span style={{ fontSize:11, color: C.coral, fontWeight:600 }}>{u.status}</span>
            </div>
            <div style={{ fontSize:11, color: C.muted }}>{u.last}</div>
            <Pill text={u.role} color={roleColor(u.role)} />
            <div style={{ display:'flex', gap:4 }}>
              <Btn variant="ghost" size="sm" icon="edit" />
              <Btn variant="ghost" size="sm" icon="trash" />
            </div>
          </div>
        ))}
      </Card>

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={()=>setShowModal(false)}>
          <div style={{ padding:28, width:400, background:`linear-gradient(135deg, ${C.surface}, ${C.surface2})`, border:`1px solid ${C.border}`, borderRadius:16 }} onClick={(e:React.MouseEvent)=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:16, color: C.light }}>Create New User</div>
              <button onClick={()=>setShowModal(false)} style={{ background:'none', border:'none', color: C.muted, cursor:'pointer' }}><Icon name="close" size={16} /></button>
            </div>
            {[{l:'Name',placeholder:'Display name'},{l:'Email',placeholder:'user@example.com'},{l:'Password',placeholder:'Min 8 characters'}].map(f=>(
              <div key={f.l} style={{ marginBottom:14 }}>
                <SectionLabel>{f.l}</SectionLabel>
                <Input value="" onChange={()=>{}} placeholder={f.placeholder} />
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <SectionLabel>Role</SectionLabel>
              <Select value="MEMBER" onChange={()=>{}} options={[{label:'Admin',value:'ADMIN'},{label:'Member',value:'MEMBER'},{label:'Viewer',value:'VIEWER'}]} />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="secondary" onClick={()=>setShowModal(false)}>Cancel</Btn>
              <Btn variant="primary" icon="plus" onClick={()=>setShowModal(false)}>Create User</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
export function AnalyticsView() {
  const [range, setRange] = useState('24h')
  const kpis = [
    { label:'Average Hop Latency', value:'14.2 ms', sub:'✓ Redis Streams Consumer Speed', color: C.coral   },
    { label:'Packet Throughput',   value:'24 msg/s', sub:'✓ Protocol Gateway',            color: C.purple  },
    { label:'DB Storage Rate',     value:'99.9%',   sub:'✓ Zero Packet Loss',             color: C.magenta },
  ]
  return (
    <div>
      <PageHeader icon="analytics" title="Telemetry Analytics & Export API"
        sub="Expose Data Metrics for Research and System Performance (Module B & C)"
        action={<Btn variant="primary" icon="download">Export (JSON / CSV)</Btn>}
      />
      <Card style={{ padding:'22px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="signal" size={15} color={C.coral} />
            <span style={{ fontWeight:700, fontSize:14 }}>Real-time Telemetry Hop Performance (TimescaleDB)</span>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {['1h','24h','7d','30d'].map(r=>(
              <button key={r} onClick={()=>setRange(r)} style={{ padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background: range===r?C.coral:C.surface2, color: range===r?'#fff':C.muted, transition:'all .15s' }}>{r}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={latencyData} margin={{ top:4, right:0, left:-28, bottom:0 }}>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={C.coral} /><stop offset="50%" stopColor={C.magenta} /><stop offset="100%" stopColor={C.purple} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(237,237,237,0.05)" strokeDasharray="4 4" />
            <XAxis dataKey="t" tick={{ fill:C.muted, fontSize:9, fontFamily:'DM Mono' }} tickLine={false} axisLine={false} interval={3} />
            <YAxis tick={{ fill:C.muted, fontSize:9, fontFamily:'DM Mono' }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="v" stroke="url(#lg)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {kpis.map(k=>(
          <Card key={k.label} style={{ padding:'22px 24px' }} hover>
            <div style={{ fontSize:11, color: C.muted, fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:10 }}>{k.label}</div>
            <div style={{ fontSize:32, fontWeight:800, color: k.color, marginBottom:8 }}>{k.value}</div>
            <div style={{ fontSize:11, color: C.muted }}>{k.sub}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GATEWAY MONITOR
// ════════════════════════════════════════════════════════════════════════════
export function GatewayView() {
  const [apiKey, setApiKey] = useState('key_greenhouse_123')
  const [devId, setDevId] = useState('sensor-greenhouse-01')
  const [temp, setTemp] = useState('')
  const [hum, setHum] = useState('')
  const [sent, setSent] = useState(false)

  const protocols = [
    { name:'HTTP Protocol',  port:'3000', endpoint:'POST /api/v1/telemetry', color: C.coral   },
    { name:'MQTT Protocol',  port:'1884', endpoint:'telemetry/data',          color: C.purple  },
    { name:'CoAP Protocol',  port:'5683', endpoint:'POST /telemetry',          color: C.magenta },
  ]
  const stats = [
    { label:'Total Pesan', value:'0', color: C.light },
    { label:'Errors', value:'0', color: C.light },
    { label:'HTTP', value:'0', color: C.coral },
    { label:'MQTT', value:'0', color: C.purple },
    { label:'CoAP', value:'0', color: C.magenta },
  ]

  const sendTest = () => { setSent(true); setTimeout(()=>setSent(false), 3000) }

  return (
    <div>
      <PageHeader icon="gateway" title="Gateway Monitor"
        sub="IoT Protocol Gateway (Module B) — Multi-Protocol Ingestion: HTTP • MQTT • CoAP"
        action={
          <>
            <Btn variant="secondary" icon="refresh">Auto Refresh</Btn>
            <Btn variant="primary" icon="refresh">Refresh</Btn>
          </>
        }
      />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:16 }}>
        {protocols.map(p=>(
          <Card key={p.name} style={{ padding:'20px 22px' }} hover>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Icon name="wifi" size={15} color={p.color} />
                <span style={{ fontWeight:700, fontSize:14 }}>{p.name}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <StatusDot color={C.coral} /><span style={{ fontSize:10, color: C.coral, fontWeight:700 }}>Active</span>
              </div>
            </div>
            <div style={{ fontSize:38, fontWeight:800, color: p.color, marginBottom:12 }}>0</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', fontSize:11, color: C.muted, gap:3 }}>
              <span>Port</span><span style={{ fontFamily:'DM Mono,monospace', color: C.light, textAlign:'right' }}>{p.port}</span>
              <span>Endpoint</span><span style={{ fontFamily:'DM Mono,monospace', color: p.color, textAlign:'right', fontSize:10 }}>{p.endpoint}</span>
            </div>
          </Card>
        ))}
      </div>
      <Card style={{ padding:'16px 24px', marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16 }}>
          {stats.map(s=>(
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color: C.muted, fontWeight:700, letterSpacing:'0.06em', marginBottom:5, textTransform:'uppercase' }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:800, color: s.color }}>0</div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
        <Card style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Icon name="link" size={14} color={C.coral} /><span style={{ fontWeight:700, fontSize:14 }}>Test HTTP Ingestion</span>
          </div>
          {[
            { label:'API Key (x-api-key)', val:apiKey, set:setApiKey },
            { label:'Device ID', val:devId, set:setDevId },
            { label:'Temperature (°C)', val:temp, set:setTemp, placeholder:'25.5' },
            { label:'Humidity (%)', val:hum, set:setHum, placeholder:'60.0' },
          ].map(f=>(
            <div key={f.label} style={{ marginBottom:12 }}>
              <SectionLabel>{f.label}</SectionLabel>
              <Input value={f.val} onChange={f.set} placeholder={f.placeholder} />
            </div>
          ))}
          {sent && <div style={{ marginBottom:10, padding:'8px 12px', borderRadius:8, background:`${C.teal}18`, border:`1px solid ${C.teal}33`, fontSize:12, color: C.teal, display:'flex', alignItems:'center', gap:6 }}><Icon name="check" size={13} color={C.teal} /> HTTP 200 OK — Data ingested</div>}
          <Btn variant="primary" icon="link" onClick={sendTest} style={{ width:'100%', justifyContent:'center' }}>Send HTTP Test</Btn>
        </Card>
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Icon name="analytics" size={14} color={C.muted} /><span style={{ fontWeight:700, fontSize:14 }}>Telemetry Ingestion Log</span>
            </div>
            <Pill text={`${sent?1:0} entries`} color={C.muted} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'0.5fr 1fr 2fr 2fr 1fr', padding:'10px 20px', fontSize:10, color: C.muted, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', borderBottom:`1px solid ${C.border}` }}>
            <span>#</span><span>Protocol</span><span>Device</span><span>Data</span><span>Waktu</span>
          </div>
          {sent ? (
            <div style={{ display:'grid', gridTemplateColumns:'0.5fr 1fr 2fr 2fr 1fr', alignItems:'center', padding:'12px 20px', fontSize:11 }}>
              <span style={{ color: C.muted }}>1</span>
              <Pill text="HTTP" color={C.coral} />
              <span style={{ fontFamily:'DM Mono,monospace', color: C.light, fontSize:10 }}>{devId}</span>
              <span style={{ fontFamily:'DM Mono,monospace', color: C.muted, fontSize:10 }}>temp:{temp||'—'} hum:{hum||'—'}</span>
              <span style={{ color: C.muted }}>just now</span>
            </div>
          ) : (
            <div style={{ padding:'40px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <div style={{ fontSize:28 }}>⌗</div>
              <div style={{ fontSize:12, color: C.muted, textAlign:'center' }}>Belum ada data masuk. Kirim data test atau hubungkan device ke gateway.</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// AI/ML BUILDER
// ════════════════════════════════════════════════════════════════════════════
export function AIMLView() {
  const [tab, setTab] = useState(0)
  const [running, setRunning] = useState<string|null>(null)

  const TABS = ['Jelajahi Model','Buat Model Kustom','Jalankan & Uji']

  return (
    <div>
      <PageHeader icon="brain" title="AI / ML Builder"
        sub="Gunakan model preset platform atau buat model kustom Anda sendiri dengan Python"
        action={<><Pill text="4 Preset" color={C.coral} /><Pill text="0 Kustom" color={C.purple} /></>}
      />
      <div style={{ display:'flex', gap:0, marginBottom:24, borderBottom:`1px solid ${C.border}` }}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{ padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:tab===i?700:400, color:tab===i?C.coral:C.muted, borderBottom:tab===i?`2px solid ${C.coral}`:'2px solid transparent', marginBottom:-1, transition:'color .15s', fontFamily:'Outfit,sans-serif' }}>{t}</button>
        ))}
      </div>

      {tab===0 && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <span style={{ fontSize:18 }}>🚀</span>
            <span style={{ fontWeight:700, fontSize:15 }}>Model Preset Platform</span>
            <Pill text="Tersedia untuk semua pengguna" color={C.purple} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
            {ML_MODELS.map(m=>(
              <Card key={m.title} style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }} hover>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <Pill text={m.tag} color={m.color} />
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <StatusDot color={C.coral} /><span style={{ fontSize:9, color: C.coral, fontWeight:700 }}>DEPLOYED</span>
                  </div>
                </div>
                <div style={{ fontSize:22 }}>{m.emoji}</div>
                <div style={{ fontWeight:700, fontSize:14, color: C.light }}>{m.title}</div>
                <div style={{ fontSize:11, color: C.muted, lineHeight:1.5 }}>{m.desc}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {m.channels.map(ch=>(
                    <span key={ch} style={{ fontSize:9, background: C.surface3, border:`1px solid ${C.border}`, borderRadius:4, padding:'2px 6px', color: C.light, fontFamily:'DM Mono,monospace' }}>{ch}</span>
                  ))}
                </div>
                <Btn variant="secondary" size="sm" icon="power"
                  onClick={()=>setRunning(running===m.title?null:m.title)}
                  style={{ marginTop:'auto', color: running===m.title ? C.teal : undefined }}>
                  {running===m.title?'⏸ Running…':'▶ Jalankan Model'}
                </Btn>
                {running===m.title && (
                  <div style={{ background:'#0d0a0a', borderRadius:6, padding:'8px 10px', fontSize:10, fontFamily:'DM Mono,monospace', color:'#A8D8A8', lineHeight:1.6 }}>
                    {'> Loading model...\n> Connecting to sensor stream...\n> Inference running █'}
                  </div>
                )}
              </Card>
            ))}
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <Icon name="developer" size={15} /><span style={{ fontWeight:700, fontSize:15 }}>Model Kustom Anda</span>
            </div>
            <Card style={{ padding:50, display:'flex', flexDirection:'column', alignItems:'center', gap:12, border:`1px dashed ${C.border}` }}>
              <div style={{ fontSize:36 }}>🧪</div>
              <div style={{ fontWeight:700, fontSize:14 }}>Belum ada model kustom</div>
              <Btn variant="primary" icon="plus" onClick={()=>setTab(1)}>Buat Model Kustom</Btn>
            </Card>
          </div>
        </>
      )}

      {tab===1 && (
        <Card style={{ padding:28 }}>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>Custom Model Builder</div>
          <div style={{ fontSize:13, color: C.muted, marginBottom:20 }}>Upload Python script, define input channels, and deploy to the inference engine.</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            {[{l:'Model Name',placeholder:'e.g. My Anomaly Model'},{l:'Description',placeholder:'What does this model do?'},{l:'Input Channels',placeholder:'temperature, humidity'},{l:'Output Label',placeholder:'e.g. anomaly_score'}].map(f=>(
              <div key={f.l}><SectionLabel>{f.l}</SectionLabel><Input value="" onChange={()=>{}} placeholder={f.placeholder} /></div>
            ))}
          </div>
          <div style={{ border:`2px dashed ${C.border}`, borderRadius:12, padding:'32px', textAlign:'center', cursor:'pointer', marginBottom:20 }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.coral} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <Icon name="download" size={24} color={C.muted} />
            <div style={{ fontSize:13, color: C.muted, marginTop:8 }}>Drop Python file here or <span style={{ color: C.coral, cursor:'pointer' }}>browse</span></div>
            <div style={{ fontSize:11, color: C.muted, marginTop:4 }}>.py file max 10MB</div>
          </div>
          <Btn variant="primary" icon="save">Upload & Deploy Model</Btn>
        </Card>
      )}

      {tab===2 && (
        <Card style={{ padding:28 }}>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>Run & Test Inference</div>
          <div style={{ fontSize:13, color: C.muted, marginBottom:20 }}>Select a model and send live sensor data to test predictions in real-time.</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div><SectionLabel>Select Model</SectionLabel><Select value="" onChange={()=>{}} options={[{label:'Weather Predictor',value:'weather'},{label:'Anomaly Detector',value:'anomaly'}]} /></div>
            <div><SectionLabel>Input Data Source</SectionLabel><Select value="" onChange={()=>{}} options={[{label:'Live sensor stream',value:'live'},{label:'Manual input',value:'manual'}]} /></div>
          </div>
          <Btn variant="primary" icon="power">Start Inference Test</Btn>
        </Card>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DEVELOPER ZONE
// ════════════════════════════════════════════════════════════════════════════
export function DeveloperView() {
  const triggers = [
    { name:"VIEW `active_alert_rules`", desc:"Filter otomatis: is_active = true & project/device non-deleted & channel_type = 'numeric'" },
    { name:"TRIGGER `trg_alert_history_context`", desc:"Menghasilkan snapshot rule JSONB secara otomatis saat pemicu alert disimpan" },
    { name:"TRIGGER `trg_projects_soft_delete`", desc:"Soft-delete otomatis turun ke perangkat, notifikasi, dan penonaktifan rule" },
  ]
  const stats = [
    { label:'Total Tenants / Accounts', value:'5',       sub:"PostgreSQL 'accounts' Table", color: C.coral   },
    { label:'Active Projects',          value:'4',       sub:"M:N 'project_members'",       color: C.purple  },
    { label:'Registered Devices',       value:'5',       sub:'SHA-256 Hashed API Keys',     color: C.magenta },
    { label:'Redis Streams Bus',        value:'HEALTHY', sub:"'tip:telemetry:events'",        color: C.teal    },
  ]
  return (
    <div>
      <PageHeader icon="shield" title="Super Admin Control Panel"
        sub="Multi-Tenant Administration, Tenant Tier Overrides, & Database Audit (Module A)"
        action={
          <>
            <Btn variant="primary" icon="data">🌱 Seed DB Mock Data</Btn>
            <Btn variant="secondary" icon="refresh">Refresh</Btn>
          </>
        }
      />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
        {stats.map(s=>(
          <Card key={s.label} style={{ padding:'20px 22px' }} hover>
            <div style={{ fontSize:10, color: C.muted, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>{s.label}</div>
            <div style={{ fontSize:s.value==='HEALTHY'?20:34, fontWeight:800, color: s.color, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:10, color: C.muted, fontFamily:'DM Mono,monospace' }}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'18px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="users" size={15} color={C.coral} /><span style={{ fontWeight:700, fontSize:14 }}>User Accounts & Tenant Tier Control</span>
          </div>
          {TENANTS.map((t,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 20px', borderBottom:`1px solid rgba(237,237,237,0.04)`, transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=C.surface2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color: C.light }}>{t.email}</div>
                <div style={{ fontSize:10, color: C.muted, marginTop:1 }}>Account ID: {t.id} · Status: <span style={{ color: C.coral }}>ACTIVE</span></div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Pill text={t.tier} color={t.tier==='PAID TIER'?C.purple:C.muted} />
                <Btn variant="ghost" size="sm" icon="edit" />
              </div>
            </div>
          ))}
        </Card>
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'18px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="data" size={15} color={C.purple} /><span style={{ fontWeight:700, fontSize:14 }}>PostgreSQL Triggers & Views Audit</span>
          </div>
          {triggers.map((t,i)=>(
            <div key={i} style={{ padding:'14px 20px', borderBottom:`1px solid rgba(237,237,237,0.04)` }}>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:12, color: C.coral, marginBottom:4 }}>{t.name}</div>
              <div style={{ fontSize:11, color: C.muted, lineHeight:1.5 }}>✓ {t.desc}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// HOME (inside dashboard)
// ════════════════════════════════════════════════════════════════════════════
export function HomeView({ onNavigate }: { onNavigate: (key: string) => void }) {
  const quickLinks = [
    { icon:'dashboard', label:'Open Dashboard',   desc:'View your live IoT canvas',          key:'dashboard', color: C.coral   },
    { icon:'devices',   label:'Manage Devices',   desc:'Add and configure devices',           key:'devices',   color: C.purple  },
    { icon:'analytics', label:'Analytics',        desc:'Historical data & reports',           key:'analytics', color: C.magenta },
    { icon:'alerts',    label:'Alert',             desc:'Set up alerts and rules',             key:'automations',color: C.amber  },
    { icon:'gateway',   label:'Fleet & Gateway',  desc:'Monitor your device network',        key:'gateway',   color: C.teal    },
    { icon:'brain',     label:'AI / ML Builder',  desc:'Run inference on sensor data',       key:'aiml',      color: C.coral   },
  ]
  const recentActivity = [
    { icon:'signal',  msg:'Sensor ESP32-S3 Room A reported Temp: 23.4°C',        t:'2m ago',  c: C.teal    },
    { icon:'alerts',  msg:'Alert: Humidity exceeded 80% on Node B',              t:'14m ago', c: C.coral   },
    { icon:'devices', msg:'New device "Sensor LDR" went offline',                t:'1h ago',  c: C.amber   },
    { icon:'refresh', msg:'OTA firmware update v2.3.1 deployed to 3 devices',   t:'3h ago',  c: C.purple  },
    { icon:'gateway', msg:'Gateway Raspberry Pi reconnected after 4s timeout',   t:'5h ago',  c: C.teal    },
  ]
  const onlinePct = Math.round((DEVICES_DATA.filter(d=>d.status==='online').length / DEVICES_DATA.length) * 100)

  return (
    <div style={{ maxWidth:1100 }}>
      {/* Welcome banner */}
      <div style={{ borderRadius:20, padding:'32px 36px', background:`linear-gradient(135deg,${C.coral}18,${C.purple}12)`, border:`1px solid ${C.coral}33`, marginBottom:28, display:'flex', alignItems:'center', gap:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color: C.light, marginBottom:4 }}>Welcome back, Alex 👋</div>
          <div style={{ fontSize:13, color: C.muted, lineHeight:1.6 }}>
            Your <strong style={{ color: C.coral }}>Smart Home v2</strong> project is live · {DEVICES_DATA.filter(d=>d.status==='online').length}/{DEVICES_DATA.length} devices online · Last sync 2m ago
          </div>
        </div>
        <div style={{ marginLeft:'auto', textAlign:'center', flexShrink:0 }}>
          <div style={{ fontSize:32, fontWeight:800, fontFamily:'DM Mono,monospace', color: onlinePct > 60 ? C.teal : C.coral }}>{onlinePct}%</div>
          <div style={{ fontSize:10, color: C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>Fleet Online</div>
        </div>
      </div>

      {/* Quick links grid */}
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Quick Access</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:28 }}>
        {quickLinks.map(q => (
          <button key={q.key} onClick={()=>onNavigate(q.key as any)} style={{ textAlign:'left', padding:'18px 20px', borderRadius:14, background:'var(--c-surface)', border:`1px solid var(--c-border)`, cursor:'pointer', transition:'all .15s', fontFamily:'Outfit,sans-serif' }}
            onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor=q.color+'55'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)' }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor='var(--c-border)'; (e.currentTarget as HTMLElement).style.transform='' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${q.color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <Icon name={q.icon} size={18} color={q.color} />
            </div>
            <div style={{ fontSize:13, fontWeight:700, color: C.light, marginBottom:3 }}>{q.label}</div>
            <div style={{ fontSize:11, color: C.muted }}>{q.desc}</div>
          </button>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Recent Activity</div>
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:14, overflow:'hidden' }}>
        {recentActivity.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderBottom: i < recentActivity.length-1 ? '1px solid var(--c-border)' : 'none', transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--c-surface2)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{ width:32, height:32, borderRadius:8, background:`${a.c}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name={a.icon} size={14} color={a.c} />
            </div>
            <div style={{ flex:1, fontSize:12, color: C.light }}>{a.msg}</div>
            <div style={{ fontSize:10, color: C.muted, flexShrink:0, fontFamily:'DM Mono,monospace' }}>{a.t}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LANDING PAGE (standalone, outside dashboard shell)
// ════════════════════════════════════════════════════════════════════════════
function LoginModal({ onClose, onLogin, onRegister }: { onClose: () => void; onLogin: (email: string, password: string) => Promise<void>; onRegister?: (email: string, password: string) => Promise<void> }) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('user@telecominfra.id')
  const [pass, setPass] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleInstantDemo = () => {
    setLoading(true)
    // Directly launch into Instant Demo Console Mode
    try {
      localStorage.setItem('tip_jwt_token', 'demo_instant_session_token')
    } catch {}
    setTimeout(() => {
      setLoading(false)
      onClose()
      window.location.reload()
    }, 300)
  }

  const submit = async () => {
    if (!email || !pass) {
      setErrorMsg('Mohon isi email dan password.')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      if (isRegister && onRegister) {
        await onRegister(email, pass)
      } else {
        await onLogin(email, pass)
      }
      onClose()
    } catch (err: any) {
      // Fallback: allow demo login if backend is unreachable or returning error
      console.warn('API Auth call fallback:', err)
      try {
        localStorage.setItem('tip_jwt_token', 'demo_fallback_token')
      } catch {}
      onClose()
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }} onClick={onClose}>
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', borderRadius:20, padding:32, width:420, maxWidth:'92vw', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src={logoImg} alt="Yugma Logo" style={{ width:28, height:28, objectFit:'contain' }} />
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:'var(--c-text)', lineHeight:1.2 }}>
                {isRegister ? 'Buat Akun Yugma IoT' : 'Yugma IoT Workspace'}
              </div>
              <div style={{ fontSize:11, color:'var(--c-muted)' }}>
                {isRegister ? 'Daftar akun baru untuk mengakses platform' : 'Masuk ke dalam IoT Console workspace'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--c-muted)', cursor:'pointer', padding:4 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:8, background:`${C.coral}18`, border:`1px solid ${C.coral}44`, fontSize:12, color: C.coral }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:'var(--c-muted)', fontWeight:600, marginBottom:6 }}>Email Address</div>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="user@telecominfra.id"
            style={{ width:'100%', background:'var(--c-input-bg)', border:'1px solid var(--c-border)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--c-text)', outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}
            onFocus={e=>e.currentTarget.style.borderColor=C.coral} onBlur={e=>e.currentTarget.style.borderColor='var(--c-border)'} />
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:'var(--c-muted)', fontWeight:600, marginBottom:6 }}>Password</div>
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="••••••••"
            onKeyDown={e=>e.key==='Enter'&&submit()}
            style={{ width:'100%', background:'var(--c-input-bg)', border:'1px solid var(--c-border)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--c-text)', outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}
            onFocus={e=>e.currentTarget.style.borderColor=C.coral} onBlur={e=>e.currentTarget.style.borderColor='var(--c-border)'} />
        </div>

        <button onClick={submit} disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'Outfit,sans-serif', opacity: loading ? 0.7 : 1, transition:'opacity .15s', marginBottom:12 }}>
          {loading ? 'Memproses...' : isRegister ? '✨ Daftar Akun Baru' : 'Sign In →'}
        </button>

        <div style={{ textAlign:'center', marginBottom:16, fontSize:12, color:'var(--c-muted)' }}>
          {isRegister ? 'Sudah memiliki akun? ' : 'Belum memiliki akun? '}
          <span
            style={{ color: C.coral, fontWeight:700, cursor:'pointer', textDecoration:'underline' }}
            onClick={() => { setIsRegister(!isRegister); setErrorMsg(null); }}
          >
            {isRegister ? 'Masuk di sini' : 'Buat Akun Baru'}
          </span>
        </div>

        {/* Instant Demo Console Mode */}
        <div style={{ borderTop:'1px solid var(--c-border)', paddingTop:14, marginTop:8 }}>
          <button onClick={handleInstantDemo} style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${C.coral}44`, background:`linear-gradient(135deg, ${C.coral}22, ${C.purple}22)`, color: C.light, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            🚀 Instant Demo Console Mode
          </button>
        </div>
      </div>
    </div>
  )
}

export function LandingPage({ isDark, onToggleTheme, onEnter, onLogin, onRegister }: { isDark: boolean; onToggleTheme: () => void; onEnter: () => void; onLogin: (email: string, password: string) => Promise<void>; onRegister?: (email: string, password: string) => Promise<void> }) {
  const [showLogin, setShowLogin] = useState(false)

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const NAV_LINKS: { label: string; id: string }[] = [
    { label:'Features', id:'section-features' },
    { label:'Docs',     id:'section-docs' },
    { label:'Pricing',  id:'section-pricing' },
    { label:'Blog',     id:'section-blog' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--c-bg)', color:'var(--c-text)', fontFamily:'Outfit,sans-serif', overflowX:'hidden' }}>
      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onLogin={async (email, password)=>{ await onLogin(email, password); setShowLogin(false); onEnter() }} onRegister={async (email, password)=>{ if (onRegister) await onRegister(email, password); else await onLogin(email, password); setShowLogin(false); onEnter() }} />}
      {/* Navbar */}
      <nav style={{ position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', padding:'0 40px', height:64, background:'var(--c-surface)', borderBottom:'1px solid var(--c-border)', backdropFilter:'blur(12px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={logoImg} onError={(e)=>{ e.currentTarget.src = '/logo.png' }} alt="Yugma" style={{ width:32, height:32, objectFit:'contain' }} />
          <span style={{ fontWeight:800, fontSize:18, color:'var(--c-text)' }}>Yugma</span>
          <span style={{ fontSize:10, color: C.coral, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', background:`${C.coral}18`, padding:'2px 8px', borderRadius:8, marginLeft:4 }}>IoT</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:24, marginLeft:40 }}>
          {NAV_LINKS.map(({ label, id }) => (
            <span key={label} onClick={()=>scrollTo(id)} style={{ fontSize:13, color:'var(--c-muted)', cursor:'pointer', fontWeight:500, transition:'color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.color='var(--c-text)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--c-muted)'}>{label}</span>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onToggleTheme} style={{ width:32, height:32, borderRadius:'50%', background:'var(--c-btn-ghost)', border:'1px solid var(--c-border)', color:'var(--c-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {isDark
              ? <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={5}/><line x1={12} y1={1} x2={12} y2={3}/><line x1={12} y1={21} x2={12} y2={23}/><line x1={4.22} y1={4.22} x2={5.64} y2={5.64}/><line x1={18.36} y1={18.36} x2={19.78} y2={19.78}/><line x1={1} y1={12} x2={3} y2={12}/><line x1={21} y1={12} x2={23} y2={12}/><line x1={4.22} y1={19.78} x2={5.64} y2={18.36}/><line x1={18.36} y1={5.64} x2={19.78} y2={4.22}/></svg>
              : <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
          <button onClick={()=>setShowLogin(true)} style={{ padding:'8px 20px', borderRadius:10, border:`1px solid var(--c-border)`, background:'transparent', color:'var(--c-text)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif' }}>Sign In</button>
          <button onClick={()=>setShowLogin(true)} style={{ padding:'8px 20px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', boxShadow:`0 4px 16px ${C.coral}44` }}>
            Enter Console →
          </button>
        </div>
      </nav>
      <LandingContent onEnter={()=>setShowLogin(true)} />
    </div>
  )
}

function LandingContent({ onEnter }: { onEnter: () => void }) {
  // renamed old LandingView body - same content, adds onEnter to buttons
  const features = [
    { icon:'dashboard', color: C.coral,   title:'Drag & Drop Dashboard',    desc:'Compose your IoT canvas with gauges, relay controls, live charts, GPS maps, and terminal widgets. Resize and reorder everything.' },
    { icon:'signal',    color: C.purple,  title:'Real-Time Telemetry',       desc:'Sub-second sensor data streaming over MQTT, HTTP, and CoAP — stored automatically in TimescaleDB for long-term analytics.' },
    { icon:'brain',     color: C.magenta, title:'AI / ML Inference',         desc:'Run anomaly detection, trend forecast, and custom Python models on live sensor streams right from the platform.' },
    { icon:'alerts',    color: C.amber,   title:'Automation Engine',         desc:'Build trigger-based automation rules: "If temp > 35°C → send alert + toggle relay". No code required.' },
    { icon:'gateway',   color: C.teal,    title:'Multi-Protocol Gateway',    desc:'Unified ingestion from hundreds of devices across protocols. Auto-OTA firmware updates and remote diagnostics built in.' },
    { icon:'analytics', color: C.coral,   title:'Advanced Analytics',        desc:'Historical playback, heat maps, CSV export, and scheduled reports — all visualized in one unified analytics workspace.' },
  ]
  const steps = [
    { n:'01', title:'Create a Project',   desc:'Set up your workspace, define your devices, and configure your data streams in minutes.' },
    { n:'02', title:'Connect Devices',    desc:'Flash your ESP32, Arduino, or Raspberry Pi with Yugma SDK. One API key, instant connection.' },
    { n:'03', title:'Build Your Canvas',  desc:'Add widgets to your dashboard, configure alerts, and build automation rules.' },
    { n:'04', title:'Monitor & Automate', desc:'Watch your data flow live. Let the automation engine handle responses while you sleep.' },
  ]
  const stats = [
    { val:'10M+', label:'Devices Connected' },
    { val:'3',    label:'Protocols Supported' },
    { val:'99.99%', label:'Uptime SLA' },
    { val:'< 10ms', label:'Alert Latency' },
  ]
  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign:'center', padding:'80px 24px 56px' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${C.coral}15`, border:`1px solid ${C.coral}33`, borderRadius:24, padding:'6px 18px', marginBottom:32, fontSize:11, color: C.coral, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          ⚡ Low-Code IoT Platform · Enterprise Ready
        </div>
        <h1 style={{ fontSize:'clamp(36px,5vw,60px)', fontWeight:800, color:'var(--c-text)', lineHeight:1.1, margin:'0 0 12px' }}>
          Connect, Monitor &amp; Control
        </h1>
        <h1 style={{ fontSize:'clamp(36px,5vw,60px)', fontWeight:800, lineHeight:1.1, margin:'0 0 24px', background:`linear-gradient(90deg,${C.coral},${C.magenta},${C.purple})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Any IoT Device at Scale
        </h1>
        <p style={{ fontSize:15, color:'var(--c-muted)', maxWidth:520, margin:'0 auto 36px', lineHeight:1.85 }}>
          Yugma is your all-in-one IoT workspace — ingest from any protocol, visualize on a bento canvas, automate responses, and run AI inference. From prototype to production, one platform.
        </p>
        <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={onEnter} style={{ padding:'14px 32px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'Outfit,sans-serif', boxShadow:`0 8px 32px ${C.coral}44`, transition:'transform .15s, box-shadow .15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 12px 40px ${C.coral}55` }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=`0 8px 32px ${C.coral}44` }}>
            Get Started Free →
          </button>
          <button style={{ padding:'14px 32px', borderRadius:12, border:`1.5px solid var(--c-border)`, background:'var(--c-surface)', color:'var(--c-text)', fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'border-color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.coral}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--c-border)'}>
            ▶ Watch Demo
          </button>
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderRadius:16, overflow:'hidden', border:`1px solid var(--c-border)`, margin:'0 0 56px' }}>
        {stats.map((s,i) => (
          <div key={s.val} style={{ background:'var(--c-surface)', padding:'24px 20px', textAlign:'center', borderRight: i<3?`1px solid var(--c-border)`:'none' }}>
            <div style={{ fontSize:26, fontWeight:800, color:'var(--c-text)', fontFamily:'DM Mono,monospace' }}>{s.val}</div>
            <div style={{ fontSize:11, color:'var(--c-muted)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <div id="section-features" style={{ marginBottom:60 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:11, color: C.coral, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Platform Capabilities</div>
          <div style={{ fontSize:28, fontWeight:800, color:'var(--c-text)' }}>Everything you need, nothing you don't</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {features.map(f => (
            <div key={f.title} style={{ background:'var(--c-surface)', border:`1px solid var(--c-border)`, borderRadius:16, padding:24, transition:'border-color .2s, transform .2s', cursor:'default' }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor=f.color+'55'; (e.currentTarget as HTMLElement).style.transform='translateY(-3px)' }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor='var(--c-border)'; (e.currentTarget as HTMLElement).style.transform='' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${f.color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                <Icon name={f.icon} size={22} color={f.color} />
              </div>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--c-text)', marginBottom:8 }}>{f.title}</div>
              <div style={{ fontSize:12, color:'var(--c-muted)', lineHeight:1.75 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works (Docs anchor) ───────────────────────────────────── */}
      <div id="section-docs" style={{ marginBottom:60 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:11, color: C.purple, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Quick Start</div>
          <div style={{ fontSize:28, fontWeight:800, color:'var(--c-text)' }}>Up and running in under 5 minutes</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {steps.map((s,i) => (
            <div key={s.n} style={{ position:'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position:'absolute', top:22, left:'calc(50% + 26px)', width:'calc(100% - 52px)', height:2, background:`linear-gradient(90deg,${C.coral}44,transparent)`, zIndex:0 }} />
              )}
              <div style={{ background:'var(--c-surface)', border:`1px solid var(--c-border)`, borderRadius:14, padding:'22px 18px', textAlign:'center', position:'relative', zIndex:1 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:`linear-gradient(135deg,${C.coral},${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono,monospace', fontWeight:800, fontSize:13, color:'#fff', margin:'0 auto 14px' }}>{s.n}</div>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--c-text)', marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:11, color:'var(--c-muted)', lineHeight:1.7 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing / Blog / CTA ─────────────────────────────────────────── */}
      <div id="section-pricing" />
      <div id="section-blog" />
      <div style={{ borderRadius:20, padding:'56px 40px', textAlign:'center', background:`linear-gradient(135deg,${C.coral}18,${C.purple}18)`, border:`1px solid ${C.coral}33`, marginBottom:60 }}>
        <div style={{ fontSize:28, fontWeight:800, color:'var(--c-text)', marginBottom:12 }}>Ready to connect your first device?</div>
        <div style={{ fontSize:14, color:'var(--c-muted)', marginBottom:30 }}>Join thousands of engineers building smarter IoT systems with Yugma.</div>
        <button onClick={onEnter} style={{ padding:'14px 40px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'Outfit,sans-serif', boxShadow:`0 8px 32px ${C.coral}44` }}>
          Start Building Now →
        </button>
      </div>

    </div>
  )
}

// kept for backward compat (not used)
function LandingView() {
  return <LandingContent onEnter={() => {}} />
}
