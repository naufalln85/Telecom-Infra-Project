import { C } from '@/lib/theme'

// ── Icons ──────────────────────────────────────────────────────────────────
export const ICONS: Record<string, string> = {
  dashboard:   'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  devices:     'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
  automation:  'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  users:       'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  analytics:   'M22 12h-4l-3 9L9 3l-3 9H2',
  settings:    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm6.93-3a6 6 0 0 0-.17-1.37l2.12-1.23-2-3.46-2.12 1.22A6 6 0 0 0 15 5.27V3H9v2.27a6 6 0 0 0-1.76 1.09L5.12 5.14l-2 3.46 2.12 1.22A6 6 0 0 0 5.07 12l-.17 1.37-2.12 1.22 2 3.46 2.12-1.22A6 6 0 0 0 9 18.73V21h6v-2.27a6 6 0 0 0 1.76-1.09l2.12 1.22 2-3.46-2.12-1.22z',
  alerts:      'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  gateway:     'M4 17L2 15v-4l2-2h16l2 2v4l-2 2H4zm4-2h8M8 11v1M12 11v1M16 11v1',
  power:       'M18.36 6.64A9 9 0 1 1 5.64 5.64M12 2v10',
  wifi:        'M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01',
  thermometer: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
  humidity:    'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  cpu:         'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  map:         'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-4v16m8-12v16',
  close:       'M18 6 6 18M6 6l12 12',
  menu:        'M3 12h18M3 6h18M3 18h18',
  plus:        'M12 5v14M5 12h14',
  chevron:     'M6 9l6 6 6-6',
  bell:        'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  signal:      'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16',
  developer:   'M16 18l6-6-6-6M8 6l-6 6 6 6',
  shield:      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  brain:       'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  data:        'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  refresh:     'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  search:      'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  filter:      'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  trash:       'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  download:    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  link:        'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  layers:      'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  edit:        'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  check:       'M20 6L9 17l-5-5',
  clock:       'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  home:        'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  drag:        'M9 5h2M13 5h2M9 9h2M13 9h2M9 13h2M13 13h2',
  key:         'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  lock:        'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-7 4v2m-3-6V7a4 4 0 0 1 8 0v1',
  moon:        'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  sun:         'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z',
  eye:         'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'eye-off':   'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22',
  terminal:    'M4 17l6-6-6-6M12 19h8',
  gauge:       'M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10m10-7v7l3 3',
  chart:       'M3 3v18h18M9 17V9M13 17V5M17 17v-3',
  list:        'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  grid:        'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  save:        'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zm-7-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-11H6',
  alert:       'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  copy:        'M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2zm0 0H6',
  mail:        'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 8 8-8',
  phone:       'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91A16 16 0 0 0 12 12a16 16 0 0 0 3.09 1.91l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  'danger':    'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  user:        'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  camera:      'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  palette:     'M12 2a10 10 0 1 0 10 10c0-5.5-4.5-10-10-10zM12 20c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8a2 2 0 0 1-2 2c-1.1 0-2-.9-2-2v-4a4 4 0 0 0-4-4 4 4 0 0 0-4 4 4 4 0 0 0 4 4',
  info:        'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-4v-4m0-4h.01',
  webhook:     'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zm4-7v3M12 1v3M8 1v3',
}

