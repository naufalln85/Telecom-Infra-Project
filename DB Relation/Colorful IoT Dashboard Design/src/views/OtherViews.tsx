import React, { useState } from "react"
import { Icon } from "@/components/Shared"
import { C } from "@/lib/theme"

type AuthHandler = (email: string, password: string) => Promise<void>

function LoginModal({ onClose, onLogin, onRegister }: { onClose: () => void; onLogin: AuthHandler; onRegister?: AuthHandler }) {
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError("")
    if (!email || password.length < 8) return setError("Masukkan email valid dan password minimal 8 karakter.")
    setLoading(true)
    try {
      if (register && onRegister) await onRegister(email, password)
      else await onLogin(email, password)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan gagal.")
    } finally {
      setLoading(false)
    }
  }

  const input: React.CSSProperties = { width:"100%", boxSizing:"border-box", padding:"11px 13px", color:"var(--c-text)", background:"var(--c-input-bg)", border:"1px solid var(--c-border)", borderRadius:8, outline:"none", fontFamily:"Outfit,sans-serif" }
  return <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"grid", placeItems:"center", background:"rgba(0,0,0,.68)", backdropFilter:"blur(4px)" }}>
    <div onClick={event => event.stopPropagation()} style={{ width:390, maxWidth:"92vw", padding:28, borderRadius:18, background:"var(--c-surface)", border:"1px solid var(--c-border)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}><img src="/logo.png" alt="Yugma IoT" style={{ width:34, height:34, objectFit:"contain" }} /><div><b style={{ color:"var(--c-text)" }}>{register ? "Buat akun Yugma" : "Masuk ke Yugma"}</b><div style={{ color:"var(--c-muted)", fontSize:11 }}>Akses workspace IoT Anda</div></div></div>
      {error && <div style={{ color:C.coral, fontSize:12, marginBottom:12 }}>{error}</div>}
      <label style={{ color:"var(--c-muted)", fontSize:11 }}>Email<input style={{ ...input, marginTop:6, marginBottom:14 }} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label style={{ color:"var(--c-muted)", fontSize:11 }}>Password<input style={{ ...input, marginTop:6 }} type="password" autoComplete={register ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => event.key === "Enter" && submit()} /></label>
      <button disabled={loading} onClick={submit} style={{ width:"100%", marginTop:20, padding:12, border:0, borderRadius:9, background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:"#fff", fontWeight:700, cursor:"pointer" }}>{loading ? "Memproses..." : register ? "Buat akun" : "Sign in"}</button>
      <p style={{ textAlign:"center", color:"var(--c-muted)", fontSize:12 }}>{register ? "Sudah punya akun? " : "Belum punya akun? "}<button onClick={() => { setRegister(value => !value); setError("") }} style={{ color:C.coral, fontWeight:700, border:0, background:"transparent", cursor:"pointer" }}>{register ? "Masuk" : "Daftar"}</button></p>
    </div>
  </div>
}

const features = [
  { icon:"dashboard", color:C.coral, title:"Drag & Drop Dashboard", desc:"Susun canvas IoT dengan widget, grafik langsung, kontrol, dan indikator perangkat." },
  { icon:"signal", color:C.purple, title:"Real-Time Telemetry", desc:"Data MQTT, HTTP, dan CoAP tersimpan otomatis untuk pemantauan yang andal." },
  { icon:"brain", color:C.magenta, title:"AI / ML Inference", desc:"Deteksi anomali dan prediksi tren dari aliran data perangkat Anda." },
  { icon:"alerts", color:C.amber, title:"Automation Engine", desc:"Buat alert dan aksi otomatis berdasarkan kondisi telemetry." },
  { icon:"gateway", color:C.teal, title:"Multi-Protocol Gateway", desc:"Satu pintu untuk koneksi perangkat IoT dari berbagai protokol." },
  { icon:"analytics", color:C.coral, title:"Advanced Analytics", desc:"Telusuri data historis dan buat keputusan dari insight yang jelas." },
]

export function LandingPage({ isDark, onToggleTheme, onLogin, onRegister }: { isDark: boolean; onToggleTheme: () => void; onEnter: () => void; onLogin: AuthHandler; onRegister?: AuthHandler }) {
  const [showAuth, setShowAuth] = useState(false)
  const openAuth = () => setShowAuth(true)
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" })

  return <div style={{ minHeight:"100vh", color:"var(--c-text)", background:"var(--c-bg)", fontFamily:"Outfit,sans-serif", overflowX:"hidden" }}>
    {showAuth && <LoginModal onClose={() => setShowAuth(false)} onLogin={onLogin} onRegister={onRegister} />}
    <nav style={{ position:"sticky", top:0, zIndex:100, height:64, display:"flex", alignItems:"center", padding:"0 clamp(20px,5vw,40px)", background:"var(--c-surface)", borderBottom:"1px solid var(--c-border)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}><img src="/logo.png" alt="Yugma" style={{ width:32, height:32, objectFit:"contain" }} /><b style={{ fontSize:18 }}>Yugma</b><span style={{ fontSize:10, color:C.coral, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", background:`${C.coral}18`, padding:"2px 8px", borderRadius:8 }}>IoT</span></div>
      <div style={{ display:"flex", gap:24, marginLeft:40 }}>
        {[['Features','features'], ['Docs','docs'], ['Pricing','cta']].map(([label, id]) => <button key={id} onClick={() => scrollTo(id)} style={{ padding:0, border:0, background:"transparent", color:"var(--c-muted)", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>{label}</button>)}
      </div>
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}><button onClick={onToggleTheme} style={{ border:"1px solid var(--c-border)", borderRadius:8, padding:"7px 10px", background:"transparent", color:"var(--c-muted)", cursor:"pointer" }}>{isDark ? "Light" : "Dark"}</button><button onClick={openAuth} style={{ border:"1px solid var(--c-border)", borderRadius:10, padding:"8px 16px", background:"transparent", color:"var(--c-text)", cursor:"pointer", fontWeight:600 }}>Sign In</button><button onClick={openAuth} style={{ border:0, borderRadius:10, padding:"8px 16px", background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:"#fff", cursor:"pointer", fontWeight:700 }}>Enter Console →</button></div>
    </nav>
    <main style={{ maxWidth:1100, margin:"auto", padding:"0 24px" }}>
      <section style={{ textAlign:"center", padding:"82px 24px 56px" }}><div style={{ display:"inline-flex", color:C.coral, background:`${C.coral}15`, border:`1px solid ${C.coral}33`, borderRadius:24, padding:"6px 18px", fontSize:11, fontWeight:700, letterSpacing:".08em" }}>⚡ LOW-CODE IOT PLATFORM · ENTERPRISE READY</div><h1 style={{ fontSize:"clamp(36px,5vw,60px)", lineHeight:1.1, margin:"30px 0 12px" }}>Connect, Monitor & Control</h1><h1 style={{ fontSize:"clamp(36px,5vw,60px)", lineHeight:1.1, margin:"0 0 24px", background:`linear-gradient(90deg,${C.coral},${C.magenta},${C.purple})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Any IoT Device at Scale</h1><p style={{ maxWidth:560, margin:"0 auto 34px", color:"var(--c-muted)", lineHeight:1.8 }}>Yugma adalah workspace IoT terpadu untuk menghubungkan perangkat, memvisualkan data, mengatur automasi, dan membangun insight dari telemetry.</p><button onClick={openAuth} style={{ padding:"14px 30px", border:0, borderRadius:12, background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", boxShadow:`0 8px 32px ${C.coral}44` }}>Get Started Free →</button></section>
      <section style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", marginBottom:62, border:"1px solid var(--c-border)", borderRadius:16, overflow:"hidden" }}>{[['10M+','Devices Connected'],['3','Protocols Supported'],['99.99%','Uptime SLA'],['< 10ms','Alert Latency']].map(([value,label]) => <div key={label} style={{ padding:"24px 12px", textAlign:"center", background:"var(--c-surface)", borderRight:"1px solid var(--c-border)" }}><b style={{ fontSize:25 }}>{value}</b><div style={{ fontSize:11, color:"var(--c-muted)", marginTop:5 }}>{label}</div></div>)}</section>
      <section id="features" style={{ marginBottom:66 }}><header style={{ textAlign:"center", marginBottom:34 }}><div style={{ color:C.coral, fontSize:11, fontWeight:700, letterSpacing:".1em" }}>PLATFORM CAPABILITIES</div><h2 style={{ fontSize:28, margin:"10px 0" }}>Everything you need, nothing you don't</h2></header><div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:16 }}>{features.map(feature => <article key={feature.title} style={{ padding:24, background:"var(--c-surface)", border:"1px solid var(--c-border)", borderRadius:16 }}><div style={{ width:44, height:44, display:"grid", placeItems:"center", borderRadius:12, background:`${feature.color}18`, marginBottom:16 }}><Icon name={feature.icon} size={22} color={feature.color} /></div><b>{feature.title}</b><p style={{ color:"var(--c-muted)", fontSize:12, lineHeight:1.7 }}>{feature.desc}</p></article>)}</div></section>
      <section id="docs" style={{ marginBottom:66, textAlign:"center" }}><div style={{ color:C.purple, fontSize:11, fontWeight:700, letterSpacing:".1em" }}>QUICK START</div><h2 style={{ fontSize:28, margin:"10px 0 30px" }}>Up and running in under 5 minutes</h2><div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:14 }}>{[['01','Create a Project'],['02','Connect Devices'],['03','Build Your Canvas'],['04','Monitor & Automate']].map(([number,title]) => <div key={number} style={{ padding:"22px 14px", background:"var(--c-surface)", border:"1px solid var(--c-border)", borderRadius:14 }}><div style={{ width:40, height:40, borderRadius:"50%", display:"grid", placeItems:"center", margin:"0 auto 12px", color:"#fff", fontWeight:800, background:`linear-gradient(135deg,${C.coral},${C.purple})` }}>{number}</div><b style={{ fontSize:13 }}>{title}</b></div>)}</div></section>
      <section id="cta" style={{ textAlign:"center", padding:"56px 28px", marginBottom:60, borderRadius:20, background:`linear-gradient(135deg,${C.coral}18,${C.purple}18)`, border:`1px solid ${C.coral}33` }}><h2 style={{ fontSize:28, margin:"0 0 12px" }}>Ready to connect your first device?</h2><p style={{ color:"var(--c-muted)", margin:"0 0 28px" }}>Mulai membangun workspace IoT Anda sekarang.</p><button onClick={openAuth} style={{ padding:"14px 30px", border:0, borderRadius:12, background:`linear-gradient(135deg,${C.coral},${C.purple})`, color:"#fff", cursor:"pointer", fontWeight:700 }}>Start Building Now →</button></section>
    </main>
  </div>
}
