import { useState, useEffect, useCallback } from "react";
import {
  Brain, Zap, Play, Plus, Trash2, Code2, ChevronRight,
  CheckCircle2, AlertCircle, Loader2, BookOpen, Cpu,
  TrendingUp, CloudRain, Leaf, Activity, X, Copy, RefreshCw,
  Lightbulb, FlaskConical, Rocket, Lock, Eye
} from "lucide-react";
import { aiModelsAPI, devicesAPI, channelsAPI, projectsAPI, gatewayAPI } from "../../services/api";

// ─── Kode template untuk custom model ─────────────────────────────────────────
const CODE_TEMPLATES = {
  basic: `def run(data: dict) -> dict:
    """
    Model AI kustom saya.
    data: dict berisi nilai sensor, misalnya:
          { "temperature": 28.5, "humidity": 72.0, "pressure": 1013.0 }
    Return: dict berisi hasil analisis
    """
    result = {}
    
    # Ambil nilai sensor
    temp = float(data.get("temperature", 0))
    humidity = float(data.get("humidity", 0))
    
    # Logika kustom Anda di sini
    heat_index = temp + (0.33 * humidity) - 4.0
    
    result["heat_index"] = round(heat_index, 2)
    result["status"] = "Panas" if heat_index > 35 else "Nyaman"
    result["summary"] = f"Heat Index: {heat_index:.1f}°C — {result['status']}"
    
    return result`,

  classification: `def run(data: dict) -> dict:
    """
    Klasifikasi kondisi lingkungan.
    """
    temp = float(data.get("temperature", 25))
    humidity = float(data.get("humidity", 60))
    
    # Tentukan kategori
    if temp < 20 and humidity > 70:
        category = "Dingin & Lembap"
        action = "Aktifkan pemanas, pertimbangkan dehumidifier"
    elif temp > 35 and humidity < 40:
        category = "Panas & Kering"
        action = "Aktifkan AC dan humidifier"
    elif 20 <= temp <= 30 and 40 <= humidity <= 70:
        category = "Nyaman"
        action = "Kondisi optimal, tidak perlu tindakan"
    else:
        category = "Perlu Perhatian"
        action = "Pantau terus dan sesuaikan kondisi"
    
    return {
        "category": category,
        "action": action,
        "temperature": temp,
        "humidity": humidity,
        "summary": f"Kondisi: {category}"
    }`,

  statistics: `def run(data: dict) -> dict:
    """
    Analisis statistik multi-channel sensor.
    """
    values = []
    channel_stats = {}
    
    for key, val in data.items():
        try:
            v = float(val)
            values.append(v)
            channel_stats[key] = {
                "value": v,
                "normalized": round((v - 0) / 100, 3)  # normalisasi 0-100
            }
        except (ValueError, TypeError):
            pass
    
    if not values:
        return {"error": "Tidak ada data numerik yang ditemukan"}
    
    avg = sum(values) / len(values)
    min_val = min(values)
    max_val = max(values)
    
    return {
        "channels": channel_stats,
        "total_channels": len(values),
        "average": round(avg, 2),
        "min": min_val,
        "max": max_val,
        "range": round(max_val - min_val, 2),
        "summary": f"Rata-rata: {avg:.2f} | Range: {max_val - min_val:.2f}"
    }`,
};

const PRESET_ICONS = {
  preset_weather: <CloudRain size={24} />,
  preset_anomaly: <AlertCircle size={24} />,
  preset_trend: <TrendingUp size={24} />,
  preset_soil: <Leaf size={24} />,
};

const CATEGORY_COLORS = {
  classification: "#10b981",
  anomaly_detection: "#f59e0b",
  regression: "#6366f1",
  advisory: "#14b8a6",
  custom: "#8b5cf6",
};

