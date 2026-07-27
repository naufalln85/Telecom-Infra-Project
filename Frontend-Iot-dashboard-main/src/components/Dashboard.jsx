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
import SensorsView from "./views/SensorsView";
import ActuatorsView from "./views/ActuatorsView";
import AnalyticsView from "./views/AnalyticsView";
import SettingsView from "./views/SettingsView";
import AlertsView from "./views/AlertsView";
import AdminPanelView from "./views/AdminPanelView";

import socket from "../socket";
import confetti from "canvas-confetti";
import {
  LayoutDashboard,
  Cpu,
  Bell,
  Search,
  Plus,
  X,
  Undo2,
  Lock,
  Unlock,
  RotateCcw,
  Zap,
  Activity,
  Layers,
  ChevronDown,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
  User,
  LogOut,
  LogIn,
  Minimize2,
  Maximize2,
  KeyRound,
  ShieldCheck,
  Sun,
  Moon
} from "lucide-react";

const COLS = 12;
const ROW_HEIGHT = 45;
const GAP = 20;
const UNDO_TIMEOUT = 6000;

const DEFAULT_SIZE = {
  status: { w: 5, h: 5 },
  gauge: { w: 3, h: 5 },
  boolean: { w: 4, h: 5 },
  chart: { w: 6, h: 6 },
  calendar: { w: 6, h: 6 },
  map: { w: 6, h: 6 },
  image: { w: 6, h: 6 },
};

const INITIAL_LAYOUT = {
  node_overview: { x: 0, y: 0, w: 5, h: 5 },
  soil_gauge: { x: 5, y: 0, w: 3, h: 5 },
  actuator_task: { x: 8, y: 0, w: 4, h: 5 },
  telemetry_chart: { x: 0, y: 5, w: 6, h: 6 },
  activity_calendar: { x: 6, y: 5, w: 6, h: 6 },
  device_map: { x: 0, y: 11, w: 6, h: 6 },
  ai_vision: { x: 6, y: 11, w: 6, h: 6 },
};

const LAYOUT_STORAGE_KEY = "tip-bento-flexible-layout-v7";

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

function buildDefaultLayout(widgetList) {
  return widgetList.map((widget, index) => {
    const preset = INITIAL_LAYOUT[widget.id];
    const size = DEFAULT_SIZE[widget.type] || { w: 4, h: 5 };

    return {
      i: widget.id,
      x: preset?.x ?? (index * 4) % COLS,
      y: preset?.y ?? Infinity,
      w: preset?.w ?? size.w,
      h: preset?.h ?? size.h,
      minW: 1,
      minH: 1,
      maxW: 12,
      maxH: 12,
    };
  });
}

function loadStoredLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Dashboard() {
  const { width, containerRef, mounted } = useContainerWidth();
  const [widgets, setWidgets] = useState(defaultWidgets);
  const [layout, setLayout] = useState(
    () => loadStoredLayout() || buildDefaultLayout(defaultWidgets)
  );

  const [activeTab, setActiveTab] = useState("dashboard");

  // Projects Management State (Multi-Tenant)
  const [projects, setProjects] = useState([
    { id: "proj-1", name: "Infra-Node-Alpha" },
    { id: "proj-2", name: "Smart-Agri-Beta" },
    { id: "proj-3", name: "Hydroponics-Node-03" }
  ]);
  const [activeProject, setActiveProject] = useState("Infra-Node-Alpha");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isEditLocked, setIsEditLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [lastRemoved, setLastRemoved] = useState(null);
  const undoTimerRef = useRef(null);

  // Authenticated User Account State (DB Schema Modul A)
  const [userAccount, setUserAccount] = useState({
    name: "Admin User",
    email: "admin@telecominfra.id",
    tier: "paid",
    isLoggedIn: true,
  });

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

  // Mouse Cursor Tracking Glow
  const [cursorPos, setCursorPos] = useState({ x: -500, y: -500 });

  const handleMouseMove = (e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });

    const cards = document.querySelectorAll(".widget-bento-card");
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  };

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

  const [searchTerm, setSearchTerm] = useState("");

  const filteredWidgets = useMemo(() => {
    return widgets.filter((w) =>
      w.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [widgets, searchTerm]);

  useEffect(() => {
    async function syncBackendData() {
      try {
        const userRes = await authAPI.getMe();
        if (userRes && userRes.email) {
          setUserAccount({
            name: userRes.email.split("@")[0] || "User",
            email: userRes.email,
            tier: userRes.tier || "free",
            isLoggedIn: true,
          });
        }
      } catch {
        // use default local user if not logged in via API
      }

      try {
        const projRes = await projectsAPI.list();
        if (projRes && projRes.data && projRes.data.length > 0) {
          const loadedProjs = projRes.data.map((p) => ({ id: p.id, name: p.name }));
          setProjects(loadedProjs);
          setActiveProject(loadedProjs[0].name);
        }
      } catch {
        // use default projects if backend not reachable
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

  const handleMinimizeWidget = (widgetId) => {
    triggerSound();
    setLayout((prev) =>
      prev.map((item) => {
        if (item.i === widgetId) {
          const isCompact = item.h <= 2;
          return { ...item, h: isCompact ? 5 : 2 };
        }
        return item;
      })
    );
  };

  const handleMaximizeWidget = (widgetId) => {
    triggerSound();
    setLayout((prev) =>
      prev.map((item) => {
        if (item.i === widgetId) {
          const isFull = item.w === 12;
          return { ...item, w: isFull ? 6 : 12 };
        }
        return item;
      })
    );
  };

  const handleCreateProject = (newProject) => {
    setProjects((prev) => [...prev, newProject]);
    setActiveProject(newProject.name);
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (projId) => {
    triggerSound();
    setProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== projId);
      if (filtered.length > 0 && activeProject === prev.find((p) => p.id === projId)?.name) {
        setActiveProject(filtered[0].name);
      }
      return filtered;
    });
  };

  const handleAddWidget = (newWidget) => {
    setWidgets((prev) => [...prev, newWidget]);
    triggerSound();
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#10B981", "#34D399", "#A7F3D0"]
    });
  };

  const handleRemoveWidget = (widgetId) => {
    triggerSound();
    const widgetToRemove = widgets.find((w) => w.id === widgetId);
    const layoutToRemove = layout.find((l) => l.i === widgetId);

    if (!widgetToRemove) return;

    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastRemoved({ widget: widgetToRemove, layoutItem: layoutToRemove });

    undoTimerRef.current = setTimeout(() => {
      setLastRemoved(null);
    }, UNDO_TIMEOUT);
  };

  const handleUndoRemove = () => {
    if (!lastRemoved) return;
    triggerSound();
    setWidgets((prev) => [...prev, lastRemoved.widget]);
    if (lastRemoved.layoutItem) {
      setLayout((prev) => [...prev, lastRemoved.layoutItem]);
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastRemoved(null);
  };

  const handleResetDefaults = () => {
    triggerSound();
    setWidgets(defaultWidgets);
    const resetLayouts = buildDefaultLayout(defaultWidgets);
    setLayout(resetLayouts);
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  };

  const handleLogout = () => {
    triggerSound();
    setUserAccount({
      name: "Guest User",
      email: "",
      tier: "free",
      isLoggedIn: false,
    });
    setShowProfileMenu(false);
  };

  const visibleLayout = useMemo(() => {
    return layout.filter((item) =>
      filteredWidgets.some((w) => w.id === item.i)
    );
  }, [layout, filteredWidgets]);

  const gridConfig = useMemo(() => ({
    cols: COLS,
    rowHeight: ROW_HEIGHT,
    margin: [GAP, GAP],
    containerPadding: [0, 0],
  }), []);

  const dragConfig = useMemo(() => ({
    enabled: !isEditLocked,
    cancel: ".no-drag",
  }), [isEditLocked]);

  const resizeConfig = useMemo(() => ({
    enabled: !isEditLocked,
    handles: ["se", "sw", "nw", "ne", "e", "w", "s", "n"],
  }), [isEditLocked]);

  return (
    <div className="app-container" onMouseMove={handleMouseMove}>
      {/* MOUSE CURSOR REAL-TIME TRACKING SPOTLIGHT GLOW */}
      <div
        className="cursor-spotlight-glow"
        style={{
          background: `radial-gradient(650px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(16, 185, 129, 0.16), transparent 80%)`,
        }}
      />

      {/* FLOATING GLASS PILL TOPBAR */}
      <header className="top-navbar-pill">
        {/* BRAND PILL CHANGED TO LOGIN TRIGGER */}
        <div
          className="brand-pill"
          onClick={() => { setIsLoginOpen(true); triggerSound(); }}
          title="Klik untuk Login / Kelola Akun"
        >
          <span className="brand-icon-emerald">
            <KeyRound size={15} />
          </span>
          <span>Login / Account</span>
        </div>

        <nav className="nav-tabs-pill">
          <button
            type="button"
            className={`nav-tab-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => { setActiveTab("dashboard"); triggerSound(); }}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </button>

          <button
            type="button"
            className={`nav-tab-item ${activeTab === "sensors" ? "active" : ""}`}
            onClick={() => { setActiveTab("sensors"); triggerSound(); }}
          >
            <Cpu size={15} />
            Sensors
          </button>

          <button
            type="button"
            className={`nav-tab-item ${activeTab === "actuators" ? "active" : ""}`}
            onClick={() => { setActiveTab("actuators"); triggerSound(); }}
          >
            <Zap size={15} />
            Actuators
          </button>

          <button
            type="button"
            className={`nav-tab-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => { setActiveTab("analytics"); triggerSound(); }}
          >
            <Activity size={15} />
            Analytics
          </button>

          <button
            type="button"
            className={`nav-tab-item ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => { setActiveTab("alerts"); triggerSound(); }}
          >
            <Zap size={15} />
            Alert Rules
          </button>

          <button
            type="button"
            className={`nav-tab-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => { setActiveTab("settings"); triggerSound(); }}
          >
            <Settings size={15} />
            Settings
          </button>

          <button
            type="button"
            className={`nav-tab-item ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => { setActiveTab("admin"); triggerSound(); }}
          >
            <ShieldCheck size={15} />
            Admin Panel
          </button>
        </nav>

        <div className="header-right-actions">
          {/* Multi-Tenant Project Selector */}
          <div
            className="project-selector-pill"
            onClick={() => { setIsProjectModalOpen(true); triggerSound(); }}
            title="Klik untuk Tambah / Hapus / Switch Project"
          >
            <Layers size={14} />
            <span>Project: {activeProject}</span>
            <ChevronDown size={14} />
          </div>

          <div className="search-box-pill">
            <Search size={14} style={{ color: "var(--emerald-mint)" }} />
            <input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="icon-btn-pill"
            onClick={() => { setIsDarkMode(!isDarkMode); triggerSound(); }}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            type="button"
            className="icon-btn-pill"
            onClick={() => { setSoundEnabled(!soundEnabled); triggerSound(); }}
            title={soundEnabled ? "Mute Audio Feedback" : "Enable Audio Feedback"}
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          <button type="button" className="icon-btn-pill" onClick={triggerSound} title="Notifications">
            <Bell size={17} />
            <span className="notification-pulse-dot" />
          </button>

          {/* User Account Avatar */}
          <div style={{ position: "relative" }}>
            {userAccount.isLoggedIn ? (
              <div
                className="avatar-pill"
                onClick={() => { setShowProfileMenu(!showProfileMenu); triggerSound(); }}
              >
                <div className="avatar-img-circle">
                  {userAccount.name ? userAccount.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="avatar-info-text">
                  <span className="avatar-name" style={{ color: "#FFFFFF" }}>{userAccount.name}</span>
                  <span className="avatar-tier-badge">{userAccount.tier} TIER</span>
                </div>
                <ChevronDown size={14} style={{ marginLeft: 4, color: "var(--emerald-mint)" }} />
              </div>
            ) : (
              <button
                type="button"
                className="btn-emerald-primary"
                onClick={() => { setIsLoginOpen(true); triggerSound(); }}
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                <LogIn size={14} />
                <span>Login Akun</span>
              </button>
            )}

            {/* Profile Dropdown */}
            {showProfileMenu && userAccount.isLoggedIn && (
              <div
                style={{
                  position: "absolute",
                  top: "120%",
                  right: 0,
                  width: 220,
                  background: "var(--emerald-dark-card)",
                  border: "1px solid var(--glass-card-border-hover)",
                  borderRadius: 20,
                  padding: 12,
                  boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
                  zIndex: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{userAccount.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{userAccount.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => { setIsLoginOpen(true); setShowProfileMenu(false); }}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "none",
                    color: "white",
                    borderRadius: 12,
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <User size={14} />
                  <span>Switch Account / Tier</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#FCA5A5",
                    borderRadius: 12,
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD TAB (KEEP GRID MOUNTED ALWAYS, TOGGLE DISPLAY TO PREVENT LAYOUT SCRAMBLING) */}
      <div style={{ display: activeTab === "dashboard" ? "block" : "none" }}>
        {/* HERO TITLE & KPI METRIC COUNTERS BAR */}
        <section className="hero-bento-header">
          <div className="hero-title-group">
            <h1 style={{ color: "#FFFFFF" }}>
              Welcome back, {userAccount.name.split(" ")[0]} 👋
              <Sparkles size={24} style={{ color: "var(--emerald-neon)", animation: "pulse 2s infinite" }} />
            </h1>
            <p>Multi-Tenant Telecom Infra Project (TIP) • Modul A/B/C/D Integrated Platform</p>
          </div>

          {/* Counter Pills */}
          <div className="kpi-counters-topbar">
            <div className="kpi-counter-item">
              <div className="kpi-icon-square">
                <Cpu size={22} />
              </div>
              <div>
                <div className="kpi-number-big" style={{ color: "#FFFFFF" }}>78</div>
                <div className="kpi-label-small">Active Sensors</div>
                <div className="kpi-progress-bar-thin">
                  <div className="kpi-progress-fill-emerald" style={{ width: "75%" }} />
                </div>
                <span className="kpi-badge-percentage">15%</span>
              </div>
            </div>

            <div className="kpi-counter-item">
              <div className="kpi-icon-square" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                <Zap size={22} />
              </div>
              <div>
                <div className="kpi-number-big" style={{ color: "#FFFFFF" }}>56</div>
                <div className="kpi-label-small">Actuator Relays</div>
                <div className="kpi-progress-bar-thin">
                  <div className="kpi-progress-fill-emerald" style={{ width: "60%", background: "#F59E0B", boxShadow: "0 0 8px #F59E0B" }} />
                </div>
                <span className="kpi-badge-percentage" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#FBBF24" }}>60%</span>
              </div>
            </div>

            <div className="kpi-counter-item">
              <div className="kpi-icon-square">
                <Activity size={22} />
              </div>
              <div>
                <div className="kpi-number-big" style={{ color: "#FFFFFF" }}>203</div>
                <div className="kpi-label-small">Telemetry Streams</div>
                <div className="kpi-progress-bar-thin">
                  <div className="kpi-progress-fill-emerald" style={{ width: "90%" }} />
                </div>
                <span className="kpi-badge-percentage">10%</span>
              </div>
            </div>

            <div className="dashboard-action-buttons">
              <button
                type="button"
                className="btn-emerald-primary"
                onClick={() => { setIsBuilderOpen(true); triggerSound(); }}
              >
                <Plus size={16} />
                Add Widget
              </button>

              <button
                type="button"
                className="btn-glass-pill"
                onClick={() => { setIsEditLocked(!isEditLocked); triggerSound(); }}
              >
                {isEditLocked ? <Lock size={15} /> : <Unlock size={15} />}
                {isEditLocked ? "Locked" : "Edit Mode"}
              </button>

              <button
                type="button"
                className="btn-glass-pill"
                onClick={handleResetDefaults}
                title="Reset layout"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* DYNAMIC REACT GRID LAYOUT */}
        <main ref={containerRef} className="dashboard-grid-container">
          {mounted && (
            <ReactGridLayout
              className="dashboard-grid-layout"
              layout={visibleLayout}
              gridConfig={gridConfig}
              dragConfig={dragConfig}
              resizeConfig={resizeConfig}
              width={width}
              onDragStop={handleLayoutChange}
              onResizeStop={handleLayoutChange}
            >
              {filteredWidgets.map((widget) => (
                <div key={widget.id} className="grid-item-wrapper">
                  {!isEditLocked && (
                    <div className="grid-item-actions">
                      <button
                        type="button"
                        className="action-icon-btn no-drag"
                        onClick={() => handleMinimizeWidget(widget.id)}
                        title="Minimize / Compact Card"
                      >
                        <Minimize2 size={13} />
                      </button>

                      <button
                        type="button"
                        className="action-icon-btn no-drag"
                        onClick={() => handleMaximizeWidget(widget.id)}
                        title="Expand / Full Width"
                      >
                        <Maximize2 size={13} />
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
                    onToggle={(newState) => {
                      triggerSound();
                      setSensorData((prev) => ({ ...prev, [widget.channel]: newState }));
                    }}
                  />
                </div>
              ))}
            </ReactGridLayout>
          )}
        </main>
      </div>

      {/* OTHER SUB-VIEWS (DYNAMIC UNMOUNT / MOUNT IS SAFE FOR NON-GRID VIEWS) */}
      {activeTab === "sensors" && <SensorsView sensorData={sensorData} />}

      {activeTab === "actuators" && (
        <ActuatorsView
          sensorData={sensorData}
          onToggle={(newState) => {
            setSensorData((prev) => ({ ...prev, pump: newState }));
          }}
        />
      )}

      {activeTab === "analytics" && <AnalyticsView history={history} />}

      {activeTab === "alerts" && <AlertsView />}

      {activeTab === "settings" && <SettingsView userAccount={userAccount} />}

      {activeTab === "admin" && <AdminPanelView userAccount={userAccount} />}

      {/* GRAFANA WIDGET BUILDER MODAL */}
      {isBuilderOpen && (
        <WidgetBuilder
          onAddWidget={handleAddWidget}
          onClose={() => setIsBuilderOpen(false)}
        />
      )}

      {/* LOGIN & REGISTER MODAL */}
      {isLoginOpen && (
        <LoginModal
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={(accountData) => {
            setUserAccount(accountData);
            triggerSound();
          }}
        />
      )}

      {/* MULTI-TENANT PROJECT MANAGEMENT MODAL */}
      {isProjectModalOpen && (
        <ProjectModal
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(projName) => {
            setActiveProject(projName);
            setIsProjectModalOpen(false);
            triggerSound();
          }}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}

      {/* UNDO TOAST FLOATING NOTIFICATION */}
      {lastRemoved && (
        <div className="undo-toast-floating">
          <span>Widget "{lastRemoved.widget.title}" dihapus.</span>
          <button type="button" className="btn-emerald-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={handleUndoRemove}>
            <Undo2 size={14} />
            Urungkan
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;