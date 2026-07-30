import { useState } from "react";
import {
  Box, Repeat, Layout, Users, Play, CheckCircle2, Circle, ArrowRight,
  Sparkles, Database, ShieldCheck, Cpu, RefreshCw
} from "lucide-react";
import confetti from "canvas-confetti";
import { dashboardAPI } from "../../services/api";

function GetStartedView({ onNavigateTab, userAccount }) {
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [checklist, setChecklist] = useState({
    intro: true,
    template: true,
    device: true,
    dashboard: false,
    app: false
  });

  const handleToggleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSeedData = async () => {
    setLoadingSeed(true);
    try {
      await dashboardAPI.seedMock();
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#22C55E", "#34D399", "#A7F3D0"]
      });
    } catch {
      // fallback
    } finally {
      setLoadingSeed(false);
    }
  };

  const userName = userAccount?.name || "naufal";

  return (
    <div className="blynk-getstarted-container">
      {/* LEFT MAIN AREA */}
      <div className="blynk-getstarted-main">
        <h1 className="blynk-page-title">
          Get Started With Blynk 🚀
        </h1>

        {/* PLAN DETAILS METRIC BAR */}
        <div className="blynk-plan-details-grid">
          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Box size={18} /></div>
            <div>
              <div className="plan-detail-val">1/5</div>
              <div className="plan-detail-lbl">Devices</div>
            </div>
          </div>

          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Repeat size={18} /></div>
            <div>
              <div className="plan-detail-val">0/100000</div>
              <div className="plan-detail-lbl">Device messages</div>
            </div>
          </div>

          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Layout size={18} /></div>
            <div>
              <div className="plan-detail-val">1/10</div>
              <div className="plan-detail-lbl">Templates created</div>
            </div>
          </div>

          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Users size={18} /></div>
            <div>
              <div className="plan-detail-val">1/1</div>
              <div className="plan-detail-lbl">Team members</div>
            </div>
          </div>
        </div>

        {/* SUGGESTED FOR YOU CARDS */}
        <div className="blynk-suggested-section">
          <h3 className="section-subtitle">SUGGESTED FOR YOU</h3>

          <div className="blynk-suggested-grid">
            {/* Card 1 */}
            <div className="blynk-card-item">
              <div className="card-illustration-box img-blueprints" />
              <div className="card-body-content">
                <h4>Create your app in minutes with Blueprints</h4>
                <p>Use a pre-built template with all the essentials to get your device up and running instantly.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("dashboards")}>
                  View Blueprints
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="blynk-card-item">
              <div className="card-illustration-box img-customize" />
              <div className="card-body-content">
                <h4>Customize your app's look and feel</h4>
                <p>Skip the time-consuming app review process and customize your app with no coding required.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("dashboards")}>
                  Learn More <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Card 3 */}
            <div className="blynk-card-item">
              <div className="card-illustration-box img-automations" />
              <div className="card-body-content">
                <h4>No-code automations</h4>
                <p>Automate device actions, alerts, and conditions without writing extra code—across your IoT ecosystem.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("automations")}>
                  Try Now
                </button>
              </div>
            </div>

            {/* Card 4 */}
            <div className="blynk-card-item">
              <div className="card-illustration-box img-notifications" />
              <div className="card-body-content">
                <h4>Events, alert notifications</h4>
                <p>Track important events, receive real-time alerts, and send automated notifications for your devices.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("automations")}>
                  Learn More <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STAGING QUICK START HELPER */}
        <div className="blynk-staging-banner">
          <div>
            <h4 style={{ margin: 0, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={18} style={{ color: "#22C55E" }} /> Staging & Real Data Readiness
            </h4>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              Ingin menguji skema PostgreSQL, Redis cooldown, dan IoT Protocol Gateway (HTTP, MQTT, CoAP)?
            </p>
          </div>
          <button type="button" className="btn-blynk-primary" onClick={handleSeedData} disabled={loadingSeed}>
            <RefreshCw size={14} className={loadingSeed ? "spin" : ""} />
            {loadingSeed ? "Seeding Data..." : "Seed Staging Test Data"}
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR CHECKLIST (Matching Image 1) */}
      <div className="blynk-getstarted-sidebar">
        <div className="blynk-welcome-card">
          <div className="welcome-card-header">
            <h3>Welcome, {userName}</h3>
            <p>Here's a quick checklist to get you up to speed with Blynk Platform:</p>
          </div>

          <div className="checklist-items">
            {/* Checklist Item 1 */}
            <div className="checklist-item-row" onClick={() => handleToggleCheck("intro")}>
              <div className="item-checkbox">
                {checklist.intro ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.intro ? "completed" : ""}`}>Intro to Blynk</span>
                <div className="video-thumbnail-card">
                  <div className="play-button-overlay">
                    <Play size={20} fill="#FFFFFF" color="#FFFFFF" />
                  </div>
                  <div className="video-text">
                    <strong>Blynk Onboarding #1: Welcome</strong>
                    <span>Watch platform video to quickly understand Blynk</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist Item 2 */}
            <div className="checklist-item-row" onClick={() => handleToggleCheck("template")}>
              <div className="item-checkbox">
                {checklist.template ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.template ? "completed" : ""}`}>Add template or blueprint</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>

            {/* Checklist Item 3 */}
            <div className="checklist-item-row" onClick={() => handleToggleCheck("device")}>
              <div className="item-checkbox">
                {checklist.device ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.device ? "completed" : ""}`}>Connect first device</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>

            {/* Checklist Item 4 */}
            <div className="checklist-item-row" onClick={() => { handleToggleCheck("dashboard"); onNavigateTab("dashboards"); }}>
              <div className="item-checkbox">
                {checklist.dashboard ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.dashboard ? "completed" : ""}`}>Build a dashboard</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>

            {/* Checklist Item 5 */}
            <div className="checklist-item-row" onClick={() => handleToggleCheck("app")}>
              <div className="item-checkbox">
                {checklist.app ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.app ? "completed" : ""}`}>Download Blynk App</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GetStartedView;
