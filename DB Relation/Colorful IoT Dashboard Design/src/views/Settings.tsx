import React, { useState } from 'react'
import { C, THEME_COLORS } from '@/lib/theme'
import { Icon, Card, Btn, Toggle, Input, Select, SectionLabel, Pill } from '@/components/Shared'
import { useAppearance, ACCENT_PRESETS } from '@/lib/appearance'

type Tab = 'profile' | 'project' | 'notifications' | 'security' | 'apikeys' | 'appearance' | 'danger'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key:'profile',       label:'Profile',       icon:'user'       },
  { key:'project',       label:'Project',       icon:'layers'     },
  { key:'notifications', label:'Notifications', icon:'bell'       },
  { key:'security',      label:'Security',      icon:'lock'       },
  { key:'apikeys',       label:'API Keys',      icon:'key'        },
  { key:'appearance',    label:'Appearance',    icon:'palette'    },
  { key:'danger',        label:'Danger Zone',   icon:'danger'     },
]

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', borderBottom:`1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color: C.light }}>{label}</div>
        {desc && <div style={{ fontSize:11, color: C.muted, marginTop:2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink:0, marginLeft:24 }}>{children}</div>
    </div>
  )
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ fontSize:13, fontWeight:700, color: C.coral, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:4, paddingBottom:8, borderBottom:`1px solid ${C.coral}33` }}>{title}</div>
      {children}
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const [name, setName] = useState('Admin User')
  const [email, setEmail] = useState('admin@telecominfra.id')
  const [phone, setPhone] = useState('+62 812-3456-7890')
  const [bio, setBio] = useState('IoT Platform Administrator · Telecom Infrastructure')
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div>
      {/* Avatar */}
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28, padding:20, borderRadius:14, background:`linear-gradient(135deg,${C.coral}12,${C.purple}12)`, border:`1px solid ${C.border}` }}>
        <div style={{ position:'relative' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:`linear-gradient(135deg,${C.coral},${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'#fff' }}>A</div>
          <button style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background: C.surface2, border:`2px solid ${C.bg}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Icon name="camera" size={10} color={C.muted} />
          </button>
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:16, color: C.light }}>{name}</div>
          <div style={{ fontSize:12, color: C.muted }}>{email}</div>
          <Pill text="ADMIN" color={C.coral} />
        </div>
        <div style={{ marginLeft:'auto' }}>
          <Btn variant="secondary" size="sm" icon="camera">Change Photo</Btn>
        </div>
      </div>

      <SettingSection title="Personal Information">
        <SettingRow label="Display Name" desc="Your name visible to team members">
          <div style={{ width:240 }}><Input value={name} onChange={setName} /></div>
        </SettingRow>
        <SettingRow label="Email Address" desc="Used for login and notifications">
          <div style={{ width:240 }}><Input value={email} onChange={setEmail} type="email" /></div>
        </SettingRow>
        <SettingRow label="Phone Number" desc="For SMS alerts and 2FA">
          <div style={{ width:240 }}><Input value={phone} onChange={setPhone} /></div>
        </SettingRow>
        <SettingRow label="Bio" desc="Short description of your role">
          <div style={{ width:240 }}><Input value={bio} onChange={setBio} /></div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Account Details">
        <SettingRow label="Account ID" desc="Your unique platform identifier">
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, color: C.muted }}>#3</span>
        </SettingRow>
        <SettingRow label="Member Since" desc="Platform join date">
          <span style={{ fontSize:12, color: C.muted }}>August 2026</span>
        </SettingRow>
        <SettingRow label="Subscription Tier" desc="Current plan">
          <Pill text="PAID TIER" color={C.purple} />
        </SettingRow>
      </SettingSection>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        {saved && <span style={{ fontSize:12, color: C.teal, display:'flex', alignItems:'center', gap:5 }}><Icon name="check" size={13} color={C.teal} />Saved!</span>}
        <Btn variant="secondary">Cancel</Btn>
        <Btn variant="primary" icon="save" onClick={save}>Save Changes</Btn>
      </div>
    </div>
  )
}

