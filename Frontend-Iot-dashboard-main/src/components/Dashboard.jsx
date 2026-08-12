import { useEffect, useRef, useState, useCallback } from "react";
import ReactGridLayout, { useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../App.css";

import defaultWidgets from "../data/widgets.json";
import WidgetRenderer from "./WidgetRenderer";
import WidgetBuilder from "./WidgetBuilder";
import LoginModal from "./LoginModal";
import ProjectModal from "./ProjectModal";
import { authAPI, projectsAPI, gatewayAPI } from "../services/api";

// Sub-Views
import LandingCoverView from "./views/LandingCoverView";
import GetStartedView from "./views/GetStartedView";
import DevicesView from "./views/DevicesView";
import SensorsView from "./views/SensorsView";
import ActuatorsView from "./views/ActuatorsView";
import AnalyticsView from "./views/AnalyticsView";
import SettingsView from "./views/SettingsView";
import AlertsView from "./views/AlertsView";
import AdminPanelView from "./views/AdminPanelView";
import GatewayView from "./views/GatewayView";
import AIBuilderView from "./views/AIBuilderView";
import UsersView from "./views/UsersView";
import WidgetConfigModal from "./WidgetConfigModal";

import confetti from "canvas-confetti";
import {
  LayoutDashboard, Cpu, Bell, Search, Plus, X, Undo2, Lock, Unlock,
  RotateCcw, Zap, Activity, Layers, ChevronDown, Settings, Sparkles,
  Volume2, VolumeX, User, LogOut, LogIn, Minimize2, Maximize2, KeyRound,
  ShieldCheck, Sun, Moon, Radio, Star, Box, Sliders, ToggleLeft, Hash,
  MapPin, Eye, Compass, Globe, HelpCircle, Megaphone, Users, Building,
  Grid, ListFilter, Play, ArrowRight, MousePointerClick, Brain, Loader2, Table
} from "lucide-react";

const COLS = 12;
const ROW_HEIGHT = 45;
const GAP = 20;

const DEFAULT_SIZE = {
  status: { w: 4, h: 5 },
  gauge: { w: 3, h: 5 },
  boolean: { w: 4, h: 4 },
  chart: { w: 6, h: 6 },
  calendar: { w: 6, h: 5 },
  map: { w: 6, h: 6 },
  image: { w: 6, h: 6 },
  table: { w: 8, h: 7 },
  slider: { w: 4, h: 4 },
};

function playClickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio restrictions
  }
}

