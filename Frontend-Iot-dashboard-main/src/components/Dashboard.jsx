import { useEffect, useRef, useState, useMemo } from "react";
import ReactGridLayout, { useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../App.css";

import defaultWidgets from "../data/widgets.json";
import WidgetRenderer from "./WidgetRenderer";
import WidgetBuilder from "./WidgetBuilder";
import LoginModal from "./LoginModal";
import ProjectModal from "./ProjectModal";
import { authAPI, projectsAPI, dashboardAPI } from "../services/api";

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

import socket from "../socket";
import confetti from "canvas-confetti";
import {
  LayoutDashboard, Cpu, Bell, Search, Plus, X, Undo2, Lock, Unlock,
  RotateCcw, Zap, Activity, Layers, ChevronDown, Settings, Sparkles,
  Volume2, VolumeX, User, LogOut, LogIn, Minimize2, Maximize2, KeyRound,
  ShieldCheck, Sun, Moon, Radio, Star, Box, Sliders, ToggleLeft, Hash,
  MapPin, Eye, Compass, Globe, HelpCircle, Megaphone, Users, Building,
  Grid, ListFilter, Play, ArrowRight, MousePointerClick
} from "lucide-react";

const COLS = 12;
const ROW_HEIGHT = 45;
const GAP = 20;
const UNDO_TIMEOUT = 6000;
const WIDGETS_STORAGE_KEY = "tip-blynk-widgets-v2";
const LAYOUT_STORAGE_KEY = "tip-blynk-layout-v2";

const DEFAULT_SIZE = {
  status: { w: 4, h: 5 },
  gauge: { w: 3, h: 5 },
  boolean: { w: 4, h: 4 },
  chart: { w: 6, h: 6 },
  calendar: { w: 6, h: 5 },
  map: { w: 6, h: 6 },
  image: { w: 6, h: 6 },
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
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio restrictions
  }
}

