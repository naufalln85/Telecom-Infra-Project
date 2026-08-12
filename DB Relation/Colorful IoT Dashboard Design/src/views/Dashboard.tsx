import React, { useState, useEffect, useRef } from 'react'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { C, Widget, WIDGET_CATALOG, DEFAULT_WIDGETS, ColorKey, THEME_COLORS } from '@/lib/theme'
import { Icon, Card, Btn, Toggle, GaugeSVG, ChartTooltip } from '@/components/Shared'
import WidgetConfigModal from '@/components/WidgetConfigModal'

// ── Simulated data ─────────────────────────────────────────────────────────────
const tele = Array.from({length:24},(_,i)=>({ t:`${i}:00`, temp:19+Math.sin(i/3)*6, humid:55+Math.cos(i/4)*15, cpu:30+Math.random()*40 }))
const pwr  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>({ d, kWh: 3+Math.random()*6 }))

function useAnimatedValue(target: number, speed = 0.04) {
  const [v, setV] = useState(target * 0.3)
  const ref = useRef(v)
  useEffect(() => {
    ref.current = v
    const id = setInterval(() => {
      const diff = target - ref.current
      if (Math.abs(diff) < 0.05) { setV(target); clearInterval(id) }
      else { ref.current += diff * speed; setV(ref.current) }
    }, 16)
    return () => clearInterval(id)
  }, [target])
  return v
}

// ── Widget renderers ───────────────────────────────────────────────────────────

function StatWidget({ w, color }: { w: Widget; color: string }) {
  const vals: Record<string, [string, string, number]> = {
    'stat-devices':  ['12', 'Active', 0.75],
    'stat-messages': ['28k', '/100k', 0.28],
    'stat-temp':     ['23.4', 'Avg °C', 0.47],
    'stat-power':    ['4.8', 'kWh', 0.60],
    'stat-voltage':  ['224', 'V AC', 0.89],
  }
  const [val, label, pct] = vals[w.type] ?? ['--', '', 0]
  const segs = 10
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
      <div style={{ fontSize:11, color: C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
        <span style={{ fontSize:34, fontWeight:800, fontFamily:'DM Mono,monospace', color }}>{val}</span>
        <span style={{ fontSize:12, color: C.muted, paddingBottom:6 }}>{label}</span>
      </div>
      <div style={{ display:'flex', gap:3, marginTop:6 }}>
        {Array.from({length:segs},(_,i)=>(
          <div key={i} style={{ flex:1, height:4, borderRadius:2,
            background: i/segs < pct ? color : 'var(--c-surface3)',
            border: i/segs < pct ? 'none' : '1px dashed var(--c-border)' }} />
        ))}
      </div>
    </div>
  )
}

function GaugeWidget({ w, color }: { w: Widget; color: string }) {
  const rawVals: Record<string, number> = {
    'gauge-temp':     23.4,
    'gauge-humidity': 62,
    'gauge-co2':      412,
    'gauge-pressure': 1013,
  }
  const units: Record<string, string> = {
    'gauge-temp':'°C','gauge-humidity':'%','gauge-co2':'ppm','gauge-pressure':'hPa'
  }
  const raw = rawVals[w.type] ?? 50
  const min = w.config.min ?? 0
  const max = w.config.max ?? 100
  const unit = w.config.unit || units[w.type] || ''
  const val = useAnimatedValue(raw)
  const pct = (val - min) / (max - min)
  const qualLabel = w.type === 'gauge-co2'
    ? (raw < 800 ? 'Good' : raw < 1200 ? 'Moderate' : 'Unhealthy')
    : w.type === 'gauge-pressure'
    ? (raw < 990 ? 'Low' : raw < 1030 ? 'Normal' : 'High')
    : null
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', alignSelf:'flex-start' }}>{w.title}</div>
      <GaugeSVG value={Math.round(val)} max={max} label={w.title} color={color} unit={unit} />
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:28, fontWeight:800, fontFamily:'DM Mono,monospace', color }}>
          {val.toFixed(val > 100 ? 0 : 1)}<span style={{ fontSize:14, color: C.muted }}>{unit}</span>
        </div>
        {qualLabel && <div style={{ fontSize:10, color: C.muted, marginTop:2, fontWeight:600 }}>{qualLabel}</div>}
        <div style={{ fontSize:10, color: C.muted, marginTop:2 }}>{min} – {max} {unit}</div>
      </div>
    </div>
  )
}

