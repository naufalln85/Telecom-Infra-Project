import React, { useState, useEffect } from 'react'
import { C } from '@/lib/theme'
import { Icon, Btn, Pill, StatusDot } from '@/components/Shared'
import { YUGMA_LOGO_B64 } from '@/imports/logo_base64'
import { AppearanceProvider, useAppearance } from '@/lib/appearance'
import { authApi, projectsApi, type Account, type Project } from '@/lib/api'
import DashboardView from '@/views/Dashboard'
import { DevicesView as WorkspaceDevicesView, MembersView } from '@/views/WorkspaceViews'
import { Empty } from '@/views/Dashboard'
import SettingsView from '@/views/Settings'
import { AimlView, AlertView, AnalyticsView, GatewayView, HomeView, SensorManagementView } from '@/views/WorkspaceOverview'
import {
  LandingPage,
} from '@/views/OtherViews'

type NavKey = 'home'|'dashboard'|'sensors'|'devices'|'automations'|'users'|'gateway'|'analytics'|'aiml'|'settings'|'admin'

const NAV: { key: NavKey; label: string; icon: string; badge?: string }[] = [
  { key:'home',        label:'Home',            icon:'home'      },
  { key:'dashboard',   label:'Dashboards',      icon:'dashboard' },
  { key:'sensors',     label:'Sensor Management', icon:'data'      },
  { key:'devices',     label:'Devices',           icon:'devices'   },
  { key:'automations', label:'Alert',              icon:'alerts',   badge:'0' },
  { key:'users',       label:'Users',           icon:'users'     },
  { key:'gateway',     label:'Fleet & Gateway', icon:'gateway'   },
  { key:'analytics',   label:'Analytics',       icon:'analytics' },
  { key:'aiml',        label:'AI / ML Builder', icon:'brain'     },
]

const PAGE_TITLES: Record<NavKey, string> = {
  home:'Home', dashboard:'Smart Home Dashboard', sensors:'Sensor Management',
  devices:'Devices', automations:'Alert',
  users:'Users', gateway:'Fleet & Gateway', analytics:'Analytics',
  aiml:'AI / ML Builder', settings:'Settings', admin:'Admin Panel',
}

