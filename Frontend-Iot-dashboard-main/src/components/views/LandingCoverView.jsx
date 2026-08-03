import { useState } from "react";
import {
  Zap, ShieldCheck, Cpu, ArrowRight, Layers, Radio, Activity,
  Globe, Sparkles, CheckCircle2, Server, Lock, Play, ChevronRight
} from "lucide-react";
import LoginModal from "../LoginModal";

function LandingCoverView({ onEnterConsole, onOpenLogin, isLoginOpen, onLoginSuccess, onCloseLogin }) {
  return (
    <div className="landing-cover-container">
      {/* ── LANDING NAVBAR ── */}
      <header className="landing-header">
        <div className="landing-brand" onClick={onEnterConsole} style={{ cursor: "pointer" }}>
          <div className="landing-logo-icon">B</div>
          <span className="landing-logo-text">
            Blynk<span className="logo-dot">.io</span>
          </span>
          <span className="landing-badge">TIP PLATFORM</span>
        </div>

        <nav className="landing-nav-links">
          <a href="#platform" className="landing-nav-link">Platform</a>
          <a href="#solutions" className="landing-nav-link">Solutions</a>
          <a href="#enterprise" className="landing-nav-link">Enterprise</a>
          <a href="#developers" className="landing-nav-link">Developers</a>
          <a href="#pricing" className="landing-nav-link">Pricing</a>
        </nav>

        <div className="landing-header-actions">
          <button type="button" className="landing-btn-login" onClick={onOpenLogin}>
            Log In
          </button>
          <button type="button" className="landing-btn-signup" onClick={onOpenLogin}>
            Sign Up <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="landing-hero-section">
        <div className="landing-hero-pill">
          <Sparkles size={14} style={{ color: "#22C55E" }} />
          <span>LOW-CODE IOT PLATFORM FOR ENTERPRISE & DEVELOPERS</span>
        </div>

        <h1 className="landing-hero-title">
          LAUNCH CONNECTED PRODUCTS WITH LOW-CODE SPEED AND CUSTOM-BUILT QUALITY
        </h1>

        <p className="landing-hero-subtitle">
          Platform IoT terintegrasi penuh untuk pengumpulan data sensor (HTTP, MQTT, CoAP),
          visualisasi kustom drag-and-drop, alert engine terotomatisasi, dan analitik AI ONNX.
        </p>

        <div className="landing-hero-ctas">
          <button type="button" className="landing-cta-primary" onClick={onEnterConsole}>
            Enter Console Workspace <ArrowRight size={18} />
          </button>
          <button type="button" className="landing-cta-secondary" onClick={onOpenLogin}>
            <Play size={16} fill="currentColor" /> Watch Quickstart Video
          </button>
        </div>

        {/* Hero Feature Badges */}
        <div className="landing-hero-stats">
          <div className="landing-stat-card">
            <span className="stat-number">10M+</span>
            <span className="stat-label">Connected Devices</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat-card">
            <span className="stat-number">3 Protocols</span>
            <span className="stat-label">HTTP • MQTT • CoAP</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat-card">
            <span className="stat-number">99.99%</span>
            <span className="stat-label">High Availability</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat-card">
            <span className="stat-number">&lt; 10ms</span>
            <span className="stat-label">Alert Engine Latency</span>
          </div>
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHTS GRID ── */}
      <section className="landing-features-section" id="platform">
        <div className="section-header-center">
          <h2>Empowering Full IoT Product Lifecycle</h2>
          <p>Dari prototipe perangkat hingga deployment skala staging & produksi enterprise</p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="feature-icon-box" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#22C55E" }}>
              <Radio size={24} />
            </div>
            <h3>Multi-Protocol Ingestion</h3>
            <p>Dukung HTTP REST API, Aedes MQTT Broker, dan CoAP UDP Server dengan validasi Ajv schema otomatis.</p>
            <div className="feature-chip">Modul B Protocol Gateway</div>
          </div>

          <div className="landing-feature-card">
            <div className="feature-icon-box" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>
              <Layers size={24} />
            </div>
            <h3>Dynamic Bento Canvas</h3>
            <p>Bangun dashboard interaktif kustom dari canvas kosong dengan drag-and-drop widget box seperti Blynk Console.</p>
            <div className="feature-chip">Modul C Visual Dashboard</div>
          </div>

          <div className="landing-feature-card">
            <div className="feature-icon-box" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
              <Zap size={24} />
            </div>
            <h3>Automations & Alert Engine</h3>
            <p>Evaluasi threshold real-time dengan Redis anti-spam cooldown dan immutable audit history bertipe JSONB.</p>
            <div className="feature-chip">Modul A Engine</div>
          </div>

          <div className="landing-feature-card">
            <div className="feature-icon-box" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#A855F7" }}>
              <Cpu size={24} />
            </div>
            <h3>ONNX AI Inference</h3>
            <p>Sandbox deteksi citra dan analitik time-series otomatis dengan ONNX Model Serving dalam container terisolasi.</p>
            <div className="feature-chip">Modul D AI Serving</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER BANNER ── */}
      <section className="landing-footer-cta">
        <div className="footer-cta-inner">
          <h2>Ready to Launch Your IoT Product?</h2>
          <p>Mulai bangun dashboard kustom dan sambungkan perangkat IoT Anda hari ini.</p>
          <button type="button" className="landing-cta-primary" onClick={onEnterConsole}>
            Open Blynk.Console Workspace <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* ── LOGIN / REGISTER MODAL ── */}
      {isLoginOpen && (
        <LoginModal
          onClose={onCloseLogin || (() => {})}
          onLoginSuccess={onLoginSuccess || (() => {})}
        />
      )}
    </div>
  );
}

export default LandingCoverView;