// ── Project Tab ───────────────────────────────────────────────────────────────
function ProjectTab() {
  const [name, setName] = useState('Smart Home v2')
  const [desc, setDesc] = useState('Automated smart home monitoring with multi-protocol IoT sensors')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [retention, setRetention] = useState('30d')

  return (
    <div>
      <SettingSection title="Project Information">
        <SettingRow label="Project Name" desc="Name visible across the platform">
          <div style={{ width:240 }}><Input value={name} onChange={setName} /></div>
        </SettingRow>
        <SettingRow label="Description" desc="Short description of this project">
          <div style={{ width:280 }}><Input value={desc} onChange={setDesc} /></div>
        </SettingRow>
        <SettingRow label="Timezone" desc="Used for timestamps and scheduling">
          <div style={{ width:200 }}>
            <Select value={timezone} onChange={setTimezone} options={[
              { label:'Asia/Jakarta (WIB)', value:'Asia/Jakarta' },
              { label:'Asia/Makassar (WITA)', value:'Asia/Makassar' },
              { label:'Asia/Jayapura (WIT)', value:'Asia/Jayapura' },
              { label:'UTC', value:'UTC' },
            ]} />
          </div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Data Management">
        <SettingRow label="Telemetry Retention" desc="How long raw sensor data is kept">
          <div style={{ width:200 }}>
            <Select value={retention} onChange={setRetention} options={[
              { label:'7 days', value:'7d' },
              { label:'30 days', value:'30d' },
              { label:'90 days', value:'90d' },
              { label:'1 year', value:'1y' },
              { label:'Forever', value:'forever' },
            ]} />
          </div>
        </SettingRow>
        <SettingRow label="Auto-archive Offline Devices" desc="Archive devices not seen for 30 days">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Compress Historical Data" desc="Downsample data older than 7 days">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Integrations">
        <SettingRow label="TimescaleDB" desc="Time-series storage backend">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: C.teal, boxShadow:`0 0 5px ${C.teal}` }} />
            <span style={{ fontSize:12, color: C.teal, fontWeight:600 }}>Connected</span>
          </div>
        </SettingRow>
        <SettingRow label="Redis Streams" desc="Message bus for real-time telemetry">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: C.teal, boxShadow:`0 0 5px ${C.teal}` }} />
            <span style={{ fontSize:12, color: C.teal, fontWeight:600 }}>Healthy</span>
          </div>
        </SettingRow>
        <SettingRow label="MQTT Broker (Aedes)" desc="Protocol gateway port 1884">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: C.teal, boxShadow:`0 0 5px ${C.teal}` }} />
            <span style={{ fontSize:12, color: C.teal, fontWeight:600 }}>Running</span>
          </div>
        </SettingRow>
      </SettingSection>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <Btn variant="secondary">Cancel</Btn>
        <Btn variant="primary" icon="save">Save Project Settings</Btn>
      </div>
    </div>
  )
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const [webhook, setWebhook] = useState('')
  const [email, setEmail] = useState('admin@telecominfra.id')
  const [saved, setSaved] = useState(false)

  return (
    <div>
      <SettingSection title="Alert Notifications">
        <SettingRow label="Email Alerts" desc="Receive alerts when threshold is triggered">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Push Notifications" desc="Browser push for real-time alerts">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="SMS Alerts" desc="Text message for critical alerts">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Alert Email Address" desc="Override destination for alert emails">
          <div style={{ width:240 }}><Input value={email} onChange={setEmail} type="email" /></div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Webhook">
        <SettingRow label="Webhook URL" desc="POST payload to external endpoint on alert">
          <div style={{ width:300 }}><Input value={webhook} onChange={setWebhook} placeholder="https://your-server.com/webhook" /></div>
        </SettingRow>
        <SettingRow label="Include Device Metadata" desc="Append device info to webhook payload">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Retry on Failure" desc="Retry webhook 3× on HTTP error">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Digest & Frequency">
        <SettingRow label="Daily Summary Email" desc="Summary of all alerts from the past 24h">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Quiet Hours" desc="Suppress alerts between 10pm – 7am">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Alert Cooldown" desc="Minimum time between repeat alerts">
          <Select value="5m" onChange={() => {}} options={[
            { label:'1 minute',  value:'1m'  },
            { label:'5 minutes', value:'5m'  },
            { label:'15 minutes', value:'15m' },
            { label:'1 hour',    value:'1h'  },
          ]} style={{ width:160 }} />
        </SettingRow>
      </SettingSection>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        {saved && <span style={{ fontSize:12, color: C.teal, display:'flex', alignItems:'center', gap:5 }}><Icon name="check" size={13} color={C.teal} /> Saved</span>}
        <Btn variant="secondary">Cancel</Btn>
        <Btn variant="primary" icon="save" onClick={() => { setSaved(true); setTimeout(()=>setSaved(false),2000) }}>Save Preferences</Btn>
      </div>
    </div>
  )
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)

  const sessions = [
    { device:'Chrome on Windows', ip:'192.168.1.10', time:'Now · Current Session', current:true },
    { device:'Firefox on Android', ip:'192.168.1.23', time:'2 hours ago', current:false },
    { device:'Safari on iPhone', ip:'10.10.10.5', time:'Yesterday', current:false },
  ]

  return (
    <div>
      <SettingSection title="Change Password">
        <SettingRow label="Current Password" desc="">
          <div style={{ width:240, position:'relative' }}>
            <Input value={current} onChange={setCurrent} type={show ? 'text' : 'password'} placeholder="••••••••" />
            <button onClick={() => setShow(p=>!p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color: C.muted, cursor:'pointer' }}>
              <Icon name={show ? 'eye-off' : 'eye'} size={14} />
            </button>
          </div>
        </SettingRow>
        <SettingRow label="New Password" desc="">
          <div style={{ width:240 }}><Input value={next} onChange={setNext} type="password" placeholder="Min. 8 characters" /></div>
        </SettingRow>
        <SettingRow label="Confirm Password" desc="">
          <div style={{ width:240 }}><Input value={confirm} onChange={setConfirm} type="password" placeholder="Repeat new password" /></div>
        </SettingRow>
        <div style={{ paddingTop:12 }}>
          <Btn variant="primary" icon="lock">Update Password</Btn>
        </div>
      </SettingSection>

      <SettingSection title="Two-Factor Authentication">
        <SettingRow label="Authenticator App" desc="Use TOTP via Google Authenticator or Authy">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Pill text="NOT SET UP" color={C.muted} />
            <Btn variant="secondary" size="sm">Enable 2FA</Btn>
          </div>
        </SettingRow>
        <SettingRow label="SMS Verification" desc="Receive one-time codes via SMS">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Active Sessions">
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {sessions.map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:10, background: s.current ? `${C.coral}10` : C.surface2, border:`1px solid ${s.current ? C.coral+'33' : C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background: s.current ? C.coral : C.muted, boxShadow: s.current ? `0 0 6px ${C.coral}` : 'none' }} />
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color: C.light }}>{s.device}</div>
                  <div style={{ fontSize:11, color: C.muted }}>{s.ip} · {s.time}</div>
                </div>
              </div>
              {!s.current && <Btn variant="ghost" size="sm">Revoke</Btn>}
              {s.current && <Pill text="CURRENT" color={C.coral} />}
            </div>
          ))}
        </div>
        <div style={{ paddingTop:12 }}>
          <Btn variant="secondary" size="sm" icon="close">Revoke All Other Sessions</Btn>
        </div>
      </SettingSection>
    </div>
  )
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────
function APIKeysTab() {
  const [newKeyName, setNewKeyName] = useState('')
  const [keys, setKeys] = useState([
    { id:'k1', name:'Smart Home Primary', key:'sk_live_Nf8x...3kQP', created:'Aug 5 2026', lastUsed:'2 min ago', perms:'read+write' },
    { id:'k2', name:'ESP32 Device Auth', key:'sk_dev_xY2m...9pRt', created:'Aug 1 2026', lastUsed:'14 min ago', perms:'write' },
    { id:'k3', name:'Analytics Export', key:'sk_live_Gv4n...7sLp', created:'Jul 28 2026', lastUsed:'3 days ago', perms:'read' },
  ])
  const [copied, setCopied] = useState<string|null>(null)

  const generateKey = () => {
    if (!newKeyName.trim()) return
    const k: typeof keys[0] = { id:`k${Date.now()}`, name: newKeyName, key:`sk_live_${Math.random().toString(36).slice(2,6)}...${Math.random().toString(36).slice(2,6)}`, created:'Aug 11 2026', lastUsed:'Never', perms:'read+write' }
    setKeys(p => [...p, k])
    setNewKeyName('')
  }

  const copy = (key: string, id: string) => {
    navigator.clipboard?.writeText(key).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const permColor = (p: string) => p === 'read+write' ? C.coral : p === 'write' ? C.magenta : C.teal

  return (
    <div>
      {/* Generate */}
      <Card style={{ padding:20, marginBottom:24 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Generate New API Key</div>
        <div style={{ fontSize:12, color: C.muted, marginBottom:14 }}>Keys are used by devices and integrations to authenticate with the platform</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, alignItems:'flex-end' }}>
          <div>
            <SectionLabel>Key Name</SectionLabel>
            <Input value={newKeyName} onChange={setNewKeyName} placeholder="e.g. ESP32 Greenhouse Sensor" />
          </div>
          <div>
            <SectionLabel>Permissions</SectionLabel>
            <Select value="read+write" onChange={() => {}} options={[
              { label:'Read + Write', value:'read+write' },
              { label:'Write only',   value:'write'       },
              { label:'Read only',    value:'read'        },
            ]} style={{ width:160 }} />
          </div>
          <Btn variant="primary" icon="key" onClick={generateKey}>Generate</Btn>
        </div>
      </Card>

      {/* Key list */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {keys.map(k => (
          <Card key={k.id} style={{ padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <Icon name="key" size={14} color={C.coral} />
                  <span style={{ fontWeight:700, fontSize:14, color: C.light }}>{k.name}</span>
                  <Pill text={k.perms} color={permColor(k.perms)} />
                </div>
                <div style={{ display:'flex', gap:16, fontSize:11, color: C.muted }}>
                  <span style={{ fontFamily:'DM Mono,monospace', background: C.surface3, padding:'2px 8px', borderRadius:4 }}>{k.key}</span>
                  <span>Created: {k.created}</span>
                  <span>Last used: {k.lastUsed}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => copy(k.key, k.id)} style={{ display:'flex', alignItems:'center', gap:5, background: C.surface3, border:`1px solid ${C.border}`, color: copied === k.id ? C.teal : C.muted, padding:'6px 12px', borderRadius:7, cursor:'pointer', fontSize:11, transition:'all .15s' }}>
                  <Icon name={copied === k.id ? 'check' : 'copy'} size={12} />{copied === k.id ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => setKeys(p => p.filter(x => x.id !== k.id))} style={{ background:'rgba(198,92,85,0.1)', border:'1px solid rgba(198,92,85,0.2)', color: C.coral, padding:'6px 10px', borderRadius:7, cursor:'pointer', transition:'background .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(198,92,85,0.25)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(198,92,85,0.1)'}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Appearance Tab ────────────────────────────────────────────────────────────
function AppearanceTab() {
  const { settings, accent, update, save, reset } = useAppearance()
  const [saved, setSaved] = useState(false)

  const doSave = () => { save(); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div>
      {/* ── Color Accent ──────────────────────────────────────────────── */}
      <SettingSection title="Color Accent">
        <div style={{ fontSize:12, color: C.muted, marginBottom:12 }}>
          Choose a primary + secondary accent pair. Applied instantly across the platform.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {ACCENT_PRESETS.map(p => {
            const active = settings.accentId === p.id
            return (
              <div key={p.id} onClick={() => update({ accentId: p.id })} style={{
                padding:'14px 16px', borderRadius:12, cursor:'pointer',
                border:`2px solid ${active ? p.a : 'var(--c-border)'}`,
                background: active ? `${p.a}14` : 'var(--c-surface2)',
                transition:'all .18s',
              }}>
                <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:p.a, boxShadow:`0 0 8px ${p.a}88` }} />
                  <div style={{ width:22, height:22, borderRadius:'50%', background:p.b, boxShadow:`0 0 8px ${p.b}66` }} />
                  <div style={{ width:22, height:22, borderRadius:'50%', background:p.c, boxShadow:`0 0 6px ${p.c}44` }} />
                </div>
                <div style={{ fontSize:11, fontWeight:700, color: active ? C.light : C.muted }}>{p.label}</div>
                {active && <div style={{ fontSize:9, color: p.a, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>● Active</div>}
              </div>
            )
          })}
        </div>

        {/* Live preview strip */}
        <div style={{ marginTop:14, padding:'12px 16px', borderRadius:10, background:'var(--c-surface2)', border:'1px solid var(--c-border)', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:11, color: C.muted, fontWeight:600 }}>Preview:</span>
          <div style={{ height:6, flex:1, borderRadius:4, background:`linear-gradient(90deg, ${accent.a}, ${accent.b}, ${accent.c})` }} />
          <button style={{ padding:'5px 14px', borderRadius:8, border:'none', background:`linear-gradient(135deg,${accent.a},${accent.b})`, color:'#fff', fontSize:11, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'default' }}>Button</button>
          <div style={{ width:12, height:12, borderRadius:'50%', background: accent.a, boxShadow:`0 0 10px ${accent.a}` }} />
        </div>
      </SettingSection>

      {/* ── Layout & Density ──────────────────────────────────────────── */}
      <SettingSection title="Layout & Density">
        <SettingRow label="Dashboard Density" desc="Controls widget padding and grid spacing">
          <div style={{ display:'flex', gap:6 }}>
            {(['comfortable','compact'] as const).map(d => (
              <button key={d} onClick={() => update({ density: d })} style={{
                padding:'7px 16px', borderRadius:8,
                border:`1.5px solid ${settings.density===d ? accent.a : 'var(--c-border)'}`,
                background: settings.density===d ? `${accent.a}18` : 'var(--c-surface2)',
                color: settings.density===d ? accent.a : C.muted,
                cursor:'pointer', fontSize:12, fontWeight:600, textTransform:'capitalize',
                transition:'all .15s', fontFamily:'Outfit,sans-serif',
              }}>
                {d === 'comfortable' ? '⬛ Comfortable' : '▪ Compact'}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Sidebar Collapsed by Default" desc="Start every session with a minimized sidebar">
          <Toggle on={settings.sidebarCollapsed} onChange={() => update({ sidebarCollapsed: !settings.sidebarCollapsed })} />
        </SettingRow>

        <SettingRow label="Animate Charts & Transitions" desc="Smooth data update animations across widgets">
          <Toggle on={settings.animateCharts} onChange={() => update({ animateCharts: !settings.animateCharts })} />
        </SettingRow>
      </SettingSection>

      {/* ── Language & Region ─────────────────────────────────────────── */}
      <SettingSection title="Language & Region">
        <SettingRow label="Display Language" desc="Platform UI language">
          <Select value={settings.lang} onChange={v => update({ lang: v as any })} options={[
            { label:'🇺🇸 English', value:'en' },
            { label:'🇮🇩 Bahasa Indonesia', value:'id' },
          ]} style={{ width:200 }} />
        </SettingRow>
        <SettingRow label="Date Format" desc="How dates appear throughout the platform">
          <Select value={settings.dateFmt} onChange={v => update({ dateFmt: v as any })} options={[
            { label:'DD/MM/YYYY  (e.g. 11/08/2026)', value:'DMY' },
            { label:'MM/DD/YYYY  (e.g. 08/11/2026)', value:'MDY' },
            { label:'YYYY-MM-DD  (ISO 8601)',         value:'YMD' },
          ]} style={{ width:240 }} />
        </SettingRow>
        <SettingRow label="Current Settings" desc="">
          <div style={{ fontSize:11, fontFamily:'DM Mono,monospace', color: C.muted }}>
            {settings.lang === 'id' ? 'Bahasa Indonesia' : 'English'} · {settings.dateFmt} · {settings.density}
          </div>
        </SettingRow>
      </SettingSection>

      {/* ── Save / Reset ──────────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <Btn variant="secondary" onClick={reset}>Reset Defaults</Btn>
        <button onClick={doSave} style={{
          padding:'9px 22px', borderRadius:10, border:'none',
          background: saved ? `${C.teal}cc` : `linear-gradient(135deg,${accent.a},${accent.b})`,
          color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
          fontFamily:'Outfit,sans-serif', transition:'all .2s',
          boxShadow: `0 4px 16px ${accent.a}44`,
        }}>
          {saved ? '✓ Saved!' : '💾 Save Appearance'}
        </button>
      </div>
    </div>
  )
}

// ── Danger Zone Tab ───────────────────────────────────────────────────────────
function DangerTab() {
  const [confirm, setConfirm] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  return (
    <div>
      <div style={{ padding:16, borderRadius:12, background:'rgba(198,92,85,0.06)', border:`1px solid ${C.coral}33`, marginBottom:24, display:'flex', alignItems:'center', gap:12 }}>
        <Icon name="danger" size={18} color={C.coral} />
        <div style={{ fontSize:12, color: C.muted }}>Actions in this section are <b style={{ color: C.coral }}>irreversible</b>. Proceed with caution.</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Export */}
        <Card style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color: C.light }}>Export All Data</div>
              <div style={{ fontSize:12, color: C.muted, marginTop:2 }}>Download all telemetry, devices, and settings as JSON / CSV</div>
            </div>
            <Btn variant="secondary" icon="download">Export Data</Btn>
          </div>
        </Card>

        {/* Archive */}
        <Card style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color: C.light }}>Archive Project</div>
              <div style={{ fontSize:12, color: C.muted, marginTop:2 }}>Disable all devices and put project in read-only mode</div>
            </div>
            <Btn variant="secondary" icon="lock">Archive Project</Btn>
          </div>
        </Card>

        {/* Delete */}
        <Card style={{ padding:'20px 22px', border:`1px solid ${C.coral}44` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color: C.coral }}>Delete Project</div>
              <div style={{ fontSize:12, color: C.muted, marginTop:2 }}>Permanently delete this project and all associated data. This cannot be undone.</div>
            </div>
            <Btn variant="danger" icon="trash" onClick={() => setShowDelete(p=>!p)}>Delete Project</Btn>
          </div>
          {showDelete && (
            <div style={{ marginTop:16, padding:16, borderRadius:10, background:'rgba(198,92,85,0.1)', border:`1px solid ${C.coral}33` }}>
              <div style={{ fontSize:12, color: C.light, marginBottom:10 }}>Type <b style={{ color: C.coral }}>Smart Home v2</b> to confirm deletion:</div>
              <div style={{ display:'flex', gap:10 }}>
                <Input value={confirm} onChange={setConfirm} placeholder="Smart Home v2" />
                <Btn variant="danger" disabled={confirm !== 'Smart Home v2'} icon="trash">Confirm Delete</Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Root Settings ─────────────────────────────────────────────────────────────
export default function SettingsView() {
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color: C.light }}>Settings</h1>
        <p style={{ margin:'4px 0 0', fontSize:12, color: C.muted }}>Manage your profile, project, security, and preferences</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20 }}>
        {/* Tab nav */}
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:9,
              border: t.key === 'danger' ? `1px solid ${tab===t.key ? C.coral+'88' : 'transparent'}` : 'none',
              background: tab===t.key ? (t.key==='danger' ? `${C.coral}12` : `linear-gradient(90deg,${C.coral}20,${C.purple}12)`) : 'transparent',
              color: tab===t.key ? (t.key==='danger' ? C.coral : C.coral) : (t.key==='danger' ? C.coral+'88' : C.muted),
              cursor:'pointer', textAlign:'left', fontFamily:'Outfit,sans-serif',
              borderLeft: tab===t.key && t.key!=='danger' ? `2px solid ${C.coral}` : '2px solid transparent',
              transition:'all .15s',
            }}>
              <Icon name={t.icon} size={15} />
              <span style={{ fontSize:13, fontWeight: tab===t.key ? 700 : 400 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <Card style={{ padding:'24px 28px' }}>
          {tab === 'profile'       && <ProfileTab />}
          {tab === 'project'       && <ProjectTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'security'      && <SecurityTab />}
          {tab === 'apikeys'       && <APIKeysTab />}
          {tab === 'appearance'    && <AppearanceTab />}
          {tab === 'danger'        && <DangerTab />}
        </Card>
      </div>
    </div>
  )
}