function SensorWidget({ w, color }: { w: Widget; color: string }) {
  const [motion, setMotion] = useState(false)
  useEffect(() => {
    if (w.type !== 'sensor-motion') return
    const id = setInterval(() => setMotion(Math.random() > 0.7), 3000)
    return () => clearInterval(id)
  }, [w.type])

  if (w.type === 'sensor-motion') {
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
          <div style={{ width:72, height:72, borderRadius:'50%',
            background: motion ? `${color}22` : 'var(--c-surface2)',
            border:`3px solid ${motion ? color : 'var(--c-border)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .3s', boxShadow: motion ? `0 0 24px ${color}55` : 'none' }}>
            <Icon name="eye" size={28} color={motion ? color : C.muted} />
          </div>
          <div style={{ fontSize:13, fontWeight:700, color: motion ? color : C.muted }}>{motion ? 'MOTION DETECTED' : 'No motion'}</div>
          <div style={{ fontSize:10, color: C.muted }}>PIR Sensor · Zone A</div>
        </div>
      </div>
    )
  }

  if (w.type === 'sensor-ldr') {
    const lux = 3240
    const pct = lux / 10000
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
            <span style={{ fontSize:36, fontWeight:800, fontFamily:'DM Mono,monospace', color }}>{lux.toLocaleString()}</span>
            <span style={{ fontSize:12, color: C.muted, paddingBottom:6 }}>lux</span>
          </div>
          <div style={{ background:'var(--c-surface2)', borderRadius:6, overflow:'hidden', height:10 }}>
            <div style={{ width:`${pct*100}%`, height:'100%', background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:6, transition:'width .5s' }} />
          </div>
          <div style={{ fontSize:10, color: C.muted }}>{pct > 0.7 ? 'Bright sunlight' : pct > 0.3 ? 'Indoor light' : 'Dim / overcast'}</div>
        </div>
      </div>
    )
  }

  if (w.type === 'sensor-soil') {
    const moisture = 47
    const pct = moisture / 100
    const status = moisture < 30 ? 'Needs Watering' : moisture < 70 ? 'Optimal' : 'Overwatered'
    const statusColor = moisture < 30 ? C.coral : moisture < 70 ? C.teal : C.amber
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ position:'relative', width:64, height:64 }}>
              <svg width={64} height={64} viewBox="0 0 64 64">
                <circle cx={32} cy={32} r={28} fill="none" stroke="var(--c-surface2)" strokeWidth={6} />
                <circle cx={32} cy={32} r={28} fill="none" stroke={color} strokeWidth={6}
                  strokeDasharray={`${pct * 175.9} 175.9`} strokeLinecap="round"
                  transform="rotate(-90 32 32)" style={{ transition:'stroke-dasharray .5s' }} />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, fontFamily:'DM Mono,monospace', color }}>{moisture}%</div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color: statusColor }}>{status}</div>
              <div style={{ fontSize:10, color: C.muted, marginTop:2 }}>Zone B · Bed 3</div>
              <div style={{ fontSize:10, color: C.muted }}>Depth: 10cm</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (w.type === 'sensor-wind') {
    const speed = 18.4
    const dir = 'NNE'
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ position:'relative', width:70, height:70 }}>
            <svg width={70} height={70} viewBox="0 0 70 70">
              <circle cx={35} cy={35} r={32} fill="none" stroke="var(--c-surface2)" strokeWidth={1.5} />
              {['N','E','S','W'].map((d,i) => (
                <text key={d} x={35 + 24*Math.sin(i*Math.PI/2)} y={35 - 24*Math.cos(i*Math.PI/2) + 4} textAnchor="middle" style={{ fontSize:8, fill:'var(--c-muted)', fontFamily:'Outfit,sans-serif' }}>{d}</text>
              ))}
              <line x1={35} y1={35} x2={35 + 20*Math.sin(22.5*Math.PI/180)} y2={35 - 20*Math.cos(22.5*Math.PI/180)} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:4 }}>
              <span style={{ fontSize:32, fontWeight:800, fontFamily:'DM Mono,monospace', color }}>{speed}</span>
              <span style={{ fontSize:11, color: C.muted, paddingBottom:5 }}>km/h</span>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color: C.muted }}>{dir} · Beaufort 3</div>
            <div style={{ fontSize:10, color: C.muted }}>Gentle breeze</div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function TelemetryChart({ w, color }: { w: Widget; color: string }) {
  const [tab, setTab] = useState<'temp'|'humid'|'cpu'>('temp')
  const tabs = {
    temp:  { label:'Temperature', key:'temp',  c: C.coral  },
    humid: { label:'Humidity',    key:'humid', c: C.teal   },
    cpu:   { label:'CPU',         key:'cpu',   c: C.purple },
  }
  const tc = tabs[tab]
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</span>
        <div style={{ display:'flex', gap:4 }}>
          {(['temp','humid','cpu'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:6, border:'none', cursor:'pointer',
              background: tab===t ? `${tabs[t].c}22` : 'transparent',
              color: tab===t ? tabs[t].c : C.muted, textTransform:'uppercase', fontFamily:'Outfit,sans-serif' }}>
              {tabs[t].label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={tele} margin={{top:4,right:4,bottom:0,left:-20}}>
          <defs>
            <linearGradient id={`ag-${tab}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={tc.c} stopOpacity={0.3} />
              <stop offset="95%" stopColor={tc.c} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tick={{fontSize:8,fill:C.muted}} interval={5} />
          <YAxis tick={{fontSize:8,fill:C.muted}} />
          <Tooltip content={<ChartTooltip unit="" />} />
          <Area type="monotone" dataKey={tc.key} stroke={tc.c} strokeWidth={2} fill={`url(#ag-${tab})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RealtimeChart({ w, color }: { w: Widget; color: string }) {
  const [data, setData] = useState(() => Array.from({length:30},(_,i)=>({ t:i, v:50+Math.sin(i/5)*20 })))
  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const next = [...prev.slice(1)]
        const last = next[next.length-1]
        next.push({ t: last.t+1, v: Math.max(5,Math.min(95, last.v + (Math.random()-0.5)*15)) })
        return next
      })
    }, 500)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</span>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background: color }} />
          <span style={{ fontSize:9, color, fontWeight:700 }}>LIVE</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{top:4,right:4,bottom:0,left:-20}}>
          <XAxis dataKey="t" hide />
          <YAxis tick={{fontSize:8,fill:C.muted}} domain={[0,100]} />
          <Tooltip content={<ChartTooltip unit="%" />} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function PowerChart({ w, color }: { w: Widget; color: string }) {
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={pwr} margin={{top:4,right:4,bottom:0,left:-20}}>
          <XAxis dataKey="d" tick={{fontSize:8,fill:C.muted}} />
          <YAxis tick={{fontSize:8,fill:C.muted}} />
          <Tooltip content={<ChartTooltip unit="kWh" />} />
          <Bar dataKey="kWh" fill={color} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SwitchPanel({ w, color }: { w: Widget; color: string }) {
  const [states, setStates] = useState([true, false, true, false])
  const labels = ['Main Light', 'Garden', 'AC Unit', 'Security']
  const toggle = (i: number) => setStates(prev => prev.map((v,j) => j===i ? !v : v))
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1, justifyContent:'center' }}>
        {states.map((on, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:8,
            background: on ? `${color}12` : 'var(--c-surface2)',
            border:`1px solid ${on ? color+'33' : 'var(--c-border)'}`, transition:'all .2s', cursor:'pointer' }}
            onClick={()=>toggle(i)}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background: on ? color : C.muted, boxShadow: on ? `0 0 8px ${color}` : 'none', transition:'all .2s' }} />
              <span style={{ fontSize:12, fontWeight:600, color: on ? C.light : C.muted }}>{labels[i]}</span>
            </div>
            <Toggle on={on} onChange={()=>toggle(i)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function RelaySingle({ w, color }: { w: Widget; color: string }) {
  const [on, setOn] = useState(false)
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', alignSelf:'flex-start' }}>{w.title}</div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <button onClick={()=>setOn(p=>!p)} style={{
          width:80, height:80, borderRadius:'50%',
          border:`4px solid ${on ? color : 'var(--c-surface3)'}`,
          background: on ? `${color}22` : 'var(--c-surface2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', transition:'all .25s',
          boxShadow: on ? `0 0 32px ${color}55, 0 0 8px ${color}33` : 'none',
        }}>
          <Icon name="power" size={32} color={on ? color : C.muted} />
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:13, fontWeight:800, color: on ? color : C.muted }}>{on ? 'ON' : 'OFF'}</div>
          <div style={{ fontSize:10, color: C.muted }}>{w.config.device || 'Main Relay'}</div>
        </div>
      </div>
    </div>
  )
}

function Dimmer({ w, color }: { w: Widget; color: string }) {
  const [val, setVal] = useState(65)
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, color: C.muted }}>Brightness / PWM</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:800, color }}>{val}%</span>
        </div>
        <input type="range" min={0} max={100} value={val} onChange={e=>setVal(+e.target.value)}
          style={{ width:'100%', accentColor: color, cursor:'pointer', height:6 }} />
        <div style={{ display:'flex', gap:6 }}>
          {[0,25,50,75,100].map(v => (
            <button key={v} onClick={()=>setVal(v)} style={{ flex:1, padding:'5px 2px', borderRadius:6,
              border:`1px solid ${val===v ? color+'44' : 'var(--c-border)'}`,
              background: val===v ? `${color}18` : 'var(--c-surface2)',
              color: val===v ? color : C.muted, fontSize:9, fontWeight:700, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>{v}%</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function VoltageMeter({ w, color }: { w: Widget; color: string }) {
  const metrics = [
    { label:'Voltage', value:'224.3', unit:'V',  c: color    },
    { label:'Current', value:'3.84',  unit:'A',  c: C.teal   },
    { label:'Power',   value:'861',   unit:'W',  c: C.amber  },
    { label:'PF',      value:'0.97',  unit:'',   c: C.purple },
  ]
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, flex:1, alignItems:'center' }}>
        {metrics.map(m => (
          <div key={m.label} style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'var(--c-surface2)', border:'1px solid var(--c-border)' }}>
            <div style={{ fontSize:9, color: C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{m.label}</div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:800, color: m.c }}>{m.value}</div>
            <div style={{ fontSize:9, color: C.muted, marginTop:2 }}>{m.unit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WaterFlow({ w, color }: { w: Widget; color: string }) {
  const flow = 12.4, total = 487.2, pct = flow / 50
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:10 }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
          <span style={{ fontSize:34, fontWeight:800, fontFamily:'DM Mono,monospace', color }}>{flow}</span>
          <span style={{ fontSize:12, color: C.muted, paddingBottom:6 }}>L/min</span>
        </div>
        <div style={{ background:'var(--c-surface2)', borderRadius:8, overflow:'hidden', height:8 }}>
          <div style={{ width:`${pct*100}%`, height:'100%', background:`linear-gradient(90deg,${color},${C.teal})`, borderRadius:8 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:10, color: C.muted }}>Daily total: <strong style={{ color: C.light }}>{total} L</strong></span>
          <span style={{ fontSize:10, color: C.muted }}>Max: 50 L/min</span>
        </div>
      </div>
    </div>
  )
}

function DeviceListWidget({ w, color }: { w: Widget; color: string }) {
  const devices = [
    { name:'Thermostat Pro',   status:'online',  val:'23°C' },
    { name:'Smart Switch A1',  status:'online',  val:'ON'   },
    { name:'Solar Controller', status:'idle',    val:'82%'  },
    { name:'HVAC Unit',        status:'offline', val:'--'   },
    { name:'Door Sensor',      status:'online',  val:'Closed'},
  ]
  const sc: Record<string,string> = { online: C.teal, idle: C.amber, offline: C.coral }
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, overflowY:'auto' }}>
        {devices.map(d => (
          <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:'var(--c-surface2)', border:'1px solid var(--c-border)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: sc[d.status], flexShrink:0, boxShadow: `0 0 6px ${sc[d.status]}` }} />
            <span style={{ flex:1, fontSize:12, fontWeight:600, color: C.light }}>{d.name}</span>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color }}>{d.val}</span>
            <span style={{ fontSize:9, color: sc[d.status], fontWeight:700, textTransform:'uppercase' }}>{d.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertFeedWidget({ w, color }: { w: Widget; color: string }) {
  const alerts = [
    { msg:'Temp exceeded 35°C on Sensor #3', t:'2m ago',  sev:'high'   },
    { msg:'Gateway reconnected after timeout', t:'14m ago', sev:'info'  },
    { msg:'Relay #2 stuck in ON state',       t:'1h ago',  sev:'medium' },
    { msg:'OTA update available: v2.3.1',     t:'3h ago',  sev:'info'   },
  ]
  const sc: Record<string,string> = { high: C.coral, medium: C.amber, info: C.teal }
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, overflowY:'auto' }}>
        {alerts.map((a,i) => (
          <div key={i} style={{ display:'flex', gap:8, padding:'7px 10px', borderRadius:8, background:'var(--c-surface2)', border:`1px solid ${sc[a.sev]}22`, borderLeft:`3px solid ${sc[a.sev]}` }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:600, color: C.light }}>{a.msg}</div>
              <div style={{ fontSize:9, color: C.muted, marginTop:2 }}>{a.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MapWidget({ w, color }: { w: Widget; color: string }) {
  const dots = [
    { x:35, y:45, label:'Sensor A', active:true  },
    { x:65, y:30, label:'Gateway',  active:true  },
    { x:20, y:65, label:'Relay B',  active:false },
    { x:80, y:70, label:'Camera',   active:true  },
  ]
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</div>
      <div style={{ flex:1, position:'relative', borderRadius:10, overflow:'hidden', background:'var(--c-surface2)', border:'1px solid var(--c-border)' }}>
        <svg width="100%" height="100%" style={{ position:'absolute', inset:0 }}>
          <defs>
            <pattern id="mapgrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--c-border)" strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapgrid)" />
          {dots.map((d,i) => (
            <g key={i}>
              <circle cx={`${d.x}%`} cy={`${d.y}%`} r={6} fill={d.active ? color : C.muted} opacity={0.9} />
              <circle cx={`${d.x}%`} cy={`${d.y}%`} r={12} fill={d.active ? color : C.muted} opacity={0.2} />
              <text x={`${d.x}%`} y={`${d.y+8}%`} textAnchor="middle" style={{ fontSize:8, fill:'var(--c-muted)', fontFamily:'Outfit,sans-serif' }}>{d.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function TerminalWidget({ w, color }: { w: Widget; color: string }) {
  const lines = [
    `[10:32:01] Connected to ${w.config.device || 'Device-01'}`,
    '[10:32:02] Firmware v2.3.0 · Flash: 4MB',
    '[10:32:05] Sensor init OK · Temp: 23.4°C',
    '[10:32:10] Humidity: 62% · CO2: 412ppm',
    '[10:32:15] Relay state: [ON, OFF, ON, OFF]',
    '[10:32:20] Heartbeat OK · RSSI: -67dBm',
  ]
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:10, color: C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{w.title}</span>
        <div style={{ display:'flex', gap:4 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: C.coral }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background: C.amber }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background: C.teal }} />
        </div>
      </div>
      <div style={{ flex:1, background:'var(--c-code-bg)', borderRadius:8, padding:'10px 12px', overflowY:'auto', fontFamily:'DM Mono,monospace', fontSize:10, lineHeight:1.7 }}>
        {lines.map((l,i) => (
          <div key={i} style={{ color: l.includes('OK') ? C.teal : l.includes('ERROR') ? C.coral : 'var(--c-code-txt)' }}>{l}</div>
        ))}
        <span style={{ color }}>{'>'}  </span>
      </div>
    </div>
  )
}

// ── Widget content dispatcher ──────────────────────────────────────────────────
function WidgetContent({ w }: { w: Widget }) {
  const color = THEME_COLORS[w.config.colorTheme] || C.coral
  if (w.type.startsWith('stat-'))    return <StatWidget w={w} color={color} />
  if (w.type.startsWith('gauge-'))   return <GaugeWidget w={w} color={color} />
  if (w.type.startsWith('sensor-'))  return <SensorWidget w={w} color={color} />
  if (w.type === 'chart-telemetry')  return <TelemetryChart w={w} color={color} />
  if (w.type === 'chart-realtime')   return <RealtimeChart w={w} color={color} />
  if (w.type === 'chart-power')      return <PowerChart w={w} color={color} />
  if (w.type === 'switch-panel')     return <SwitchPanel w={w} color={color} />
  if (w.type === 'relay-single')     return <RelaySingle w={w} color={color} />
  if (w.type === 'dimmer')           return <Dimmer w={w} color={color} />
  if (w.type === 'voltage-meter')    return <VoltageMeter w={w} color={color} />
  if (w.type === 'water-flow')       return <WaterFlow w={w} color={color} />
  if (w.type === 'device-list')      return <DeviceListWidget w={w} color={color} />
  if (w.type === 'alert-feed')       return <AlertFeedWidget w={w} color={color} />
  if (w.type === 'map')              return <MapWidget w={w} color={color} />
  if (w.type === 'terminal')         return <TerminalWidget w={w} color={color} />
  return <div style={{ color: C.muted, fontSize:11 }}>Widget: {w.type}</div>
}

// ── Sortable wrapper ───────────────────────────────────────────────────────────
function SortableWidget({
  w, editMode, onConfigure, onRemove, onResize,
}: {
  w: Widget
  editMode: boolean
  onConfigure: (w: Widget) => void
  onRemove: (id: string) => void
  onResize: (id: string, field: 'colSpan'|'rowSpan', val: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: w.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    gridColumn: `span ${w.colSpan}`,
    gridRow: `span ${w.rowSpan}`,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card style={{
        height:'100%', minHeight: w.rowSpan === 2 ? 360 : 180,
        padding:16, position:'relative',
        outline: editMode ? `1.5px dashed ${C.coral}55` : 'none',
      }}>
        {editMode && (
          <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:3, zIndex:10, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:160 }}>
            {([1,2,4] as const).map(cs => (
              <button key={cs} onClick={()=>onResize(w.id,'colSpan',cs)} style={{
                fontSize:8, fontWeight:800, padding:'2px 5px', borderRadius:4,
                border:`1px solid ${w.colSpan===cs ? C.coral : 'var(--c-border)'}`,
                background: w.colSpan===cs ? `${C.coral}22` : 'var(--c-surface3)',
                color: w.colSpan===cs ? C.coral : C.muted, cursor:'pointer', fontFamily:'Outfit,sans-serif',
              }}>{cs}W</button>
            ))}
            {([1,2] as const).map(rs => (
              <button key={rs} onClick={()=>onResize(w.id,'rowSpan',rs)} style={{
                fontSize:8, fontWeight:800, padding:'2px 5px', borderRadius:4,
                border:`1px solid ${w.rowSpan===rs ? C.purple : 'var(--c-border)'}`,
                background: w.rowSpan===rs ? `${C.purple}22` : 'var(--c-surface3)',
                color: w.rowSpan===rs ? C.purple : C.muted, cursor:'pointer', fontFamily:'Outfit,sans-serif',
              }}>{rs}H</button>
            ))}
            <button {...attributes} {...listeners} style={{ background:'var(--c-surface3)', border:'1px solid var(--c-border)', color: C.muted, width:20, height:20, borderRadius:4, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center', padding:0, touchAction:'none' }}>
              <Icon name="drag" size={11} />
            </button>
            <button onClick={()=>onConfigure(w)} style={{ background:`${C.teal}18`, border:`1px solid ${C.teal}33`, color: C.teal, width:20, height:20, borderRadius:4, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <Icon name="settings" size={11} />
            </button>
            <button onClick={()=>onRemove(w.id)} style={{ background:`${C.coral}18`, border:`1px solid ${C.coral}33`, color: C.coral, width:20, height:20, borderRadius:4, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <Icon name="close" size={11} />
            </button>
          </div>
        )}
        <WidgetContent w={w} />
      </Card>
    </div>
  )
}

// ── Widget Picker panel ────────────────────────────────────────────────────────
const CATEGORIES = ['stats','gauges','sensors','charts','controls','utilities'] as const

function WidgetPicker({ widgets, onToggle, onClose }: {
  widgets: Widget[]
  onToggle: (id: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')

  const filtered = WIDGET_CATALOG.filter(e => {
    const s = search.toLowerCase()
    return (cat === 'all' || e.category === cat) &&
      (e.label.toLowerCase().includes(s) || e.desc.toLowerCase().includes(s))
  })

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={onClose}>
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:340, background:'var(--c-surface)', borderLeft:'1px solid var(--c-border)', boxShadow:'-16px 0 48px var(--c-shadow)', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 20px 14px', borderBottom:'1px solid var(--c-border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontWeight:800, fontSize:16, color: C.light }}>Widget Library</span>
            <button onClick={onClose} style={{ background:'none', border:'none', color: C.muted, cursor:'pointer' }}><Icon name="close" size={16} /></button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search widgets..."
            style={{ width:'100%', padding:'8px 12px', background:'var(--c-input-bg)', border:'1px solid var(--c-border)', borderRadius:8, color: C.light, fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'Outfit,sans-serif' }} />
          <div style={{ display:'flex', gap:4, marginTop:10, flexWrap:'wrap' }}>
            {['all',...CATEGORIES].map(c => (
              <button key={c} onClick={()=>setCat(c)} style={{
                fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:6, border:'none', cursor:'pointer',
                background: cat===c ? `${C.coral}22` : 'var(--c-surface2)',
                color: cat===c ? C.coral : C.muted, textTransform:'capitalize', fontFamily:'Outfit,sans-serif',
              }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(entry => {
            const wid = widgets.find(x => x.type === entry.type)
            const active = wid?.visible ?? false
            return (
              <div key={entry.type} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
                background: active ? `${C.coral}0D` : 'var(--c-surface2)',
                border:`1px solid ${active ? C.coral+'33' : 'var(--c-border)'}`,
                cursor:'pointer', transition:'all .15s' }}
                onClick={()=>wid && onToggle(wid.id)}>
                <div style={{ width:32, height:32, borderRadius:8, background: active ? `${C.coral}20` : 'var(--c-surface3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={entry.icon} size={15} color={active ? C.coral : C.muted} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color: active ? C.light : C.muted }}>{entry.label}</div>
                  <div style={{ fontSize:10, color: C.muted }}>{entry.desc}</div>
                </div>
                <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${active ? C.coral : 'var(--c-border)'}`, background: active ? C.coral : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {active && <Icon name="check" size={10} color="#fff" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main dashboard view ────────────────────────────────────────────────────────
export default function DashboardView() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS)
  const [editMode, setEditMode] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [configWidget, setConfigWidget] = useState<Widget | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const visible = widgets.filter(w => w.visible)

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    setActiveId(null)
    if (active.id !== over?.id) {
      setWidgets(prev => {
        const vis = prev.filter(w => w.visible).map(w => w.id)
        const newVis = arrayMove(vis, vis.indexOf(active.id), vis.indexOf(over.id))
        const hidden = prev.filter(w => !w.visible)
        return [...newVis.map(id => prev.find(w => w.id === id)!), ...hidden]
      })
    }
  }

  const toggleWidget = (id: string) =>
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w))

  const removeWidget = (id: string) =>
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: false } : w))

  const handleResize = (id: string, field: 'colSpan'|'rowSpan', val: number) =>
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, [field]: val } : w))

  const handleSaveConfig = (updated: Widget) => {
    setWidgets(prev => prev.map(w => w.id === updated.id ? updated : w))
    setConfigWidget(null)
  }

  const activeWidget = visible.find(w => w.id === activeId)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <Btn variant={editMode ? 'primary' : 'ghost'} icon={editMode ? 'check' : 'edit'} onClick={()=>setEditMode(p=>!p)}>
          {editMode ? 'Done Editing' : 'Edit Layout'}
        </Btn>
        <Btn variant="ghost" icon="plus" onClick={()=>setShowPicker(true)}>Add Widget</Btn>
        {editMode && <span style={{ fontSize:11, color: C.muted, fontStyle:'italic' }}>Drag to reorder · Resize with W/H buttons · Click X to hide</span>}
        <div style={{ marginLeft:'auto', fontSize:11, color: C.muted }}>{visible.length} widgets active</div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={e=>setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}>
        <SortableContext items={visible.map(w=>w.id)} strategy={rectSortingStrategy}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gridAutoRows:'minmax(180px, auto)', gap:14 }}>
            {visible.map(w => (
              <SortableWidget key={w.id} w={w} editMode={editMode}
                onConfigure={setConfigWidget}
                onRemove={removeWidget}
                onResize={handleResize} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeWidget && (
            <div style={{ opacity:0.85, transform:'rotate(2deg)', gridColumn:`span ${activeWidget.colSpan}` }}>
              <Card style={{ padding:16, minHeight:180 }}>
                <WidgetContent w={activeWidget} />
              </Card>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showPicker && <WidgetPicker widgets={widgets} onToggle={toggleWidget} onClose={()=>setShowPicker(false)} />}
      {configWidget && <WidgetConfigModal widget={configWidget} onSave={handleSaveConfig} onClose={()=>setConfigWidget(null)} />}
    </div>
  )
}
