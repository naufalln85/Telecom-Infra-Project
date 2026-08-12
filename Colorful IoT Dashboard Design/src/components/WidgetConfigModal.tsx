import React, { useState } from 'react'
import { C, THEME_COLORS, type ColorKey, type Widget } from '@/lib/theme'
import { Icon, Btn, Input, Select, SectionLabel } from './Shared'

const DEVICES = ['All Devices', 'ESP32-S3 Room A', 'Humidity Node B', 'Raspberry Pi Gateway', 'NodeMCU Power Meter', 'Sensor LDR']
const CHANNELS: Record<string, string[]> = {
  'All Devices':          ['temperature', 'humidity', 'power', 'relay', 'motion', 'status'],
  'ESP32-S3 Room A':      ['temperature (°C)', 'humidity (%)', 'relay_1 (bool)'],
  'Humidity Node B':      ['humidity (%)', 'temperature (°C)'],
  'Raspberry Pi Gateway': ['status', 'latency (ms)', 'cpu_load (%)'],
  'NodeMCU Power Meter':  ['power (kWh)', 'voltage (V)', 'current (A)'],
  'Sensor LDR':           ['ldr_value', 'light_level (lux)'],
}

const COLOR_OPTIONS: { key: ColorKey; label: string; color: string }[] = [
  { key: 'coral',   label: 'Coral',   color: C.coral   },
  { key: 'purple',  label: 'Purple',  color: C.purple  },
  { key: 'magenta', label: 'Magenta', color: C.magenta },
  { key: 'amber',   label: 'Amber',   color: C.amber   },
  { key: 'teal',    label: 'Teal',    color: C.teal    },
]

type Props = { widget: Widget; onSave: (updated: Widget) => void; onClose: () => void }

export default function WidgetConfigModal({ widget, onSave, onClose }: Props) {
  const [title, setTitle] = useState(widget.title)
  const [device, setDevice] = useState(widget.config.device)
  const [channel, setChannel] = useState(widget.config.channel)
  const [unit, setUnit] = useState(widget.config.unit)
  const [colorTheme, setColorTheme] = useState<ColorKey>(widget.config.colorTheme)
  const [colSpan, setColSpan] = useState<1|2|4>(widget.colSpan as 1|2|4)

  const channels = (CHANNELS[device] ?? CHANNELS['All Devices']).map(c => ({ label: c, value: c }))

  const handleSave = () => {
    onSave({ ...widget, title, colSpan, config: { ...widget.config, device, channel, unit, colorTheme } })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 28, width: 480, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: `0 24px 64px rgba(0,0,0,0.6)`,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${THEME_COLORS[colorTheme]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME_COLORS[colorTheme] }}>
              <Icon name="settings" size={15} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.light }}>Configure Widget</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{widget.type.replace(/-/g, ' ').toUpperCase()}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color = C.light} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Widget Title */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Widget Title</SectionLabel>
          <Input value={title} onChange={setTitle} placeholder="e.g. Temperature Label" />
        </div>

        {/* Device + Channel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <SectionLabel>Select Device</SectionLabel>
            <Select value={device} onChange={v => { setDevice(v); setChannel('') }}
              options={DEVICES.map(d => ({ label: d, value: d }))} />
          </div>
          <div>
            <SectionLabel>Datastream / Channel</SectionLabel>
            <Select value={channel} onChange={setChannel} options={channels} />
          </div>
        </div>

        {/* Unit + Size */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <SectionLabel>Unit Symbol</SectionLabel>
            <Input value={unit} onChange={setUnit} placeholder="e.g. °C, %, kWh" />
          </div>
          <div>
            <SectionLabel>Widget Width</SectionLabel>
            <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
              {([1, 2, 4] as const).map(s => (
                <button key={s} onClick={() => setColSpan(s)} style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${colSpan === s ? C.coral : C.border}`,
                  background: colSpan === s ? `${C.coral}18` : C.surface2,
                  color: colSpan === s ? C.coral : C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  transition: 'all .15s', fontFamily: 'Outfit,sans-serif',
                }}>
                  {s === 1 ? '1× Normal' : s === 2 ? '2× Wide' : '4× Full'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color Theme */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Color Theme</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => setColorTheme(opt.key)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 8, border: `1px solid ${colorTheme === opt.key ? opt.color : C.border}`,
                background: colorTheme === opt.key ? `${opt.color}22` : C.surface2,
                color: colorTheme === opt.key ? opt.color : C.muted,
                cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color, boxShadow: colorTheme === opt.key ? `0 0 6px ${opt.color}` : 'none' }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview strip */}
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: `${THEME_COLORS[colorTheme]}12`, border: `1px solid ${THEME_COLORS[colorTheme]}33` }}>
          <div style={{ fontSize: 10, color: THEME_COLORS[colorTheme], fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Preview</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.light }}>{title || 'Widget Title'}</span>
            <span style={{ fontSize: 12, color: THEME_COLORS[colorTheme] }}>{unit}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Device: {device} · Channel: {channel || '—'}</div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} icon="save">Save Settings</Btn>
        </div>
      </div>
    </div>
  )
}