function Dashboard() {
  const { width, containerRef, mounted } = useContainerWidth();

  // Mode: 'landing' (blynk.io public cover) vs 'console' (Blynk.Console workspace)
  const [viewMode, setViewMode] = useState("console");

  // Navigation tab in Console: 'getstarted', 'dashboards', 'customdata', 'developer', 'devices', 'automations', 'users', 'gateway', 'analytics', 'settings'
  const [activeConsoleTab, setActiveConsoleTab] = useState("dashboards");

  // Dashboard Canvas Widgets (Starts EMPTY by default!)
  const [widgets, setWidgets] = useState(() => {
    try {
      const raw = localStorage.getItem(WIDGETS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : []; // Empty canvas by default as requested!
    } catch {
      return [];
    }
  });

  const [layout, setLayout] = useState(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Projects Management State (Multi-Tenant Organizations)
  const [projects, setProjects] = useState([
    { id: 1, name: "TIP-Infra 2464XA" },
    { id: 2, name: "Smart-Agri-Beta" },
    { id: 3, name: "Hydroponics-Node-03" }
  ]);
  const [activeProject, setActiveProject] = useState("TIP-Infra 2464XA");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isEditLocked, setIsEditLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [lastRemoved, setLastRemoved] = useState(null);
  const undoTimerRef = useRef(null);

  // Authenticated User Account State
  const [userAccount, setUserAccount] = useState({
    name: "naufal",
    email: "naufal@telecominfra.id",
    tier: "paid",
    isLoggedIn: true,
  });

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("tip-theme") === "dark";
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

  // Persist widgets and layout to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
    } catch {
      // ignore
    }
  }, [widgets]);

  const [sensorData, setSensorData] = useState({
    temperature: 26.8,
    humidity: 68.4,
    pump: true,
    latitude: -6.914744,
    longitude: 107.60981,
    ai_image: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=600&q=80",
    ai_label: "Healthy Plant",
    ai_confidence: 98.6,
  });

  const [history, setHistory] = useState(() => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600 * 1000);
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: parseFloat((25 + Math.random() * 3).toFixed(1)),
        humidity: parseFloat((65 + Math.random() * 5).toFixed(1)),
      });
    }
    return data;
  });

  useEffect(() => {
    async function syncBackendData() {
      try {
        const userRes = await authAPI.getMe();
        if (userRes && userRes.email) {
          setUserAccount({
            name: userRes.email.split("@")[0] || "naufal",
            email: userRes.email,
            tier: userRes.tier || "paid",
            isLoggedIn: true,
          });
        }
      } catch {
        // default local user
      }

      try {
        const projRes = await projectsAPI.list();
        if (projRes && projRes.data && projRes.data.length > 0) {
          const loadedProjs = projRes.data.map((p) => ({ id: p.id, name: p.name }));
          setProjects(loadedProjs);
          setActiveProject(loadedProjs[0].name);
        }
      } catch {
        // default projects
      }
    }
    syncBackendData();
  }, []);

  useEffect(() => {
    socket.emit("subscribe", { deviceId: "node-01" });

    socket.on("device-data", (data) => {
      setSensorData((prev) => ({ ...prev, ...data }));
      setHistory((prev) => [
        ...prev.slice(-19),
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: data.temperature ?? prev[prev.length - 1]?.temperature,
          humidity: data.humidity ?? prev[prev.length - 1]?.humidity,
        },
      ]);
    });

    return () => {
      socket.emit("unsubscribe", { deviceId: "node-01" });
      socket.off("device-data");
    };
  }, []);

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
      const finalLayout = [...updatedLayout, ...brandNew];

      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(finalLayout));
      } catch {
        // ignore
      }

      return finalLayout;
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
      deviceId: "node-01",
      channel: channelPreset || (type === "gauge" || type === "status" || type === "chart" ? "temperature" : "pump"),
      unit: type === "gauge" || type === "status" || type === "chart" ? "°C" : "",
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

  // Populate default sample blueprint widgets
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
    localStorage.removeItem(WIDGETS_STORAGE_KEY);
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  };

  const handleRemoveWidget = (widgetId) => {
    triggerSound();
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    setLayout((prev) => prev.filter((l) => l.i !== widgetId));
  };

  // If user selected 'landing' view mode, render Public blynk.io Cover View
  if (viewMode === "landing") {
    return (
      <LandingCoverView
        onEnterConsole={() => setViewMode("console")}
        onOpenLogin={() => setIsLoginOpen(true)}
      />
    );
  }

  return (
    <div className="blynk-console-wrapper">
      {/* ── TOPBAR: BLYNK CONSOLE HEADER (Matching Image 1, 2, 3) ── */}
      <header className="blynk-topbar">
        <div className="topbar-left">
          {/* Brand Logo */}
          <div className="blynk-brand" onClick={() => setViewMode("landing")} title="Switch to Public Cover Page">
            <div className="blynk-logo-square">B</div>
            <span className="blynk-brand-name">
              Blynk<span className="dot">.Console</span>
            </span>
          </div>

          {/* Organization Dropdown Selector */}
          <div
            className="blynk-org-selector"
            onClick={() => setIsProjectModalOpen(true)}
            title="Switch Organization / Project"
          >
            <span>My organization - {activeProject}</span>
            <ChevronDown size={14} className="chevron" />
          </div>
        </div>

        <div className="topbar-right">
          {/* Message Quota Indicator (Matching Image 1, 2, 3) */}
          <div className="blynk-message-quota-bar">
            <div className="quota-text">
              <span>Messages used:</span> <strong>0 of 100.0k</strong>
            </div>
            <div className="quota-progress-track">
              <div className="quota-progress-fill" style={{ width: "2%" }} />
            </div>
          </div>

          {/* Public Cover Toggle Button */}
          <button
            type="button"
            className="btn-blynk-pill-sm"
            onClick={() => setViewMode("landing")}
            title="View Public blynk.io Cover Page"
          >
            <Globe size={14} /> Landing Cover
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="blynk-icon-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Audio Feedback Toggle */}
          <button
            type="button"
            className="blynk-icon-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Audio Feedback" : "Enable Audio Feedback"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Notifications / Announcements */}
          <button type="button" className="blynk-icon-btn" title="Announcements & Messages">
            <Megaphone size={16} />
          </button>

          <button type="button" className="blynk-icon-btn" title="Help & Docs">
            <HelpCircle size={16} />
          </button>

          {/* User Profile Avatar */}
          <div style={{ position: "relative" }}>
            <div className="blynk-user-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <div className="avatar-circle">
                {userAccount.name ? userAccount.name.charAt(0).toUpperCase() : "N"}
              </div>
            </div>

            {showProfileMenu && (
              <div className="blynk-profile-dropdown">
                <div className="dropdown-header">
                  <strong>{userAccount.name}</strong>
                  <span>{userAccount.email}</span>
                </div>
                <button type="button" onClick={() => { setIsLoginOpen(true); setShowProfileMenu(false); }}>
                  <User size={14} /> Account Settings
                </button>
                <button type="button" onClick={() => { setViewMode("landing"); setShowProfileMenu(false); }}>
                  <Globe size={14} /> Public Landing Cover
                </button>
                <button type="button" className="logout-item" onClick={() => setShowProfileMenu(false)}>
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BLYNK CONSOLE BODY: SIDEBAR + MAIN CONTENT ── */}
      <div className="blynk-console-body">
        {/* ── LEFT SIDEBAR NAVIGATION (Matching Image 1, 2, 3) ── */}
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
              <span>Predictive Analytics</span>
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

          {/* TAB 2: DASHBOARDS (MATCHING IMAGE 2) */}
          {activeConsoleTab === "dashboards" && (
            <div className="blynk-dashboard-builder-view">
              {/* DASHBOARD TOP TOOLBAR */}
              <div className="dashboard-toolbar-bar">
                <div className="toolbar-left-info">
                  <h2>My Dashboard</h2>
                  <span className="widget-count-chip">{widgets.length} Widgets</span>
                </div>

                <div className="toolbar-right-actions">
                  {/* Lock / Edit Mode Toggle */}
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

              {/* DASHBOARD BODY AREA: WIDGET BOX SIDEBAR + CANVAS */}
              <div className="dashboard-canvas-layout-container">
                {/* BLYNK WIDGET BOX PANEL (Visible in Edit Mode - Matching Image 2) */}
                {!isEditLocked && (
                  <aside className="blynk-widget-box-panel">
                    <div className="widget-box-header">
                      <Box size={16} style={{ color: "#22C55E" }} />
                      <h3>Widget Box</h3>
                    </div>

                    <div className="widget-box-section">
                      <div className="box-section-title">Controls</div>

                      {/* Switch Widget Option */}
                      <div
                        className="widget-box-item"
                        onDoubleClick={() => handleAddWidgetFromBox("boolean", "Pump Switch", "pump")}
                        onClick={() => handleAddWidgetFromBox("boolean", "Pump Switch", "pump")}
                        title="Klik atau Double Click untuk menambah Switch"
                      >
                        <div className="item-icon-sq"><ToggleLeft size={18} /></div>
                        <div>
                          <strong>Switch</strong>
                          <span>Digital On/Off Relay Control</span>
                        </div>
                      </div>

                      {/* Slider Option */}
                      <div
                        className="widget-box-item"
                        onDoubleClick={() => handleAddWidgetFromBox("gauge", "Slider Control", "humidity")}
                        onClick={() => handleAddWidgetFromBox("gauge", "Slider Control", "humidity")}
                      >
                        <div className="item-icon-sq"><Sliders size={18} /></div>
                        <div>
                          <strong>Slider</strong>
                          <span>Analog Value Controller</span>
                        </div>
                      </div>
                    </div>

                    <div className="widget-box-section" style={{ marginTop: 16 }}>
                      <div className="box-section-title">Tiles & Displays</div>

                      {/* Label Value Tile */}
                      <div
                        className="widget-box-item"
                        onDoubleClick={() => handleAddWidgetFromBox("status", "Temperature Label", "temperature")}
                        onClick={() => handleAddWidgetFromBox("status", "Temperature Label", "temperature")}
                      >
                        <div className="item-icon-sq"><Hash size={18} /></div>
                        <div>
                          <strong>Label</strong>
                          <span>Single Metric Value Display</span>
                        </div>
                      </div>

                      {/* Gauge Speedometer */}
                      <div
                        className="widget-box-item"
                        onDoubleClick={() => handleAddWidgetFromBox("gauge", "Soil Moisture Ring", "humidity")}
                        onClick={() => handleAddWidgetFromBox("gauge", "Soil Moisture Ring", "humidity")}
                      >
                        <div className="item-icon-sq"><Activity size={18} /></div>
                        <div>
                          <strong>Gauge</strong>
                          <span>Radial Speedometer Ring</span>
                        </div>
                      </div>

                      {/* Chart Option */}
                      <div
                        className="widget-box-item"
                        onDoubleClick={() => handleAddWidgetFromBox("chart", "Telemetry History", "temperature")}
                        onClick={() => handleAddWidgetFromBox("chart", "Telemetry History", "temperature")}
                      >
                        <div className="item-icon-sq"><Activity size={18} /></div>
                        <div>
                          <strong>Chart</strong>
                          <span>Historical Telemetry Line</span>
                        </div>
                      </div>

                      {/* GPS Map Option */}
                      <div
                        className="widget-box-item"
                        onDoubleClick={() => handleAddWidgetFromBox("map", "Node Location", "latitude")}
                        onClick={() => handleAddWidgetFromBox("map", "Node Location", "latitude")}
                      >
                        <div className="item-icon-sq"><MapPin size={18} /></div>
                        <div>
                          <strong>Map</strong>
                          <span>GPS Leaflet Locator</span>
                        </div>
                      </div>

                      {/* Image Camera Feed */}
                      <div
                        className="widget-box-item"
                        onDoubleClick={() => handleAddWidgetFromBox("image", "AI Camera Stream", "ai_image")}
                        onClick={() => handleAddWidgetFromBox("image", "AI Camera Stream", "ai_image")}
                      >
                        <div className="item-icon-sq"><Eye size={18} /></div>
                        <div>
                          <strong>Image Feed</strong>
                          <span>ONNX AI Camera Stream</span>
                        </div>
                      </div>
                    </div>
                  </aside>
                )}

                {/* MAIN GRID CANVAS */}
                <div ref={containerRef} className="canvas-grid-viewport">
                  {/* IF CANVAS IS EMPTY (MATCHING IMAGE 2 PLACEHOLDER) */}
                  {widgets.length === 0 ? (
                    <div className="blynk-empty-canvas-placeholder">
                      <div className="empty-dashed-box">
                        <MousePointerClick size={44} className="empty-icon" />
                        <h3>Add new widget</h3>
                        <p>Double click the widget on the left or click to add it to the canvas</p>
                        <button type="button" className="btn-blynk-green-action" style={{ marginTop: 16 }} onClick={handleLoadSamplePresets}>
                          <Sparkles size={16} /> Load Sample Widgets
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* RENDER GRID LAYOUT */
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
                              onToggle={(newState) => {
                                triggerSound();
                                setSensorData((prev) => ({ ...prev, [widget.channel]: newState }));
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

          {/* TAB 5: DEVICES (MATCHING IMAGE 3) */}
          {activeConsoleTab === "devices" && (
            <DevicesView
              activeProjectId={1}
              onSelectDevice={(device) => setActiveConsoleTab("customdata")}
            />
          )}

          {/* TAB 6: AUTOMATIONS */}
          {activeConsoleTab === "automations" && <AlertsView />}

          {/* TAB 7: USERS & TEAMS */}
          {activeConsoleTab === "users" && <SettingsView userAccount={userAccount} />}

          {/* TAB 8: GATEWAY & FLEET */}
          {activeConsoleTab === "gateway" && <GatewayView />}

          {/* TAB 9: ANALYTICS */}
          {activeConsoleTab === "analytics" && <AnalyticsView history={history} />}
        </main>
      </div>

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <LoginModal
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={(accountData) => {
            setUserAccount(accountData);
            triggerSound();
          }}
        />
      )}

      {/* PROJECT / ORGANIZATION MODAL */}
      {isProjectModalOpen && (
        <ProjectModal
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(projName) => {
            setActiveProject(projName);
            setIsProjectModalOpen(false);
            triggerSound();
          }}
          onCreateProject={(newProj) => {
            setProjects(prev => [...prev, newProj]);
            setActiveProject(newProj.name);
            setIsProjectModalOpen(false);
          }}
          onDeleteProject={(projId) => {
            setProjects(prev => prev.filter(p => p.id !== projId));
          }}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;