function ProjectModal({ projects, active, onSelect, onCreate, onDelete, onClose }: { projects: Project[]; active: Project | null; onSelect: (project: Project) => void; onCreate: (name: string) => Promise<void>; onDelete: (id: number) => Promise<void>; onClose: () => void }) {
  const [input, setInput] = React.useState('')
  const create = async () => {
    if (input.trim()) { await onCreate(input.trim()); setInput('') }
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }} onClick={onClose}>
      <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:28, width:460, maxWidth:'92vw', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <Icon name="layers" size={18} color={C.coral} />
              <span style={{ fontWeight:800, fontSize:17, color: C.light }}>Manajemen Project</span>
            </div>
            <div style={{ fontSize:12, color: C.muted }}>Tambah, hapus, atau pilih project aktif di bawah account Anda</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color: C.muted, cursor:'pointer', padding:4 }}><Icon name="close" size={16} /></button>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()} placeholder="+ Bikin Project Baru..."
            style={{ flex:1, background: C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px', fontSize:13, color: C.light, outline:'none', fontFamily:'Outfit,sans-serif' }} />
          <Btn variant="primary" icon="plus" onClick={create}>Buat</Btn>
        </div>
        <div style={{ fontSize:10, color: C.muted, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>Daftar Project Aktif:</div>
        {projects.map((p) => (
          <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderRadius:10, marginBottom:8, background: active?.id===p.id ? `${C.coral}15` : C.surface2, border:`1px solid ${active?.id===p.id ? C.coral+'44' : C.border}`, cursor:'pointer', transition:'all .15s' }} onClick={()=>onSelect(p)}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Icon name="layers" size={14} color={active?.id===p.id?C.coral:C.muted} />
              <span style={{ fontWeight:600, fontSize:14, color: C.light }}>{p.name}</span>
              {active?.id===p.id && <Pill text="ACTIVE" color={C.coral} />}
            </div>
            {projects.length > 1 && (
              <button onClick={async e=>{e.stopPropagation(); await onDelete(p.id)}} style={{ background:'transparent', border:'none', color: C.muted, cursor:'pointer', padding:4 }}>
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AppShell() {
  const { settings } = useAppearance()
  const [isLoggedIn, setIsLoggedIn] = useState(authApi.hasSession())
  const [account, setAccount] = useState<Account | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(authApi.hasSession())
  const [workspaceError, setWorkspaceError] = useState("")
  const [reloadWorkspace, setReloadWorkspace] = useState(0)
  const [nav, setNav] = useState<NavKey>('home')
  const [sidebar, setSidebar] = useState(!settings.sidebarCollapsed)
  const [showProject, setShowProject] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const [time, setTime] = useState(new Date())
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // sync sidebar when settings change
  useEffect(() => { setSidebar(!settings.sidebarCollapsed) }, [settings.sidebarCollapsed])

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    setWorkspaceLoading(true)
    setWorkspaceError("")

    Promise.all([authApi.me(), projectsApi.list()]).then(async ([me, list]) => {
      if (cancelled) return
      setAccount(me)
      if (list.length === 0) {
        try {
          const created = await projectsApi.create("Project Utama")
          if (cancelled) return
          setProjects([created])
          setActiveProject(created)
        } catch {
          if (cancelled) return
          setProjects([])
          setActiveProject(null)
        }
      } else {
        setProjects(list)
        setActiveProject(list[0])
      }
    }).catch((error) => {
      if (cancelled) return
      // request() removes an expired/invalid token on 401. Return to the
      // landing page instead of rendering a fake workspace for that session.
      if (!authApi.hasSession()) {
        setAccount(null)
        setProjects([])
        setActiveProject(null)
        setIsLoggedIn(false)
        return
      }
      setWorkspaceError(error instanceof Error ? error.message : "Tidak dapat memuat workspace.")
    }).finally(() => {
      if (!cancelled) setWorkspaceLoading(false)
    })

    return () => { cancelled = true }
  }, [isLoggedIn, reloadWorkspace])

  // ── Landing page (full screen, no shell) ──────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div data-theme={isDark ? 'dark' : 'light'}>
        <LandingPage
          isDark={isDark}
          onToggleTheme={() => setIsDark(p => !p)}
          onEnter={() => {}}
          onLogin={async (email, password) => { await authApi.login(email, password); setIsLoggedIn(true) }}
          onRegister={async (email, password) => { await authApi.register(email, password); setIsLoggedIn(true) }}
        />
      </div>
    )
  }

  if (workspaceLoading) {
    return (
      <div data-theme={isDark ? 'dark' : 'light'} style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:C.bg, color:C.muted, fontFamily:'Outfit,sans-serif' }}>
        Memuat workspace Yugma...
      </div>
    )
  }

  if (workspaceError) {
    return (
      <div data-theme={isDark ? 'dark' : 'light'} style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:C.bg, color:C.light, fontFamily:'Outfit,sans-serif', padding:24 }}>
        <div style={{ maxWidth:420, textAlign:'center', background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28 }}>
          <h2 style={{ margin:'0 0 10px' }}>Workspace belum dapat dimuat</h2>
          <p style={{ color:C.muted, fontSize:13, lineHeight:1.6 }}>{workspaceError}</p>
          <Btn variant="primary" onClick={()=>setReloadWorkspace(value=>value+1)}>Coba lagi</Btn>
        </div>
      </div>
    )
  }

  // ── Dashboard shell ───────────────────────────────────────────────────────
  return (
    <div data-theme={isDark ? 'dark' : 'light'} style={{ display:'flex', height:'100vh', background: C.bg, overflow:'hidden', fontFamily:'Outfit,sans-serif', color: C.light }}>
      {showProject && <ProjectModal projects={projects} active={activeProject} onSelect={p=>{setActiveProject(p);setShowProject(false)}} onCreate={async name=>{const p=await projectsApi.create(name);setProjects(x=>[...x,p]);setActiveProject(p)}} onDelete={async id=>{await projectsApi.remove(id); const remaining=projects.filter(p=>p.id!==id); setProjects(remaining); setActiveProject(active=>active?.id===id ? (remaining[0] ?? null) : active)}} onClose={()=>setShowProject(false)} />}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{ width: sidebar ? 216 : 60, flexShrink:0, transition:'width .22s', background: C.bg, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'14px 14px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.border}` }}>
          <img src={YUGMA_LOGO_B64} alt="Yugma IoT" style={{ width:32, height:32, objectFit:'contain', flexShrink:0 }} />
          {sidebar && <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:800, fontSize:14, color: C.light }}>Yugma</div><div style={{ fontSize:9, color: C.muted, marginTop:1 }}>IoT Platform</div></div>}
          <button onClick={()=>setSidebar(p=>!p)} style={{ background:'none', border:'none', color: C.muted, cursor:'pointer', padding:2, flexShrink:0, transition:'color .15s' }}
            onMouseEnter={e=>e.currentTarget.style.color=C.light} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
            <Icon name="menu" size={15} />
          </button>
        </div>

        {sidebar && (
          <button onClick={()=>setShowProject(true)} style={{ margin:'10px 10px 4px', padding:'10px 12px', borderRadius:10, background:`linear-gradient(135deg,${C.coral}18,${C.purple}18)`, border:`1px solid ${C.coral}33`, cursor:'pointer', textAlign:'left', transition:'border-color .15s', fontFamily:'Outfit,sans-serif' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.coral} onMouseLeave={e=>e.currentTarget.style.borderColor=`${C.coral}33`}>
            <div style={{ fontSize:9, color: C.coral, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Active Project</div>
            <div style={{ fontSize:12, color: C.light, fontWeight:700, margin:'3px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              {activeProject?.name ?? 'Select a project'} <Icon name="chevron" size={12} color={C.muted} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <StatusDot color={C.coral} />
              <span style={{ fontSize:9, color: C.muted }}>{activeProject ? 'Project selected' : 'Create a project to begin'}</span>
            </div>
          </button>
        )}

        <nav style={{ flex:1, overflowY:'auto', padding:'6px 6px' }}>
          {NAV.map(item => {
            const active = nav === item.key
            return (
              <button key={item.key} onClick={()=>setNav(item.key)} style={{
                width:'100%', display:'flex', alignItems:'center',
                gap: sidebar ? 9 : 0, justifyContent: sidebar ? 'flex-start' : 'center',
                padding: sidebar ? '9px 11px' : '9px',
                borderRadius:9, border:'none', cursor:'pointer',
                background: active ? `linear-gradient(90deg,${C.coral}22,${C.purple}15)` : 'transparent',
                color: active ? C.coral : C.muted,
                marginBottom:1, transition:'all .15s', textAlign:'left',
                borderLeft: active ? `2px solid ${C.coral}` : '2px solid transparent',
                fontFamily:'Outfit,sans-serif',
              }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.color=C.light }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.color=C.muted }}>
                <Icon name={item.icon} size={15} />
                {sidebar && <span style={{ fontSize:12, fontWeight: active ? 700 : 400, whiteSpace:'nowrap', flex:1 }}>{item.label}</span>}
                {sidebar && item.badge !== undefined && <span style={{ fontSize:9, background: C.surface3, color: C.muted, padding:'1px 5px', borderRadius:8, fontWeight:700 }}>{item.badge}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom: settings + admin */}
        <div style={{ padding:'6px', borderTop:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:2 }}>
          <button onClick={()=>setNav('settings')} style={{
            width:'100%', display:'flex', alignItems:'center',
            gap: sidebar ? 9 : 0, justifyContent: sidebar ? 'flex-start' : 'center',
            padding: sidebar ? '9px 11px' : '9px', borderRadius:9, border:'none', cursor:'pointer',
            background: nav==='settings' ? `linear-gradient(90deg,${C.coral}22,${C.purple}15)` : 'transparent',
            color: nav==='settings' ? C.coral : C.muted,
            borderLeft: nav==='settings' ? `2px solid ${C.coral}` : '2px solid transparent',
            fontFamily:'Outfit,sans-serif', transition:'all .15s',
          }}>
            <Icon name="settings" size={15} />
            {sidebar && <span style={{ fontSize:12, fontWeight: nav==='settings'?700:400 }}>Settings</span>}
          </button>
          <button onClick={()=>setNav('admin')} title="Admin Panel" style={{
            width:'100%', display:'flex', alignItems:'center',
            gap: sidebar ? 9 : 0, justifyContent: sidebar ? 'flex-start' : 'center',
            padding: sidebar ? '9px 11px' : '9px', borderRadius:9, border:'none', cursor:'pointer',
            background: nav==='admin' ? `linear-gradient(90deg,${C.magenta}22,${C.purple}15)` : 'transparent',
            color: nav==='admin' ? C.magenta : C.muted,
            borderLeft: nav==='admin' ? `2px solid ${C.magenta}` : '2px solid transparent',
            fontFamily:'Outfit,sans-serif', transition:'all .15s',
          }}>
            <Icon name="shield" size={15} />
            {sidebar && <span style={{ fontSize:12, fontWeight: nav==='admin'?700:400 }}>Admin Panel</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <header style={{ height:62, display:'flex', alignItems:'center', gap:16, padding:'0 24px', borderBottom:`1px solid ${C.border}`, background: C.surface, flexShrink:0 }}>
          {/* Left: page title */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color: C.light, lineHeight:1.2 }}>{PAGE_TITLES[nav]}</div>
              <div style={{ fontSize:10, color: C.muted, lineHeight:1 }}>{activeProject?.name ?? 'No project selected'}</div>
            </div>
          </div>

          {/* Center: search */}
          <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
            <div style={{ width:'100%', maxWidth:420, position:'relative' }}>
              <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2}><circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/></svg>
              <input placeholder="Search..." style={{ width:'100%', padding:'9px 14px 9px 36px', background:'var(--c-input-bg)', border:'1px solid var(--c-border)', borderRadius:24, fontSize:13, color: C.light, outline:'none', fontFamily:'Outfit,sans-serif', boxSizing:'border-box', transition:'border-color .15s' }}
                onFocus={e=>e.currentTarget.style.borderColor=C.coral}
                onBlur={e=>e.currentTarget.style.borderColor='var(--c-border)'} />
            </div>
          </div>

          {/* Right: controls + user */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color: C.muted }}>
              {time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
            <button onClick={()=>setIsDark(p=>!p)} title={isDark?'Light mode':'Dark mode'} style={{ width:34, height:34, borderRadius:'50%', background:'var(--c-btn-ghost)', border:'1px solid var(--c-border)', color: C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
              onMouseEnter={e=>e.currentTarget.style.color=C.light} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
              {isDark
                ? <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={5}/><line x1={12} y1={1} x2={12} y2={3}/><line x1={12} y1={21} x2={12} y2={23}/><line x1={4.22} y1={4.22} x2={5.64} y2={5.64}/><line x1={18.36} y1={18.36} x2={19.78} y2={19.78}/><line x1={1} y1={12} x2={3} y2={12}/><line x1={21} y1={12} x2={23} y2={12}/><line x1={4.22} y1={19.78} x2={5.64} y2={18.36}/><line x1={18.36} y1={5.64} x2={19.78} y2={4.22}/></svg>
                : <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <button onClick={()=>setNotifications(0)} style={{ position:'relative', width:34, height:34, borderRadius:'50%', background:'var(--c-btn-ghost)', border:'1px solid var(--c-border)', color: C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.color=C.light }}
              onMouseLeave={e=>{ e.currentTarget.style.color=C.muted }}>
              <Icon name="bell" size={14} />
              {notifications > 0 && <span style={{ position:'absolute', top:-2, right:-2, width:14, height:14, borderRadius:'50%', background: C.coral, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff' }}>{notifications}</span>}
            </button>
            <button onClick={()=>{ authApi.logout(); setIsLoggedIn(false); setActiveProject(null); setProjects([]); setAccount(null) }} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:'pointer', fontSize:11, padding:'7px 10px', fontFamily:'Outfit,sans-serif' }}>
              Keluar
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:10, paddingLeft:10, borderLeft:`1px solid ${C.border}`, cursor:'pointer' }} onClick={()=>setNav('settings')}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:`linear-gradient(135deg,${C.coral},${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:'#fff', flexShrink:0 }}>A</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color: C.light, lineHeight:1.2 }}>{account?.email?.split('@')[0] ?? 'Account'}</div>
                <div style={{ fontSize:10, color: C.muted, lineHeight:1 }}>{account?.tier ?? 'IoT workspace'}</div>
              </div>
            </div>
          </div>
        </header>

        <main style={{ flex:1, overflowY:'auto', padding:22 }}>
          {nav === 'home'        && <HomeView project={activeProject} account={account} onNavigate={key => setNav(key)} />}
          {nav === 'dashboard'   && <DashboardView project={activeProject} />}
          {nav === 'sensors'     && <SensorManagementView project={activeProject} onNavigate={key => setNav(key)} />}
          {nav === 'devices'     && <WorkspaceDevicesView project={activeProject} />}
          {nav === 'automations' && <AlertView project={activeProject} onNavigate={key => setNav(key)} />}
          {nav === 'users'       && <MembersView project={activeProject} accountId={account?.id} />}
          {nav === 'analytics'   && <AnalyticsView project={activeProject} onNavigate={key => setNav(key)} />}
          {nav === 'gateway'     && <GatewayView project={activeProject} onNavigate={key => setNav(key)} />}
          {nav === 'aiml'        && <AimlView onNavigate={key => setNav(key)} />}
          {nav === 'settings'    && <SettingsView />}
          {nav === 'admin'       && <Empty title="Panel administrasi" text="Akses administrasi global tidak diaktifkan pada workspace pengguna." />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppearanceProvider>
      <AppShell />
    </AppearanceProvider>
  )
}