function Dashboard() {
  const { width, containerRef, mounted } = useContainerWidth();

  // ─── AUTH STATE MACHINE ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState(() => {
    return authAPI.isLoggedIn() ? "console" : "landing";
  });
  const [authLoading, setAuthLoading] = useState(authAPI.isLoggedIn());

  const [activeConsoleTab, setActiveConsoleTab] = useState("dashboards");

  // Authenticated User Account State — must be declared FIRST (used in storage key computation)
  const [userAccount, setUserAccount] = useState(null);

  // Projects state — starts empty, populated per-user from API
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // ── PER-USER + PER-PROJECT localStorage isolation ──
  // Keys are scoped by BOTH userId AND projectId → each account has completely separate data
  const userId = userAccount?.id || userAccount?.email || "guest";
  const projId = activeProject?.id || "default";
  const currentWidgetKey = `tip-widgets-u${userId}-p${projId}`;
  const currentLayoutKey = `tip-layout-u${userId}-p${projId}`;

  // Dashboard Canvas Widgets — Loaded per Active User + Project
  const [widgets, setWidgets] = useState([]);
  const [layout, setLayout] = useState([]);

  // Reload widgets/layout whenever active user OR project changes
  useEffect(() => {
    try {
      const rawW = localStorage.getItem(currentWidgetKey);
      const rawL = localStorage.getItem(currentLayoutKey);
      setWidgets(rawW ? JSON.parse(rawW) : []);
      setLayout(rawL ? JSON.parse(rawL) : []);
    } catch {
      setWidgets([]);
      setLayout([]);
    }
  }, [currentWidgetKey, currentLayoutKey]);

  // Persist widgets and layout scoped to current user + project
  useEffect(() => {
    if (!userAccount) return; // don't persist for unauthenticated
    try {
      localStorage.setItem(currentWidgetKey, JSON.stringify(widgets));
      localStorage.setItem(currentLayoutKey, JSON.stringify(layout));
    } catch { /* ignore */ }
  }, [widgets, layout, currentWidgetKey, currentLayoutKey, userAccount]);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [isEditLocked, setIsEditLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("tip-theme") !== "light";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove("light-mode");
      localStorage.setItem("tip-theme", "dark");
    } else {
      document.body.classList.add("light-mode");
      localStorage.setItem("tip-theme", "light");
    }
  }, [isDarkMode]);

  // Sensor data from gateway
  const [sensorData, setSensorData] = useState({});
  const [history, setHistory] = useState([]);

  // ─── FETCH REAL USER + PROJECTS FROM API (only when logged in) ───────────
  const syncBackendData = useCallback(async () => {
    if (!authAPI.isLoggedIn()) return;
    setAuthLoading(true);
    let resolvedUser = null;
    try {
      const userRes = await authAPI.getMe();
      if (userRes?.email) {
        resolvedUser = {
          id: userRes.id,
          name: userRes.email.split("@")[0],
          email: userRes.email,
          tier: userRes.tier || "free",
          isLoggedIn: true,
        };
        setUserAccount(resolvedUser);
      }
    } catch (e) {
      if (e.message.includes("401") || e.message.includes("Token")) {
        authAPI.logout();
        setViewMode("landing");
        setUserAccount(null);
        setProjects([]);
        setActiveProject(null);
        setAuthLoading(false);
        return;
      }
    }

    try {
      const projRes = await projectsAPI.list();
      if (projRes?.data?.length > 0) {
        const loaded = projRes.data.map(p => ({ id: p.id, name: p.name }));
        setProjects(loaded);
        // Always reset to first project of this user (don't carry over previous user's selection)
        setActiveProject(loaded[0]);
      } else {
        // No projects from backend — reset for clean slate per user
        setProjects([]);
        setActiveProject(null);
      }
    } catch { /* ignore */ }
    finally { setAuthLoading(false); }
  }, []);

  useEffect(() => {
    if (viewMode === "console") syncBackendData();
  }, [viewMode, syncBackendData]);

  // ─── POLL GATEWAY LOGS FOR REAL SENSOR DATA ─────────────────────
  useEffect(() => {
    if (viewMode !== "console") return;
    const poll = async () => {
      try {
        const res = await gatewayAPI.getLogs(1);
        if (res?.data?.length > 0) {
          const latest = res.data[0];
          setSensorData(prev => ({ ...prev, ...latest.data }));
          setHistory(prev => [
            ...prev.slice(-19),
            {
              time: new Date(latest.received_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              ...latest.data,
            }
          ]);
        }
      } catch { /* gateway offline */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const triggerSound = () => {
    if (soundEnabled) playClickSound();
  };

  const handleLayoutChange = (newLayout) => {
    setLayout((prevLayout) => {
      const newLayoutMap = new Map(newLayout.map((item) => [item.i, item]));
      const updatedLayout = prevLayout.map((item) => {
        if (newLayoutMap.has(item.i)) {
          return { ...item, ...newLayoutMap.get(item.i) };
        }
        return item;
      });

      const prevKeys = new Set(prevLayout.map((item) => item.i));
      const brandNew = newLayout.filter((item) => !prevKeys.has(item.i));
      return [...updatedLayout, ...brandNew];
    });
  };

  // Add widget from Widget Box
  const handleAddWidgetFromBox = (type, titlePreset, channelPreset) => {
    triggerSound();
    const id = `widget_${Date.now()}`;
    const size = DEFAULT_SIZE[type] || { w: 4, h: 5 };
    const newWidget = {
      id,
      type,
      title: titlePreset || `${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
      deviceId: "esp32-sensor-01",
      channel: channelPreset || (type === "gauge" || type === "status" || type === "chart" || type === "table" ? "temperature" : "pump"),
      unit: type === "gauge" || type === "status" || type === "chart" ? "°C" : type === "slider" ? "%" : "",
      config: type === "map" ? { latChannel: "latitude", lngChannel: "longitude" } : type === "image" ? { imageChannel: "ai_image", labelChannel: "ai_label", confidenceChannel: "ai_confidence" } : {}
    };

    setWidgets(prev => [...prev, newWidget]);
    setLayout(prev => [
      ...prev,
      {
        i: id,
        x: (prev.length * 4) % COLS,
        y: Infinity,
        w: size.w,
        h: size.h,
        minW: 2,
        minH: 2,
        maxW: 12,
        maxH: 12,
      }
    ]);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#22C55E", "#34D399", "#A7F3D0"]
    });
  };

  // Populate sample preset widgets
  const handleLoadSamplePresets = () => {
    triggerSound();
    setWidgets(defaultWidgets);
    const newLayouts = defaultWidgets.map((w, idx) => {
      const size = DEFAULT_SIZE[w.type] || { w: 4, h: 5 };
      return {
        i: w.id,
        x: (idx * 4) % COLS,
        y: Math.floor((idx * 4) / COLS) * 5,
        w: size.w,
        h: size.h,
        minW: 2,
        minH: 2,
        maxW: 12,
        maxH: 12,
      };
    });
    setLayout(newLayouts);
  };

  const handleClearAllWidgets = () => {
    triggerSound();
    setWidgets([]);
    setLayout([]);
    localStorage.removeItem(currentWidgetKey);
    localStorage.removeItem(currentLayoutKey);
  };

  const handleRemoveWidget = (widgetId) => {
    triggerSound();
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    setLayout((prev) => prev.filter((l) => l.i !== widgetId));
  };

  // Project Selection Handlers
  const handleSelectProject = (projNameOrObj) => {
    if (typeof projNameOrObj === "string") {
      const found = projects.find(p => p.name === projNameOrObj);
      if (found) setActiveProject(found);
      else setActiveProject({ id: Date.now(), name: projNameOrObj });
    } else if (projNameOrObj && projNameOrObj.id) {
      setActiveProject(projNameOrObj);
    }
    setIsProjectModalOpen(false);
  };

  const handleCreateProject = (newProj) => {
    setProjects(prev => [...prev, newProj]);
    setActiveProject(newProj);
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (projIdToDelete) => {
    setProjects(prev => prev.filter(p => p.id !== projIdToDelete));
    if (activeProject?.id === projIdToDelete) {
      const remaining = projects.filter(p => p.id !== projIdToDelete);
      setActiveProject(remaining[0] || null);
    }
  };

  // ─── AUTH GATE RENDERS ───────────────────────────────────────────────────
  if (viewMode === "landing") {
    return (
      <LandingCoverView
        onEnterConsole={() => {
          if (authAPI.isLoggedIn()) setViewMode("console");
          else setIsLoginOpen(true);
        }}
        onOpenLogin={() => setIsLoginOpen(true)}
        isLoginOpen={isLoginOpen}
        onLoginSuccess={(accountData) => {
          setUserAccount(accountData);
          setIsLoginOpen(false);
          setViewMode("console");
        }}
        onCloseLogin={() => setIsLoginOpen(false)}
      />
    );
  }

  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16, background: "var(--bg)" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Memverifikasi sesi...</p>
      </div>
    );
  }

  return (
    <div className="blynk-console-wrapper">
      {/* ── TOPBAR: BLYNK CONSOLE HEADER ── */}
      <header className="blynk-topbar">
        <div className="topbar-left">
          {/* Brand Logo */}
          <div className="blynk-brand" onClick={() => setViewMode("landing")} title="Switch to Public Cover Page">
            <div className="blynk-logo-square">Y</div>
            <span className="blynk-brand-name">
              Yugma<span className="dot">.IoT</span>
            </span>
          </div>

          {/* Organization / Project Dropdown Selector */}
          <div
            className="blynk-org-selector"
            onClick={() => setIsProjectModalOpen(true)}
            title="Switch Project Tenant"
          >
            <span>Project: {activeProject?.name || "—"}</span>
            <ChevronDown size={14} className="chevron" />
          </div>
        </div>

        <div className="topbar-right">
          <div className="blynk-message-quota-bar">
            <div className="quota-text">
              <span>Messages used:</span> <strong>0 of 100.0k</strong>
            </div>
            <div className="quota-progress-track">
              <div className="quota-progress-fill" style={{ width: "2%" }} />
            </div>
          </div>

          <button
            type="button"
            className="btn-blynk-pill-sm"
            onClick={() => setViewMode("landing")}
            title="View Public blynk.io Cover Page"
          >
            <Globe size={14} /> Landing Cover
          </button>

          <button
            type="button"
            className="blynk-icon-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            className="blynk-icon-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Audio Feedback" : "Enable Audio Feedback"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button type="button" className="blynk-icon-btn" title="Announcements & Messages">
            <Megaphone size={16} />
          </button>

          <button type="button" className="blynk-icon-btn" title="Help & Docs">
            <HelpCircle size={16} />
          </button>

          <div style={{ position: "relative" }}>
            <div className="blynk-user-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <div className="avatar-circle">
                {userAccount?.name ? userAccount.name.charAt(0).toUpperCase() : "?"}
              </div>
            </div>

            {showProfileMenu && (
              <div className="blynk-profile-dropdown">
                <div className="dropdown-header">
                  <strong>{userAccount?.name || "Guest"}</strong>
                  <span>{userAccount?.email || ""}</span>
                  {userAccount?.tier && <span style={{ fontSize: 10, background: "rgba(16,185,129,.15)", color: "var(--accent)", padding: "2px 8px", borderRadius: 8, marginTop: 4, display: "inline-block" }}>{userAccount.tier.toUpperCase()}</span>}
                </div>
                <button type="button" onClick={() => { setIsLoginOpen(true); setShowProfileMenu(false); }}>
                  <User size={14} /> Account Settings
                </button>
                <button type="button" onClick={() => { setViewMode("landing"); setShowProfileMenu(false); }}>
                  <Globe size={14} /> Public Landing Cover
                </button>
                <button type="button" className="logout-item" onClick={() => {
                  authAPI.logout();
                  setUserAccount(null);
                  setProjects([]);
                  setActiveProject(null);
                  setWidgets([]);
                  setLayout([]);
                  setShowProfileMenu(false);
                  setViewMode("landing");
                }}>
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BLYNK CONSOLE BODY: SIDEBAR + MAIN CONTENT ── */}
      <div className="blynk-console-body">
        {/* ── LEFT SIDEBAR NAVIGATION ── */}
        <aside className="blynk-sidebar">
          <div className="sidebar-nav-group">
            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "getstarted" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("getstarted"); triggerSound(); }}
            >
              <Star size={18} className="item-icon" />
              <span>Get Started</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "dashboards" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("dashboards"); triggerSound(); }}
            >
              <LayoutDashboard size={18} className="item-icon" />
              <span>Dashboards</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "customdata" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("customdata"); triggerSound(); }}
            >
              <Box size={18} className="item-icon" />
              <span>Custom Data</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "developer" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("developer"); triggerSound(); }}
            >
              <Sliders size={18} className="item-icon" />
              <span>Developer Zone</span>
            </button>

            <div className="sidebar-divider" />

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "devices" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("devices"); triggerSound(); }}
            >
              <Cpu size={18} className="item-icon" />
              <span>Devices</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "automations" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("automations"); triggerSound(); }}
            >
              <Zap size={18} className="item-icon" />
              <span>Automations</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "users" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("users"); triggerSound(); }}
            >
              <Users size={18} className="item-icon" />
              <span>Users</span>
            </button>

            <button
              type="button"
              className={`sidebar-item`}
              onClick={() => setIsProjectModalOpen(true)}
            >
              <Building size={18} className="item-icon" />
              <span>Organizations</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "gateway" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("gateway"); triggerSound(); }}
            >
              <Radio size={18} className="item-icon" />
              <span>Fleet & Gateway</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "analytics" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("analytics"); triggerSound(); }}
            >
              <Activity size={18} className="item-icon" />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              className={`sidebar-item ${activeConsoleTab === "ai-builder" ? "active" : ""}`}
              onClick={() => { setActiveConsoleTab("ai-builder"); triggerSound(); }}
            >
              <Brain size={18} className="item-icon" />
              <span>AI / ML Builder</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="blynk-main-canvas-area">
          {/* TAB 1: GET STARTED */}
          {activeConsoleTab === "getstarted" && (
            <GetStartedView
              onNavigateTab={(tab) => setActiveConsoleTab(tab)}
              userAccount={userAccount}
            />
          )}

          {/* TAB 2: DASHBOARDS */}
          {activeConsoleTab === "dashboards" && (
            <div className="blynk-dashboard-builder-view">
              <div className="dashboard-toolbar-bar">
                <div className="toolbar-left-info">
                  <h2>{activeProject?.name || "My Dashboard"}</h2>
                  <span className="widget-count-chip">{widgets.length} Widgets • Project #{projId}</span>
                </div>

                <div className="toolbar-right-actions">
                  <button
                    type="button"
                    className={`btn-blynk-pill-sm ${!isEditLocked ? "active-edit" : ""}`}
                    onClick={() => { setIsEditLocked(!isEditLocked); triggerSound(); }}
                  >
                    {!isEditLocked ? <Unlock size={14} /> : <Lock size={14} />}
                    {!isEditLocked ? "Edit Mode (On)" : "Locked"}
                  </button>

                  <button
                    type="button"
                    className="btn-blynk-pill-sm"
                    onClick={handleLoadSamplePresets}
                    title="Load Sample Blueprint Widgets"
                  >
                    <Sparkles size={14} /> Load Presets
                  </button>

                  {widgets.length > 0 && (
                    <button
                      type="button"
                      className="btn-blynk-pill-sm danger"
                      onClick={handleClearAllWidgets}
                      title="Clear Canvas"
                    >
                      <RotateCcw size={14} /> Clear Canvas
                    </button>
                  )}
                </div>
              </div>

              <div className="dashboard-canvas-layout-container">
                {/* WIDGET BOX PANEL */}
                {!isEditLocked && (
                  <aside className="blynk-widget-box-panel">
                    <div className="widget-box-header">
                      <Box size={16} style={{ color: "#22C55E" }} />
                      <h3>Widget Box</h3>
                    </div>

                    <div className="widget-box-section">
                      <div className="box-section-title">Controls</div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("boolean", "Pump Switch", "pump")}
                        title="Klik untuk menambah Switch"
                      >
                        <div className="item-icon-sq"><ToggleLeft size={18} /></div>
                        <div>
                          <strong>Switch</strong>
                          <span>Digital Relay Control</span>
                        </div>
                      </div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("slider", "PWM Speed Control", "humidity")}
                        title="Klik untuk menambah Slider PWM"
                      >
                        <div className="item-icon-sq"><Sliders size={18} /></div>
                        <div>
                          <strong>Slider</strong>
                          <span>Analog PWM Controller</span>
                        </div>
                      </div>
                    </div>

                    <div className="widget-box-section" style={{ marginTop: 16 }}>
                      <div className="box-section-title">Tiles & Data Tables</div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("status", "Temperature Label", "temperature")}
                      >
                        <div className="item-icon-sq"><Hash size={18} /></div>
                        <div>
                          <strong>Label Tile</strong>
                          <span>Single Metric Display</span>
                        </div>
                      </div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("gauge", "Soil Moisture Ring", "humidity")}
                      >
                        <div className="item-icon-sq"><Activity size={18} /></div>
                        <div>
                          <strong>Gauge</strong>
                          <span>Speedometer Gauge</span>
                        </div>
                      </div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("chart", "Telemetry History", "temperature")}
                      >
                        <div className="item-icon-sq"><Activity size={18} /></div>
                        <div>
                          <strong>Chart</strong>
                          <span>Line Chart Stream</span>
                        </div>
                      </div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("table", "Sensor Telemetry Table", "temperature")}
                        title="Klik untuk menambah Tabel Telemetri Log"
                      >
                        <div className="item-icon-sq"><Table size={18} /></div>
                        <div>
                          <strong>Sensor Table</strong>
                          <span>Live Telemetry Records</span>
                        </div>
                      </div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("map", "Node Location", "latitude")}
                      >
                        <div className="item-icon-sq"><MapPin size={18} /></div>
                        <div>
                          <strong>Map</strong>
                          <span>GPS Leaflet Locator</span>
                        </div>
                      </div>

                      <div
                        className="widget-box-item"
                        onClick={() => handleAddWidgetFromBox("image", "AI Camera Stream", "ai_image")}
                      >
                        <div className="item-icon-sq"><Eye size={18} /></div>
                        <div>
                          <strong>Image Feed</strong>
                          <span>AI Camera Feed</span>
                        </div>
                      </div>
                    </div>
                  </aside>
                )}

                {/* MAIN GRID CANVAS */}
                <div ref={containerRef} className="canvas-grid-viewport">
                  {widgets.length === 0 ? (
                    <div className="blynk-empty-canvas-placeholder">
                      <div className="empty-dashed-box">
                        <MousePointerClick size={44} className="empty-icon" />
                        <h3>Add new widget to "{activeProject?.name}"</h3>
                        <p>Klik widget di sebelah kiri untuk menambahkannya ke kanvas project ini</p>
                        <button type="button" className="btn-blynk-green-action" style={{ marginTop: 16 }} onClick={handleLoadSamplePresets}>
                          <Sparkles size={16} /> Load Sample Widgets
                        </button>
                      </div>
                    </div>
                  ) : (
                    mounted && (
                      <ReactGridLayout
                        className="dashboard-grid-layout"
                        layout={layout}
                        cols={COLS}
                        rowHeight={ROW_HEIGHT}
                        margin={[GAP, GAP]}
                        containerPadding={[0, 0]}
                        isDraggable={!isEditLocked}
                        isResizable={!isEditLocked}
                        width={width}
                        onDragStop={handleLayoutChange}
                        onResizeStop={handleLayoutChange}
                      >
                        {widgets.map((widget) => (
                          <div key={widget.id} className="grid-item-wrapper">
                            {!isEditLocked && (
                              <div className="grid-item-actions">
                                <button
                                  type="button"
                                  className="action-icon-btn edit-btn no-drag"
                                  onClick={() => setEditingWidget(widget)}
                                  title={`Settings for ${widget.title}`}
                                  style={{ background: "rgba(16,185,129,.2)", color: "#10B981", marginRight: 4 }}
                                >
                                  <Settings size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn delete-btn no-drag"
                                  onClick={() => handleRemoveWidget(widget.id)}
                                  title={`Remove ${widget.title}`}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            )}

                            <WidgetRenderer
                              widget={widget}
                              sensorData={sensorData}
                              history={history}
                              onToggle={(ch, val) => {
                                setSensorData(prev => ({ ...prev, [ch]: val !== undefined ? val : !prev[ch] }));
                              }}
                            />
                          </div>
                        ))}
                      </ReactGridLayout>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM DATA */}
          {activeConsoleTab === "customdata" && <SensorsView sensorData={sensorData} />}

          {/* TAB 4: DEVELOPER ZONE */}
          {activeConsoleTab === "developer" && <AdminPanelView userAccount={userAccount} />}

          {/* TAB 5: DEVICES */}
          {activeConsoleTab === "devices" && (
            <DevicesView
              activeProjectId={activeProject?.id}
              onSelectDevice={() => setActiveConsoleTab("customdata")}
            />
          )}

          {/* TAB 6: AUTOMATIONS / ALERT ENGINE */}
          {activeConsoleTab === "automations" && (
            <AlertsView activeProject={activeProject} />
          )}

          {/* TAB 7: USERS & TEAMS */}
          {activeConsoleTab === "users" && (
            <UsersView activeProject={activeProject} userAccount={userAccount} />
          )}

          {/* TAB 8: GATEWAY & FLEET */}
          {activeConsoleTab === "gateway" && <GatewayView />}

          {/* TAB 9: ANALYTICS */}
          {activeConsoleTab === "analytics" && <AnalyticsView history={history} />}

          {/* TAB 10: AI / ML BUILDER */}
          {activeConsoleTab === "ai-builder" && (
            <AIBuilderView activeProject={activeProject} />
          )}
        </main>
      </div>

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <LoginModal
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={(accountData) => {
            setUserAccount(accountData);
            setIsLoginOpen(false);
            setViewMode("console");
          }}
        />
      )}

      {/* PROJECT MANAGER MODAL */}
      {isProjectModalOpen && (
        <ProjectModal
          projects={projects}
          activeProject={activeProject}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}

      {/* WIDGET CONFIG MODAL */}
      {editingWidget && (
        <WidgetConfigModal
          widget={editingWidget}
          activeProjectId={activeProject?.id}
          onClose={() => setEditingWidget(null)}
          onSave={(updatedWidget) => {
            setWidgets(prev => prev.map(w => w.id === updatedWidget.id ? updatedWidget : w));
            setEditingWidget(null);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