export function Icon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const d = ICONS[name] ?? ICONS.info
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color ?? 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style, onClick, hover }: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  hover?: boolean
}) {
  const [hov, setHov] = React.useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surface2} 100%)`,
        border: `1px solid ${hov ? 'rgba(237,237,237,0.18)' : C.border}`,
        borderRadius: 16,
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
        transform: hover && hov ? 'translateY(-1px)' : 'none',
        boxShadow: hover && hov ? `0 8px 24px rgba(0,0,0,0.3)` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >{children}</div>
  )
}

// ── Btn ─────────────────────────────────────────────────────────────────────
export function Btn({
  children, onClick, variant = 'primary', size = 'md', disabled, style, icon
}: {
  children?: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  style?: React.CSSProperties
  icon?: string
}) {
  const [hov, setHov] = React.useState(false)
  const [press, setPress] = React.useState(false)

  const bg: Record<string, string> = {
    primary: `linear-gradient(135deg, ${C.coral}, ${C.purple})`,
    secondary: hov ? C.surface3 : C.surface2,
    ghost: hov ? 'rgba(237,237,237,0.07)' : 'transparent',
    danger: hov ? '#7a1a1a' : '#5c1414',
  }
  const color: Record<string, string> = {
    primary: '#fff',
    secondary: hov ? C.light : C.muted,
    ghost: hov ? C.light : C.muted,
    danger: '#ffaaaa',
  }
  const pad: Record<string, string> = { sm: '5px 12px', md: '8px 16px', lg: '11px 22px' }
  const fs: Record<string, number> = { sm: 11, md: 13, lg: 14 }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false) }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: variant === 'primary' ? bg.primary : bg[variant],
        border: variant === 'secondary' ? `1px solid ${C.border}` : 'none',
        color: color[variant],
        padding: pad[size], borderRadius: 9, fontSize: fs[size],
        fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all .15s',
        transform: press ? 'scale(0.97)' : 'scale(1)',
        boxShadow: variant === 'primary' && !press ? `0 2px 12px ${C.coral}44` : 'none',
        fontFamily: 'Outfit, sans-serif',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={fs[size] + 1} />}
      {children}
    </button>
  )
}

// ── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({ on, onChange, size = 'md' }: { on: boolean; onChange: () => void; size?: 'sm'|'md' }) {
  const w = size === 'sm' ? 34 : 42
  const h = size === 'sm' ? 18 : 22
  const d = size === 'sm' ? 12 : 16
  const gap = size === 'sm' ? 3 : 3
  return (
    <button onClick={onChange} style={{
      width: w, height: h, borderRadius: h / 2, flexShrink: 0,
      background: on ? C.coral : 'rgba(237,237,237,0.12)',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background .22s',
    }}>
      <span style={{
        position: 'absolute', top: gap, left: on ? w - d - gap : gap,
        width: d, height: d, borderRadius: '50%',
        background: on ? '#fff' : C.muted,
        transition: 'left .22s',
        boxShadow: on ? `0 2px 6px ${C.coral}88` : 'none',
      }} />
    </button>
  )
}

// ── Pill ─────────────────────────────────────────────────────────────────────
export function Pill({ text, color, dim }: { text: string; color: string; dim?: boolean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
      color, background: dim ? `${color}18` : `${color}28`,
      letterSpacing: '0.05em', textTransform: 'uppercase' as const,
      border: `1px solid ${color}33`, whiteSpace: 'nowrap' as const,
    }}>{text}</span>
  )
}

// ── StatusDot ────────────────────────────────────────────────────────────────
export function StatusDot({ color }: { color: string }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
}

// ── Input ────────────────────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = 'text', style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties
}) {
  const [foc, setFoc] = React.useState(false)
  return (
    <input
      type={type} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      style={{
        width: '100%', background: C.surface2,
        border: `1px solid ${foc ? C.coral + '88' : C.border}`,
        borderRadius: 8, padding: '9px 12px',
        fontSize: 13, color: C.light, outline: 'none',
        fontFamily: 'Outfit, sans-serif',
        transition: 'border-color .15s',
        ...style,
      }}
    />
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, style }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; style?: React.CSSProperties
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.light, outline: 'none',
      fontFamily: 'Outfit, sans-serif', cursor: 'pointer', ...style,
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── Section label ────────────────────────────────────────────────────────────
export function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: color ?? C.muted, marginBottom: 8 }}>
      {children}
    </div>
  )
}

// ── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ icon, title, sub, action }: {
  icon: string; title: string; sub?: string; action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.coral}33, ${C.purple}33)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.coral,
        }}><Icon name={icon} size={20} /></div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.light }}>{title}</h1>
          {sub && <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>{sub}</p>}
        </div>
      </div>
      {action && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{action}</div>}
    </div>
  )
}

// ── Gauge SVG ─────────────────────────────────────────────────────────────────
export function GaugeSVG({ value, max, label, color, unit }: {
  value: number; max: number; label: string; color: string; unit: string
}) {
  const r = 48, circ = 2 * Math.PI * r, arc = circ * 0.65
  const pct = Math.min(value / max, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={120} height={88} viewBox="0 0 120 92">
        <circle cx={60} cy={80} r={r} fill="none" stroke="var(--c-surface3)"
          strokeWidth={9} strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
          transform="rotate(-117 60 80)" />
        <circle cx={60} cy={80} r={r} fill="none" stroke={color}
          strokeWidth={9} strokeDasharray={`${pct * arc} ${circ - pct * arc}`} strokeLinecap="round"
          transform="rotate(-117 60 80)"
          style={{ filter: `drop-shadow(0 0 5px ${color}88)`, transition: 'stroke-dasharray .4s' }} />
        <text x="60" y="74" textAnchor="middle" fill={C.light} fontFamily="Outfit" fontWeight="700" fontSize="22">{value}</text>
        <text x="60" y="88" textAnchor="middle" fill={C.muted} fontFamily="Outfit" fontSize="10">{unit}</text>
      </svg>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── CustomTooltip ─────────────────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.light }}>
      <div style={{ color: C.muted, marginBottom: 3 }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.stroke ?? p.fill }}>{p.value}</div>)}
    </div>
  )
}

// React import needed
import React from 'react'