export default function AIBuilderView({ activeProject }) {
  const [presetModels, setPresetModels] = useState([]);
  const [customModels, setCustomModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("explore"); // explore | build | run
  const [selectedModel, setSelectedModel] = useState(null);

  // Build form
  const [buildForm, setBuildForm] = useState({
    name: "",
    description: "",
    category: "custom",
    code: CODE_TEMPLATES.basic,
    required_channels: "",
  });
  const [selectedTemplate, setSelectedTemplate] = useState("basic");
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [buildSuccess, setBuildSuccess] = useState("");

  // Run panel
  const [runData, setRunData] = useState("{\n  \"temperature\": 28.5,\n  \"humidity\": 75.0\n}");
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState("");
  const [liveFromGateway, setLiveFromGateway] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await aiModelsAPI.list();
      setPresetModels(res.preset || []);
      setCustomModels(res.custom || []);
    } catch (e) {
      console.error("Failed to load models:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  // ── Fetch live data dari gateway untuk dipakai di run
  const fetchLiveData = async () => {
    try {
      const res = await gatewayAPI.getLogs(1);
      if (res.data && res.data.length > 0) {
        setRunData(JSON.stringify(res.data[0].data || {}, null, 2));
      }
    } catch (e) {
      setRunError("Tidak ada data live dari gateway saat ini.");
    }
  };

  // ── Run model
  const handleRun = async () => {
    if (!selectedModel) return;
    setRunLoading(true);
    setRunResult(null);
    setRunError("");
    try {
      const dataObj = JSON.parse(runData);
      const res = await aiModelsAPI.run(selectedModel.id, dataObj);
      setRunResult(res);
    } catch (e) {
      setRunError(e.message || "Gagal menjalankan model. Periksa format JSON input.");
    } finally {
      setRunLoading(false);
    }
  };

  // ── Build custom model
  const handleBuild = async () => {
    if (!buildForm.name.trim()) { setBuildError("Nama model harus diisi."); return; }
    if (!buildForm.code.includes("def run(")) { setBuildError("Kode harus mengandung fungsi `def run(data: dict) -> dict`."); return; }
    setBuildLoading(true);
    setBuildError("");
    setBuildSuccess("");
    try {
      const channels = buildForm.required_channels
        ? buildForm.required_channels.split(",").map(c => c.trim()).filter(Boolean)
        : [];
      await aiModelsAPI.create({
        name: buildForm.name,
        description: buildForm.description,
        category: buildForm.category,
        code: buildForm.code,
        required_channels: channels,
      });
      setBuildSuccess(`Model "${buildForm.name}" berhasil dibuat dan langsung dapat digunakan!`);
      setBuildForm({ name: "", description: "", category: "custom", code: CODE_TEMPLATES.basic, required_channels: "" });
      await loadModels();
      setTab("explore");
    } catch (e) {
      setBuildError(e.message);
    } finally {
      setBuildLoading(false);
    }
  };

  const handleSelectTemplate = (key) => {
    setSelectedTemplate(key);
    setBuildForm(f => ({ ...f, code: CODE_TEMPLATES[key] }));
  };

  const allModels = [
    ...presetModels.map(m => ({ ...m, isPreset: true })),
    ...customModels.map(m => ({ ...m, isPreset: false })),
  ];

  return (
    <div className="ai-builder-view">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="view-header">
        <div className="view-header-left">
          <Brain size={22} className="view-header-icon" />
          <div>
            <h1 className="view-title">AI / ML Builder</h1>
            <p className="view-subtitle">
              Gunakan model preset platform atau buat model kustom Anda sendiri dengan Python
            </p>
          </div>
        </div>
        <div className="ai-header-stats">
          <span className="ai-stat-badge preset">
            <Rocket size={13} /> {presetModels.length} Preset
          </span>
          <span className="ai-stat-badge custom">
            <Code2 size={13} /> {customModels.length} Kustom
          </span>
        </div>
      </div>

      {/* ── Tab Navigation ───────────────────────────────────────────────────── */}
      <div className="ai-tabs">
        {[
          { key: "explore", icon: <BookOpen size={15} />, label: "Jelajahi Model" },
          { key: "build", icon: <Code2 size={15} />, label: "Buat Model Kustom" },
          { key: "run", icon: <Play size={15} />, label: "Jalankan & Uji" },
        ].map(t => (
          <button
            key={t.key}
            className={`ai-tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: EXPLORE ─────────────────────────────────────────────────────── */}
      {tab === "explore" && (
        <div className="ai-explore">
          {loading ? (
            <div className="ai-loading">
              <Loader2 size={32} className="spin" />
              <p>Memuat model AI...</p>
            </div>
          ) : (
            <>
              {/* Preset Platform Models */}
              <div className="ai-section">
                <div className="ai-section-header">
                  <Rocket size={16} />
                  <h2>Model Preset Platform</h2>
                  <span className="ai-section-badge">Tersedia untuk semua pengguna</span>
                </div>
                <div className="ai-model-grid">
                  {presetModels.map(model => (
                    <div
                      key={model.id}
                      className={`ai-model-card preset-card ${selectedModel?.id === model.id ? "selected" : ""}`}
                      onClick={() => { setSelectedModel(model); setTab("run"); }}
                    >
                      <div className="ai-model-card-header">
                        <div className="ai-model-icon" style={{ color: CATEGORY_COLORS[model.category] || "#10b981" }}>
                          {PRESET_ICONS[model.id] || <Brain size={24} />}
                        </div>
                        <div className="ai-model-badges">
                          <span className="ai-badge" style={{ background: CATEGORY_COLORS[model.category] + "22", color: CATEGORY_COLORS[model.category] }}>
                            {model.category}
                          </span>
                          <span className="ai-badge deployed">● Deployed</span>
                        </div>
                      </div>
                      <h3 className="ai-model-name">{model.name}</h3>
                      <p className="ai-model-desc">{model.description}</p>
                      {model.required_channels?.length > 0 && (
                        <div className="ai-model-channels">
                          <span className="ai-ch-label">Channel:</span>
                          {model.required_channels.map(ch => (
                            <span key={ch} className="ai-ch-tag">{ch}</span>
                          ))}
                        </div>
                      )}
                      <button className="ai-run-btn" onClick={(e) => { e.stopPropagation(); setSelectedModel(model); setTab("run"); }}>
                        <Play size={13} /> Jalankan Model
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom User Models */}
              <div className="ai-section">
                <div className="ai-section-header">
                  <Code2 size={16} />
                  <h2>Model Kustom Anda</h2>
                  <button className="ai-create-btn" onClick={() => setTab("build")}>
                    <Plus size={14} /> Buat Model Baru
                  </button>
                </div>
                {customModels.length === 0 ? (
                  <div className="ai-empty-state">
                    <FlaskConical size={48} />
                    <h3>Belum ada model kustom</h3>
                    <p>Buat model AI/ML Anda sendiri dengan menulis fungsi Python.<br />
                      Model dapat menggunakan math, statistics, dan logika kustom apapun.</p>
                    <button className="ai-create-btn large" onClick={() => setTab("build")}>
                      <Plus size={16} /> Buat Model Kustom Pertama
                    </button>
                  </div>
                ) : (
                  <div className="ai-model-grid">
                    {customModels.map(model => (
                      <div
                        key={model.id}
                        className={`ai-model-card custom-card ${selectedModel?.id === model.id ? "selected" : ""}`}
                        onClick={() => { setSelectedModel(model); setTab("run"); }}
                      >
                        <div className="ai-model-card-header">
                          <div className="ai-model-icon" style={{ color: "#8b5cf6" }}>
                            <Code2 size={24} />
                          </div>
                          <div className="ai-model-badges">
                            <span className="ai-badge custom">{model.category}</span>
                            <span className="ai-badge deployed">● Deployed</span>
                          </div>
                        </div>
                        <h3 className="ai-model-name">{model.name}</h3>
                        <p className="ai-model-desc">{model.description || "Model kustom buatan pengguna"}</p>
                        {model.required_channels?.length > 0 && (
                          <div className="ai-model-channels">
                            <span className="ai-ch-label">Channel:</span>
                            {model.required_channels.map(ch => (
                              <span key={ch} className="ai-ch-tag">{ch}</span>
                            ))}
                          </div>
                        )}
                        <p className="ai-model-author">by {model.author} · {model.created_at ? new Date(model.created_at).toLocaleDateString("id-ID") : ""}</p>
                        <button className="ai-run-btn" onClick={(e) => { e.stopPropagation(); setSelectedModel(model); setTab("run"); }}>
                          <Play size={13} /> Jalankan
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: BUILD ───────────────────────────────────────────────────────── */}
      {tab === "build" && (
        <div className="ai-build">
          <div className="ai-build-layout">
            {/* Left: Form */}
            <div className="ai-build-form">
              <div className="ai-build-section">
                <h3><Lightbulb size={15} /> Informasi Model</h3>
                <div className="form-group">
                  <label>Nama Model *</label>
                  <input
                    className="tip-input"
                    placeholder="contoh: Kalkulator Dew Point"
                    value={buildForm.name}
                    onChange={e => setBuildForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Deskripsi</label>
                  <textarea
                    className="tip-input"
                    rows={2}
                    placeholder="Jelaskan fungsi model ini..."
                    value={buildForm.description}
                    onChange={e => setBuildForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Kategori</label>
                    <select
                      className="tip-input"
                      value={buildForm.category}
                      onChange={e => setBuildForm(f => ({ ...f, category: e.target.value }))}
                    >
                      <option value="custom">Custom</option>
                      <option value="classification">Classification</option>
                      <option value="regression">Regression</option>
                      <option value="anomaly_detection">Anomaly Detection</option>
                      <option value="advisory">Advisory</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Channel yang Dibutuhkan</label>
                    <input
                      className="tip-input"
                      placeholder="temperature, humidity"
                      value={buildForm.required_channels}
                      onChange={e => setBuildForm(f => ({ ...f, required_channels: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Template Selector */}
              <div className="ai-build-section">
                <h3><BookOpen size={15} /> Pilih Template</h3>
                <div className="ai-template-grid">
                  {[
                    { key: "basic", label: "Dasar", desc: "Heat index sederhana" },
                    { key: "classification", label: "Klasifikasi", desc: "Kategorisasi kondisi" },
                    { key: "statistics", label: "Statistik", desc: "Analisis multi-channel" },
                  ].map(t => (
                    <button
                      key={t.key}
                      className={`ai-template-btn ${selectedTemplate === t.key ? "active" : ""}`}
                      onClick={() => handleSelectTemplate(t.key)}
                    >
                      <strong>{t.label}</strong>
                      <small>{t.desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor */}
              <div className="ai-build-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3><Code2 size={15} /> Kode Python (Sandboxed)</h3>
                  <button
                    className="ai-copy-btn"
                    onClick={() => navigator.clipboard.writeText(buildForm.code)}
                  >
                    <Copy size={13} /> Salin
                  </button>
                </div>
                <div className="ai-sandbox-info">
                  <Lock size={12} />
                  Sandbox: hanya <code>math</code>, <code>statistics</code>, dan operasi dasar Python yang diizinkan.
                  Fungsi <code>run(data)</code> wajib ada dan mengembalikan dict.
                </div>
                <textarea
                  className="ai-code-editor"
                  value={buildForm.code}
                  onChange={e => setBuildForm(f => ({ ...f, code: e.target.value }))}
                  spellCheck={false}
                />
              </div>

              {buildError && <div className="ai-alert error"><AlertCircle size={15} /> {buildError}</div>}
              {buildSuccess && <div className="ai-alert success"><CheckCircle2 size={15} /> {buildSuccess}</div>}

              <button
                className="ai-deploy-btn"
                onClick={handleBuild}
                disabled={buildLoading}
              >
                {buildLoading ? <Loader2 size={16} className="spin" /> : <Rocket size={16} />}
                {buildLoading ? "Mendeploy..." : "Deploy Model"}
              </button>
            </div>

            {/* Right: Instructions */}
            <div className="ai-build-guide">
              <h3><Eye size={15} /> Panduan Penulisan Model</h3>
              <div className="ai-guide-block">
                <h4>Struktur Dasar</h4>
                <pre className="ai-guide-code">{`def run(data: dict) -> dict:
    # data berisi nilai sensor real-time
    # contoh: { "temperature": 28.5,
    #            "humidity": 72.0 }
    
    value = float(data.get("temperature", 0))
    
    return {
        "result": value * 1.8 + 32,  # Fahrenheit
        "summary": f"{value}°C"
    }`}</pre>
              </div>
              <div className="ai-guide-block">
                <h4>Library yang Tersedia</h4>
                <ul className="ai-guide-list">
                  <li><code>math</code> — sqrt, log, sin, cos, pi...</li>
                  <li><code>statistics</code> — mean, median, stdev...</li>
                  <li>Built-in: len, sum, min, max, abs, round</li>
                  <li>Types: float, int, str, list, dict</li>
                </ul>
              </div>
              <div className="ai-guide-block">
                <h4>Contoh Penggunaan math</h4>
                <pre className="ai-guide-code">{`import math

def run(data):
    temp = float(data.get("temperature", 25))
    humidity = float(data.get("humidity", 60))
    
    # Dew point formula (Magnus)
    a, b = 17.27, 237.7
    alpha = (a * temp / (b + temp)) + math.log(humidity / 100.0)
    dew_pt = (b * alpha) / (a - alpha)
    
    return {
        "dew_point": round(dew_pt, 2),
        "summary": f"Titik Embun: {dew_pt:.1f}°C"
    }`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RUN ─────────────────────────────────────────────────────────── */}
      {tab === "run" && (
        <div className="ai-run">
          <div className="ai-run-layout">
            {/* Model Selector */}
            <div className="ai-run-sidebar">
              <h3>Pilih Model</h3>
              <div className="ai-run-model-list">
                {allModels.map(m => (
                  <button
                    key={m.id}
                    className={`ai-run-model-item ${selectedModel?.id === m.id ? "active" : ""}`}
                    onClick={() => setSelectedModel(m)}
                  >
                    <span className="ai-run-model-icon">
                      {m.isPreset ? (PRESET_ICONS[m.id] || <Brain size={16} />) : <Code2 size={16} />}
                    </span>
                    <span className="ai-run-model-label">{m.name}</span>
                    {m.isPreset && <span className="ai-run-badge">Platform</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Panel */}
            <div className="ai-run-panel">
              {!selectedModel ? (
                <div className="ai-run-empty">
                  <Brain size={48} />
                  <h3>Pilih model dari kiri untuk memulai</h3>
                </div>
              ) : (
                <>
                  <div className="ai-run-model-info">
                    <div className="ai-run-model-icon-lg">
                      {selectedModel.isPreset
                        ? (PRESET_ICONS[selectedModel.id] || <Brain size={28} />)
                        : <Code2 size={28} />}
                    </div>
                    <div>
                      <h2>{selectedModel.name}</h2>
                      <p>{selectedModel.description}</p>
                    </div>
                  </div>

                  {/* Input Data */}
                  <div className="ai-run-input">
                    <div className="ai-run-input-header">
                      <label>Data Input (JSON)</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="ai-input-action-btn" onClick={fetchLiveData} title="Ambil data live dari gateway">
                          <RefreshCw size={13} /> Data Live
                        </button>
                        <button
                          className="ai-input-action-btn"
                          onClick={() => setRunData('{\n  "temperature": 28.5,\n  "humidity": 75.0,\n  "pressure": 1013.0\n}')}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="ai-json-editor"
                      value={runData}
                      onChange={e => setRunData(e.target.value)}
                      rows={8}
                      spellCheck={false}
                      placeholder='{ "temperature": 28.5, "humidity": 72.0 }'
                    />
                    {selectedModel.required_channels && selectedModel.required_channels.length > 0 && (
                      <div className="ai-run-hint">
                        <Cpu size={12} />
                        Channel yang dibutuhkan: {selectedModel.required_channels.join(", ")}
                      </div>
                    )}
                  </div>

                  <button
                    className="ai-run-execute-btn"
                    onClick={handleRun}
                    disabled={runLoading}
                  >
                    {runLoading ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                    {runLoading ? "Menjalankan Model..." : "Jalankan Model"}
                  </button>

                  {/* Result */}
                  {runError && (
                    <div className="ai-alert error">
                      <AlertCircle size={15} /> {runError}
                    </div>
                  )}
                  {runResult && (
                    <div className="ai-run-result">
                      <div className="ai-result-header">
                        <CheckCircle2 size={18} />
                        <h3>Hasil Analisis</h3>
                      </div>

                      {/* Summary jika ada */}
                      {runResult.result?.summary && (
                        <div className="ai-result-summary">
                          {runResult.result.summary}
                        </div>
                      )}

                      {/* Weather Predictor result */}
                      {runResult.result?.prediction && (
                        <div className="ai-result-prediction">
                          <span className="ai-result-emoji">{runResult.result.emoji}</span>
                          <div>
                            <strong>{runResult.result.prediction}</strong>
                            <span className="ai-result-confidence">Kepercayaan: {runResult.result.confidence}</span>
                          </div>
                        </div>
                      )}

                      {/* Factors */}
                      {runResult.result?.factors && (
                        <div className="ai-result-factors">
                          {runResult.result.factors.map((f, i) => (
                            <span key={i} className="ai-factor-tag">{f}</span>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      {runResult.result?.recommendations && (
                        <ul className="ai-result-recommendations">
                          {runResult.result.recommendations.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}

                      {/* Channel results (anomaly/trend) */}
                      {runResult.result?.channel_results && (
                        <div className="ai-channel-results">
                          {Object.entries(runResult.result.channel_results).map(([ch, data]) => (
                            <div key={ch} className={`ai-ch-result-card ${data.is_anomaly ? "anomaly" : ""}`}>
                              <div className="ai-ch-result-header">
                                <strong>{ch}</strong>
                                <span className={`ai-ch-status ${data.is_anomaly ? "bad" : "good"}`}>
                                  {data.status || (data.trend ? `${data.emoji} ${data.trend}` : "")}
                                </span>
                              </div>
                              <p className="ai-ch-message">{data.message}</p>
                              {data.next_predicted !== undefined && (
                                <p className="ai-ch-prediction">Prediksi berikutnya: <strong>{data.next_predicted}</strong></p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Raw JSON Toggle */}
                      <details className="ai-result-raw">
                        <summary>Lihat Raw JSON</summary>
                        <pre>{JSON.stringify(runResult, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Styles ───────────────────────────────────────────────────────────── */}
      <style>{`
        .ai-builder-view { padding: 0; display: flex; flex-direction: column; gap: 0; height: 100%; }
        .ai-header-stats { display: flex; gap: 10px; }
        .ai-stat-badge { display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .ai-stat-badge.preset { background: rgba(16,185,129,.15); color: #10b981; }
        .ai-stat-badge.custom { background: rgba(139,92,246,.15); color: #8b5cf6; }
        .ai-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); padding: 0 24px; margin-bottom: 0; flex-shrink: 0; background: var(--surface); }
        .ai-tab-btn { display: flex; align-items: center; gap: 8px; padding: 14px 20px; font-size: 13px; font-weight: 500; color: var(--text-muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all .2s; }
        .ai-tab-btn:hover { color: var(--text); background: var(--surface-raised); }
        .ai-tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
        .ai-explore, .ai-build, .ai-run { padding: 24px; overflow-y: auto; flex: 1; }
        .ai-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 80px; color: var(--text-muted); }
        .ai-section { margin-bottom: 40px; }
        .ai-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .ai-section-header h2 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
        .ai-section-badge { font-size: 11px; background: rgba(16,185,129,.12); color: var(--accent); padding: 3px 10px; border-radius: 12px; font-weight: 500; }
        .ai-model-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .ai-model-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; padding: 20px; cursor: pointer; transition: all .2s; display: flex; flex-direction: column; gap: 10px; }
        .ai-model-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.15); }
        .ai-model-card.selected { border-color: var(--accent); background: rgba(16,185,129,.05); }
        .ai-model-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .ai-model-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--surface); display: flex; align-items: center; justify-content: center; }
        .ai-model-badges { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .ai-badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
        .ai-badge.deployed { background: rgba(16,185,129,.12); color: #10b981; }
        .ai-badge.custom { background: rgba(139,92,246,.12); color: #8b5cf6; }
        .ai-model-name { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
        .ai-model-desc { font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.6; flex: 1; }
        .ai-model-channels { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
        .ai-ch-label { font-size: 11px; color: var(--text-muted); }
        .ai-ch-tag { font-size: 11px; background: var(--surface); border: 1px solid var(--border); padding: 2px 8px; border-radius: 8px; color: var(--text-muted); font-family: monospace; }
        .ai-model-author { font-size: 11px; color: var(--text-muted); margin: 0; }
        .ai-run-btn { display: flex; align-items: center; gap: 6px; justify-content: center; padding: 8px 14px; background: var(--accent); color: #000; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .2s; }
        .ai-run-btn:hover { background: var(--accent-hover); }
        .ai-create-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; background: var(--accent); color: #000; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; margin-left: auto; }
        .ai-create-btn.large { padding: 12px 24px; font-size: 14px; margin-top: 16px; }
        .ai-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 60px; color: var(--text-muted); text-align: center; border: 2px dashed var(--border); border-radius: 16px; }
        .ai-empty-state h3 { color: var(--text); font-size: 18px; margin: 0; }
        .ai-empty-state p { margin: 0; font-size: 14px; line-height: 1.6; }

        /* Build tab */
        .ai-build-layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }
        .ai-build-form { display: flex; flex-direction: column; gap: 20px; }
        .ai-build-section { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        .ai-build-section h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text); margin: 0 0 16px 0; }
        .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .form-group label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .tip-input { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--text); width: 100%; outline: none; transition: border-color .2s; font-family: inherit; }
        .tip-input:focus { border-color: var(--accent); }
        .ai-template-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .ai-template-btn { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; text-align: left; transition: all .2s; }
        .ai-template-btn:hover { border-color: var(--accent); }
        .ai-template-btn.active { border-color: var(--accent); background: rgba(16,185,129,.08); }
        .ai-template-btn strong { font-size: 12px; color: var(--text); }
        .ai-template-btn small { font-size: 10px; color: var(--text-muted); }
        .ai-copy-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; color: var(--text-muted); cursor: pointer; }
        .ai-sandbox-info { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; }
        .ai-sandbox-info code { background: var(--surface-raised); padding: 1px 5px; border-radius: 4px; font-size: 10px; color: var(--accent); }
        .ai-code-editor { width: 100%; background: #0d1117; border: 1px solid var(--border); border-radius: 8px; padding: 16px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; color: #e6edf3; line-height: 1.7; resize: vertical; min-height: 280px; outline: none; }
        .ai-code-editor:focus { border-color: var(--accent); }
        .ai-alert { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; font-size: 13px; }
        .ai-alert.error { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; }
        .ai-alert.success { background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.3); color: var(--accent); }
        .ai-deploy-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: var(--accent); color: #000; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .2s; }
        .ai-deploy-btn:hover { background: var(--accent-hover); }
        .ai-deploy-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* Build guide */
        .ai-build-guide { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; padding: 20px; height: fit-content; position: sticky; top: 0; }
        .ai-build-guide h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; }
        .ai-guide-block { margin-bottom: 20px; }
        .ai-guide-block h4 { font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: .5px; }
        .ai-guide-code { background: #0d1117; border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 11px; color: #e6edf3; line-height: 1.6; overflow-x: auto; font-family: monospace; white-space: pre; }
        .ai-guide-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .ai-guide-list li { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
        .ai-guide-list code { background: var(--surface); padding: 1px 5px; border-radius: 4px; color: var(--accent); font-size: 11px; }

        /* Run tab */
        .ai-run-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; height: 100%; }
        .ai-run-sidebar { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; padding: 16px; height: fit-content; }
        .ai-run-sidebar h3 { font-size: 13px; font-weight: 600; color: var(--text-muted); margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: .5px; }
        .ai-run-model-list { display: flex; flex-direction: column; gap: 4px; }
        .ai-run-model-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: none; border: 1px solid transparent; border-radius: 8px; cursor: pointer; text-align: left; color: var(--text); font-size: 12px; transition: all .15s; width: 100%; }
        .ai-run-model-item:hover { background: var(--surface); border-color: var(--border); }
        .ai-run-model-item.active { background: rgba(16,185,129,.1); border-color: var(--accent); color: var(--accent); }
        .ai-run-model-icon { flex-shrink: 0; color: var(--text-muted); }
        .ai-run-model-label { flex: 1; font-weight: 500; }
        .ai-run-badge { font-size: 9px; background: rgba(16,185,129,.15); color: var(--accent); padding: 2px 6px; border-radius: 8px; font-weight: 600; flex-shrink: 0; }
        .ai-run-panel { display: flex; flex-direction: column; gap: 16px; }
        .ai-run-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; height: 300px; color: var(--text-muted); background: var(--surface-raised); border: 2px dashed var(--border); border-radius: 12px; }
        .ai-run-model-info { display: flex; align-items: flex-start; gap: 16px; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        .ai-run-model-icon-lg { width: 56px; height: 56px; border-radius: 12px; background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
        .ai-run-model-info h2 { font-size: 16px; font-weight: 700; margin: 0 0 6px 0; }
        .ai-run-model-info p { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5; }
        .ai-run-input { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .ai-run-input-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ai-run-input-header label { font-size: 13px; font-weight: 600; color: var(--text); }
        .ai-input-action-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; color: var(--text-muted); cursor: pointer; transition: all .15s; }
        .ai-input-action-btn:hover { border-color: var(--accent); color: var(--accent); }
        .ai-json-editor { width: 100%; background: #0d1117; border: 1px solid var(--border); border-radius: 8px; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #e6edf3; line-height: 1.6; resize: vertical; outline: none; }
        .ai-json-editor:focus { border-color: var(--accent); }
        .ai-run-hint { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); margin-top: 8px; }
        .ai-run-execute-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: var(--accent); color: #000; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ai-run-execute-btn:disabled { opacity: .6; cursor: not-allowed; }
        .ai-run-result { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .ai-result-header { display: flex; align-items: center; gap: 10px; color: var(--accent); }
        .ai-result-header h3 { font-size: 15px; font-weight: 700; margin: 0; color: var(--text); }
        .ai-result-summary { background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.3); border-radius: 8px; padding: 12px 16px; font-size: 15px; font-weight: 600; color: var(--accent); text-align: center; }
        .ai-result-prediction { display: flex; align-items: center; gap: 16px; background: var(--surface); border-radius: 10px; padding: 14px; }
        .ai-result-emoji { font-size: 40px; }
        .ai-result-prediction strong { display: block; font-size: 18px; color: var(--text); }
        .ai-result-confidence { font-size: 13px; color: var(--text-muted); }
        .ai-result-factors { display: flex; flex-wrap: wrap; gap: 8px; }
        .ai-factor-tag { background: var(--surface); border: 1px solid var(--border); padding: 5px 12px; border-radius: 20px; font-size: 12px; color: var(--text-muted); }
        .ai-result-recommendations { padding: 0 0 0 16px; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .ai-result-recommendations li { font-size: 13px; color: var(--text); line-height: 1.5; }
        .ai-channel-results { display: flex; flex-direction: column; gap: 10px; }
        .ai-ch-result-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; }
        .ai-ch-result-card.anomaly { border-color: rgba(245,158,11,.4); background: rgba(245,158,11,.05); }
        .ai-ch-result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .ai-ch-result-header strong { font-size: 13px; font-family: monospace; color: var(--text); }
        .ai-ch-status { font-size: 12px; font-weight: 600; }
        .ai-ch-status.good { color: var(--accent); }
        .ai-ch-status.bad { color: #f59e0b; }
        .ai-ch-message { font-size: 12px; color: var(--text-muted); margin: 0; }
        .ai-ch-prediction { font-size: 12px; color: var(--text); margin: 4px 0 0 0; }
        .ai-result-raw { margin-top: 4px; }
        .ai-result-raw summary { font-size: 12px; color: var(--text-muted); cursor: pointer; padding: 4px; }
        .ai-result-raw pre { background: #0d1117; border-radius: 8px; padding: 14px; font-size: 11px; color: #e6edf3; overflow-x: auto; margin-top: 8px; max-height: 200px; overflow-y: auto; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .ai-build-layout { grid-template-columns: 1fr; }
          .ai-run-layout { grid-template-columns: 1fr; }
          .ai-build-guide { position: static; }
        }
      `}</style>
    </div>
  );
}
