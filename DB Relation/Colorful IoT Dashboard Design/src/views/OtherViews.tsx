import React, { useState } from "react"
import { C } from "@/lib/theme"

function LoginModal({ onClose, onLogin, onRegister }: { onClose: () => void; onLogin: (email: string, password: string) => Promise<void>; onRegister?: (email: string, password: string) => Promise<void> }) {
  const [register, setRegister] = useState(false), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [error, setError] = useState(""), [loading, setLoading] = useState(false)
  const submit = async () => {
    setError("")
    if (!email || password.length < 8) return setError("Masukkan email valid dan password minimal 8 karakter.")
    setLoading(true)
    try { if (register && onRegister) await onRegister(email, password); else await onLogin(email, password); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : "Permintaan gagal.") }
    finally { setLoading(false) }
  }
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 13px", color: "var(--c-text)", background: "var(--c-input-bg)", border: "1px solid var(--c-border)", borderRadius: 8, outline: "none" }
  return <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center", background: "rgba(0,0,0,.68)", backdropFilter: "blur(4px)" }}><div style={{ width: 390, maxWidth: "92vw", padding: 28, borderRadius: 18, background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><img src="/logo.png" alt="Yugma IoT" style={{ width: 34, height: 34, objectFit: "contain" }} /><div><b style={{ color: "var(--c-text)" }}>{register ? "Buat akun Yugma" : "Masuk ke Yugma"}</b><div style={{ color: "var(--c-muted)", fontSize: 11 }}>Akses workspace IoT Anda yang sebenarnya</div></div></div>
    {error && <div style={{ color: C.coral, fontSize: 12, marginBottom: 12 }}>{error}</div>}
    <label style={{ color: "var(--c-muted)", fontSize: 11 }}>Email<input style={{ ...input, marginTop: 6, marginBottom: 14 }} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label style={{ color: "var(--c-muted)", fontSize: 11 }}>Password<input style={{ ...input, marginTop: 6 }} type="password" autoComplete={register ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} /></label>
    <button disabled={loading} onClick={submit} style={{ width: "100%", marginTop: 20, padding: 12, border: 0, borderRadius: 9, background: `linear-gradient(135deg,${C.coral},${C.purple})`, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{loading ? "Memproses..." : register ? "Buat akun" : "Sign in"}</button>
    <p style={{ textAlign: "center", color: "var(--c-muted)", fontSize: 12 }}>{register ? "Sudah punya akun? " : "Belum punya akun? "}<button onClick={() => { setRegister(!register); setError("") }} style={{ color: C.coral, fontWeight: 700, border: 0, background: "transparent", cursor: "pointer" }}>{register ? "Masuk" : "Daftar"}</button></p>
  </div></div>
}

export function LandingPage({ isDark, onToggleTheme, onLogin, onRegister }: { isDark: boolean; onToggleTheme: () => void; onEnter: () => void; onLogin: (email: string, password: string) => Promise<void>; onRegister?: (email: string, password: string) => Promise<void> }) {
  const [showAuth, setShowAuth] = useState(false)
  return <div style={{ minHeight: "100vh", color: "var(--c-text)", background: "var(--c-bg)", fontFamily: "Outfit,sans-serif" }}>
    {showAuth && <LoginModal onClose={() => setShowAuth(false)} onLogin={onLogin} onRegister={onRegister} />}
    <nav style={{ height: 64, display: "flex", alignItems: "center", padding: "0 8vw", borderBottom: "1px solid var(--c-border)" }}><img src="/logo.png" alt="Yugma IoT" style={{ height: 32, width: 32, objectFit: "contain" }} /><b style={{ marginLeft: 9 }}>Yugma IoT</b><button onClick={onToggleTheme} style={{ marginLeft: "auto", background: "transparent", color: "var(--c-muted)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}>{isDark ? "Light" : "Dark"}</button><button onClick={() => setShowAuth(true)} style={{ marginLeft: 9, border: 0, borderRadius: 8, padding: "8px 17px", color: "#fff", fontWeight: 700, cursor: "pointer", background: `linear-gradient(135deg,${C.coral},${C.purple})` }}>Sign in</button></nav>
    <main style={{ maxWidth: 820, padding: "120px 24px", margin: "auto", textAlign: "center" }}><div style={{ color: C.coral, fontWeight: 700, fontSize: 12, letterSpacing: ".1em" }}>REAL-TIME IOT WORKSPACE</div><h1 style={{ fontSize: "clamp(38px,7vw,68px)", lineHeight: 1.05, margin: "20px 0", color: "var(--c-text)" }}>Kelola perangkat IoT Anda, per project.</h1><p style={{ maxWidth: 580, margin: "0 auto 30px", color: "var(--c-muted)", lineHeight: 1.7 }}>Mulai dari project kosong, tambahkan perangkat dan channel sendiri, kemudian undang anggota yang sudah terdaftar ke workspace Anda.</p><button onClick={() => setShowAuth(true)} style={{ border: 0, borderRadius: 10, padding: "13px 24px", color: "#fff", fontWeight: 700, cursor: "pointer", background: `linear-gradient(135deg,${C.coral},${C.purple})` }}>Buat akun atau masuk</button></main>
  </div>
}
