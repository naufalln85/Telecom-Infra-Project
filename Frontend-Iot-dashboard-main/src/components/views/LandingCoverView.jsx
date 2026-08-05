import { useState, useEffect, useRef } from "react";
import {
  Zap, ShieldCheck, Cpu, ArrowRight, Layers, Radio, Activity,
  Globe, Sparkles, CheckCircle2, Server, Lock, Play, ChevronRight,
  Wifi, BarChart3, BrainCircuit, Bell, Users, Code2
} from "lucide-react";
import LoginModal from "../LoginModal";

// ── Animated number counter ──────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasRun.current) {
        hasRun.current = true;
        const start = performance.now();
        const animate = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function LandingCoverView({ onEnterConsole, onOpenLogin, isLoginOpen, onLoginSuccess, onCloseLogin }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: <Radio size={26} />,
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
      title: "Multi-Protocol Ingestion",
      desc: "HTTP REST API, MQTT Broker, dan CoAP UDP — tiga protokol terintegrasi dalam satu gateway dengan validasi schema otomatis.",
      chip: "HTTP • MQTT • CoAP",
    },
    {
      icon: <Layers size={26} />,
      color: "#6366F1",
      bg: "rgba(99, 102, 241, 0.12)",
      title: "Bento Canvas Dashboard",
      desc: "Bangun dashboard interaktif kustom dengan drag-and-drop widget: gauge, chart, switch, slider, tabel sensor, dan lebih banyak lagi.",
      chip: "Drag & Drop Builder",
    },
    {
      icon: <Zap size={26} />,
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
      title: "Automation & Alert Engine",
      desc: "Rule-based triggers real-time dengan cooldown Redis, notifikasi Telegram/Webhook, dan audit history JSONB lengkap.",
      chip: "Real-Time Rules",
    },
    {
      icon: <BrainCircuit size={26} />,
      color: "#A855F7",
      bg: "rgba(168, 85, 247, 0.12)",
      title: "AI / ML Builder",
      desc: "Jalankan preset model anomaly detection, trend forecasting, dan soil analysis — atau buat custom model Python sendiri.",
      chip: "ONNX Inference",
    },
    {
      icon: <BarChart3 size={26} />,
      color: "#06B6D4",
      bg: "rgba(6, 182, 212, 0.12)",
      title: "Advanced Analytics",
      desc: "Visualisasi data historis multi-channel dengan chart interaktif, perbandingan tren, dan export laporan otomatis.",
      chip: "Time-Series Charts",
    },
    {
      icon: <ShieldCheck size={26} />,
      color: "#FB7185",
      bg: "rgba(251, 113, 133, 0.12)",
      title: "Enterprise Security",
      desc: "JWT authentication, role-based access control, project isolation per akun, dan encrypted API key management.",
      chip: "JWT + RBAC",
    },
  ];

  return (
    <div className="lc-wrapper">
      {/* ── Animated Mesh Background Orbs ── */}
      <div className="lc-bg-orbs" aria-hidden="true">
        <div className="lc-orb lc-orb-1" />
        <div className="lc-orb lc-orb-2" />
        <div className="lc-orb lc-orb-3" />
        <div className="lc-grid-lines" />
      </div>

      {/* ── NAVBAR ── */}
      <header className={`lc-navbar ${scrolled ? "lc-navbar--scrolled" : ""}`}>
        <div className="lc-navbar-inner">
          <div className="lc-brand" onClick={onEnterConsole}>
            <div className="lc-brand-icon">
              <Wifi size={16} />
            </div>
            <span className="lc-brand-name">
              Blynk<span className="lc-brand-dot">.io</span>
            </span>
            <span className="lc-brand-badge">TIP PLATFORM</span>
          </div>

          <nav className="lc-nav-links" aria-label="Main navigation">
            <a href="#platform" className="lc-nav-link">Platform</a>
            <a href="#features" className="lc-nav-link">Features</a>
            <a href="#protocols" className="lc-nav-link">Protocols</a>
            <a href="#enterprise" className="lc-nav-link">Enterprise</a>
          </nav>

          <div className="lc-nav-actions">
            <button type="button" className="lc-btn-ghost" onClick={onOpenLogin}>
              Log In
            </button>
            <button type="button" className="lc-btn-primary" onClick={onOpenLogin}>
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lc-hero" id="platform">
        <div className="lc-hero-inner">
          <div className="lc-hero-pill">
            <Sparkles size={13} />
            <span>Low-Code IoT Platform for Enterprise &amp; Developers</span>
          </div>

          <h1 className="lc-hero-title">
            Connect, Monitor &amp; Control
            <br />
            <span className="lc-hero-title-accent">Any IoT Device</span>
            <br />
            at Scale
          </h1>

          <p className="lc-hero-subtitle">
            Platform IoT terintegrasi penuh — dari ingestion multi-protokol, visualisasi bento canvas,
            automation engine, hingga AI/ML inference dalam satu workspace terpadu.
          </p>

          <div className="lc-hero-ctas">
            <button type="button" className="lc-cta-primary" onClick={onEnterConsole}>
              <span>Enter Console</span>
              <ArrowRight size={18} />
            </button>
            <button type="button" className="lc-cta-secondary" onClick={onOpenLogin}>
              <div className="lc-play-icon">
                <Play size={14} fill="currentColor" />
              </div>
              Create Free Account
            </button>
          </div>

          {/* ── Stats Banner ── */}
          <div className="lc-stats-row" id="protocols">
            {[
              { value: 10, suffix: "M+", label: "Connected Devices" },
              { value: 3, suffix: " Protocols", label: "HTTP · MQTT · CoAP" },
              { value: 99, suffix: ".99%", label: "Uptime SLA" },
              { value: 10, suffix: "ms", label: "Alert Latency" },
            ].map((s, i) => (
              <div key={i} className="lc-stat-item">
                <div className="lc-stat-number">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="lc-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Protocol Badges ── */}
          <div className="lc-protocol-badges">
            {["ESP32", "Arduino", "Raspberry Pi", "STM32", "LoRa WAN", "Zigbee", "Modbus RTU"].map((p) => (
              <span key={p} className="lc-proto-badge">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="lc-features" id="features">
        <div className="lc-section-header">
          <div className="lc-section-pill">
            <Layers size={13} />
            <span>FULL IOT LIFECYCLE</span>
          </div>
          <h2 className="lc-section-title">Everything You Need to Build IoT Products</h2>
          <p className="lc-section-subtitle">
            Dari perangkat keras ke cloud — satu platform yang menutup semua kebutuhan pengembangan IoT modern.
          </p>
        </div>

        <div className="lc-features-grid">
          {features.map((f, i) => (
            <div
              key={i}
              className="lc-feature-card"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="lc-feature-icon" style={{ background: f.bg, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="lc-feature-title">{f.title}</h3>
              <p className="lc-feature-desc">{f.desc}</p>
              <div className="lc-feature-chip" style={{ borderColor: f.color, color: f.color, background: f.bg }}>
                {f.chip}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lc-how-it-works" id="enterprise">
        <div className="lc-section-header">
          <div className="lc-section-pill">
            <Code2 size={13} />
            <span>HOW IT WORKS</span>
          </div>
          <h2 className="lc-section-title">Deploy IoT in 3 Steps</h2>
        </div>

        <div className="lc-steps-row">
          {[
            {
              step: "01",
              icon: <Server size={24} />,
              title: "Connect Device",
              desc: "Flash kode ESP32 yang di-generate otomatis — pilih HTTP, MQTT, atau CoAP. Device langsung terhubung.",
              color: "#10B981",
            },
            {
              step: "02",
              icon: <Layers size={24} />,
              title: "Build Dashboard",
              desc: "Drag widget ke canvas — gauge, chart, switch, slider. Kustomisasi tampilan sesuai kebutuhan.",
              color: "#6366F1",
            },
            {
              step: "03",
              icon: <Bell size={24} />,
              title: "Set Automations",
              desc: "Buat rules threshold, hubungkan notifikasi Telegram/Webhook, dan jalankan AI model analitik.",
              color: "#F59E0B",
            },
          ].map((s, i) => (
            <div key={i} className="lc-step-card">
              <div className="lc-step-number" style={{ color: s.color }}>{s.step}</div>
              <div className="lc-step-icon" style={{ background: `${s.color}18`, color: s.color }}>
                {s.icon}
              </div>
              <h3 className="lc-step-title">{s.title}</h3>
              <p className="lc-step-desc">{s.desc}</p>
              {i < 2 && <div className="lc-step-arrow"><ChevronRight size={20} /></div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="lc-footer-cta">
        <div className="lc-footer-cta-inner">
          <div className="lc-footer-orb" />
          <Sparkles size={32} style={{ color: "#10B981", marginBottom: 16 }} />
          <h2 className="lc-footer-title">Ready to Launch Your IoT Product?</h2>
          <p className="lc-footer-subtitle">
            Mulai gratis — tidak perlu kartu kredit. Connect device pertama Anda dalam 5 menit.
          </p>
          <div className="lc-footer-actions">
            <button type="button" className="lc-cta-primary" onClick={onEnterConsole}>
              Open Console Workspace <ChevronRight size={18} />
            </button>
            <button type="button" className="lc-cta-secondary" onClick={onOpenLogin}>
              Create Account <ArrowRight size={16} />
            </button>
          </div>
          <div className="lc-footer-trust">
            {[
              <><CheckCircle2 size={14} /> No credit card required</>,
              <><ShieldCheck size={14} /> SOC 2 compliant</>,
              <><Lock size={14} /> End-to-end encrypted</>,
              <><Users size={14} /> 150k+ developers</>,
            ].map((item, i) => (
              <span key={i} className="lc-trust-item">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOGIN MODAL ── */}
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
