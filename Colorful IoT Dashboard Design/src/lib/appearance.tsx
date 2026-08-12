import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type AccentPreset = {
  id:    string
  label: string
  a:     string   // primary accent hex
  b:     string   // secondary accent hex
  c:     string   // tertiary (magenta-like) hex
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id:'coral-purple',   label:'Coral × Purple',     a:'#C65C55', b:'#931783', c:'#AD3A6C' },
  { id:'magenta-teal',   label:'Magenta × Teal',     a:'#AD3A6C', b:'#2AA6A0', c:'#931783' },
  { id:'amber-coral',    label:'Amber × Coral',      a:'#D4913A', b:'#C65C55', c:'#AD3A6C' },
  { id:'purple-magenta', label:'Purple × Magenta',   a:'#931783', b:'#AD3A6C', c:'#C65C55' },
  { id:'teal-purple',    label:'Teal × Purple',      a:'#2AA6A0', b:'#931783', c:'#C65C55' },
  { id:'green-teal',     label:'Green × Teal',       a:'#3DAA6A', b:'#2AA6A0', c:'#931783' },
]

export type Density = 'comfortable' | 'compact'
export type DateFmt = 'DMY' | 'MDY' | 'YMD'
export type Lang    = 'en' | 'id'

export type AppearanceSettings = {
  accentId:        string
  density:         Density
  sidebarCollapsed: boolean
  animateCharts:   boolean
  lang:            Lang
  dateFmt:         DateFmt
}

const DEFAULTS: AppearanceSettings = {
  accentId:        'coral-purple',
  density:         'comfortable',
  sidebarCollapsed: false,
  animateCharts:   true,
  lang:            'en',
  dateFmt:         'DMY',
}

const LS_KEY = 'yugma_appearance'

function load(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch { return DEFAULTS }
}

function applyToDOM(s: AppearanceSettings) {
  const preset = ACCENT_PRESETS.find(p => p.id === s.accentId) ?? ACCENT_PRESETS[0]
  const root = document.documentElement
  root.style.setProperty('--c-accent-a', preset.a)
  root.style.setProperty('--c-accent-b', preset.b)
  root.style.setProperty('--c-accent-c', preset.c)

  // density
  const body = document.body
  if (s.density === 'compact') { body.dataset.density = 'compact' }
  else { delete body.dataset.density }

  // animation
  if (!s.animateCharts) { body.dataset.noAnim = '' }
  else { delete body.dataset.noAnim }
}

type Ctx = {
  settings:  AppearanceSettings
  accent:    AccentPreset
  update:    (patch: Partial<AppearanceSettings>) => void
  save:      () => void
  reset:     () => void
}

const AppearanceCtx = createContext<Ctx>(null!)
export const useAppearance = () => useContext(AppearanceCtx)

export function AppearanceProvider({ children, onSidebarChange }: {
  children: React.ReactNode
  onSidebarChange?: (collapsed: boolean) => void
}) {
  const [settings, setSettings] = useState<AppearanceSettings>(load)

  const accent = ACCENT_PRESETS.find(p => p.id === settings.accentId) ?? ACCENT_PRESETS[0]

  // apply on mount + every change
  useEffect(() => { applyToDOM(settings) }, [settings])

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      if (patch.sidebarCollapsed !== undefined) onSidebarChange?.(patch.sidebarCollapsed)
      return next
    })
  }, [onSidebarChange])

  const save  = useCallback(() => {
    setSettings(prev => { localStorage.setItem(LS_KEY, JSON.stringify(prev)); return prev })
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setSettings(DEFAULTS)
  }, [])

  return <AppearanceCtx.Provider value={{ settings, accent, update, save, reset }}>{children}</AppearanceCtx.Provider>
}
