import { useState } from "react";
import { X, Lock, Mail, Shield, Sparkles, LogIn, UserPlus, AlertTriangle, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { authAPI } from "../services/api";

function LoginModal({ onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("admin@telecominfra.id");
  const [password, setPassword] = useState("password_rahasia_123");
  const [name, setName] = useState("Admin User");
  const [tier, setTier] = useState("paid");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      setError("Mohon isi semua field yang diperlukan.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        await authAPI.register(email, password, tier);
      } else {
        await authAPI.login(email, password);
      }

      const accountData = {
        name: isRegister ? name : (email.split("@")[0] || "User"),
        email: email,
        tier: tier,
        isLoggedIn: true,
      };

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10B981", "#34D399", "#A7F3D0"]
        });
      } catch { /* ignore */ }

      onLoginSuccess(accountData);
      onClose();
    } catch (err) {
      console.error("Auth action failed:", err);
      const errMsg = err.message || "Gagal memproses autentikasi.";
      if (isRegister && (errMsg.includes("already") || errMsg.includes("terdaftar") || errMsg.includes("exist") || errMsg.includes("400"))) {
        setError(`⚠️ Email "${email}" sudah terdaftar dalam sistem. Anda dapat langsung masuk dengan password akun Anda.`);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-blur" onClick={onClose}>
      <div className="widget-builder-dialog" style={{ width: "min(480px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-flex">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-icon-emerald" style={{ width: 32, height: 32, fontSize: 16 }}>🌿</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                {isRegister ? "Buat Akun Platform TIP" : "Autentikasi Akun TIP"}
              </h2>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
                IoT Multi-Tenant Platform • Telecom Infra Project
              </p>
            </div>
          </div>

          <button type="button" className="action-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
          {isRegister && (
            <div className="form-group-field">
              <label>Nama Lengkap Account</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="e.g. Mahasiswa A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}

          <div className="form-group-field">
            <label>Email Account (Tenant ID)</label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                placeholder="user@telecominfra.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div className="form-group-field">
            <label>Password Akun</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {isRegister && (
            <div className="form-group-field">
              <label>Account Tier (DB Schema Modul A)</label>
              <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: "100%" }}>
                <option value="paid">PAID TIER (Unlimited Telemetry & AI Sandbox Access)</option>
                <option value="free">FREE TIER (Standard Rate Limit)</option>
              </select>
            </div>
          )}

          {/* IN-MODAL ALERT NOTIFICATION FOR EXISTING ACCOUNTS OR ERRORS */}
          {error && (
            <div className="login-modal-alert-box">
              <AlertTriangle size={18} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#FEF3C7" }}>{error}</p>
                {isRegister && error.includes("sudah terdaftar") && (
                  <button
                    type="button"
                    className="btn-switch-to-login"
                    onClick={() => { setIsRegister(false); setError(""); }}
                  >
                    Masuk ke Akun Ini <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-emerald-primary"
            disabled={loading}
            style={{ justifyContent: "center", width: "100%", marginTop: 8 }}
          >
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            <span>{loading ? "Memproses..." : isRegister ? "Daftar Akun Baru" : "Masuk ke Dashboard"}</span>
          </button>

          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--text-secondary)" }}>
            {isRegister ? "Sudah memiliki akun? " : "Belum memiliki akun? "}
            <span
              style={{ color: "var(--emerald-neon)", fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
            >
              {isRegister ? "Login di sini" : "Daftar Akun Baru"}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;
