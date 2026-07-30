import { useState, useEffect, useCallback } from "react";
import {
  Zap, AlertTriangle, ShieldCheck, Plus, Clock, Trash2,
  ToggleLeft, ToggleRight, Loader2, AlertCircle, CheckCircle2,
  Bell, Send, Webhook, Mail, RefreshCw, ChevronDown, X
} from "lucide-react";
import {
  rulesAPI, alertHistoryAPI, notifChannelsAPI,
  devicesAPI, channelsAPI
} from "../../services/api";

// Operator options
const OPERATORS = [
  { value: ">",  label: "> lebih besar dari" },
  { value: "<",  label: "< lebih kecil dari" },
  { value: ">=", label: "≥ lebih besar sama dengan" },
  { value: "<=", label: "≤ lebih kecil sama dengan" },
  { value: "==", label: "= sama dengan" },
];

const NOTIF_TYPES = [
  { value: "telegram", label: "Telegram Bot", icon: <Send size={14} /> },
  { value: "webhook",  label: "HTTP Webhook", icon: <Webhook size={14} /> },
  { value: "email",    label: "Email",         icon: <Mail size={14} /> },
];

// ─── Notification Channel Manager ────────────────────────────────────────────
function NotifChannelManager({ projectId, onChannelsChange }) {
  const [channels, setChannels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "telegram", config: {} });
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await notifChannelsAPI.list(projectId);
      setChannels(res.data || []);
      onChannelsChange?.(res.data || []);
    } catch (e) { console.error(e); }
  }, [projectId, onChannelsChange]);

  useEffect(() => { load(); }, [load]);

  const buildConfig = () => {
    if (form.type === "telegram") return { bot_token: telegramToken, chat_id: telegramChatId };
    if (form.type === "webhook")  return { url: webhookUrl };
    if (form.type === "email")    return { address: emailAddress };
    return {};
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("Nama channel harus diisi."); return; }
    setLoading(true); setError("");
    try {
      await notifChannelsAPI.create(projectId, { ...form, config: buildConfig() });
      setShowForm(false);
      setForm({ name: "", type: "telegram", config: {} });
      setTelegramToken(""); setTelegramChatId(""); setWebhookUrl(""); setEmailAddress("");
      await load();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    try { await notifChannelsAPI.delete(id); await load(); }
    catch (e) { setError(e.message); }
  };

  const typeIcon = { telegram: <Send size={14} />, webhook: <Webhook size={14} />, email: <Mail size={14} /> };

  return (
    <div className="av-notif-manager">
      <div className="av-section-header">
        <Bell size={15} />
        <h3>Notifikasi Channel</h3>
        <button className="av-btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={13} /> Tambah Channel
        </button>
      </div>

      {showForm && (
        <div className="av-notif-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nama Channel</label>
              <input className="tip-input" placeholder="Telegram Greenhouse" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Tipe</label>
              <select className="tip-input" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {NOTIF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {form.type === "telegram" && (
            <div className="form-row">
              <div className="form-group">
                <label>Bot Token</label>
                <input className="tip-input" type="password" placeholder="123456:ABC-DEF..."
                  value={telegramToken} onChange={e => setTelegramToken(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Chat ID</label>
                <input className="tip-input" placeholder="-100123456789"
                  value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} />
              </div>
            </div>
          )}
          {form.type === "webhook" && (
            <div className="form-group">
              <label>Webhook URL</label>
              <input className="tip-input" placeholder="https://hooks.example.com/..."
                value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
            </div>
          )}
          {form.type === "email" && (
            <div className="form-group">
              <label>Alamat Email</label>
              <input className="tip-input" type="email" placeholder="admin@company.com"
                value={emailAddress} onChange={e => setEmailAddress(e.target.value)} />
            </div>
          )}

          {error && <div className="av-alert error"><AlertCircle size={13} /> {error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="av-btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />}
              Simpan Channel
            </button>
            <button className="av-btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </div>
      )}

      {channels.length === 0 && !showForm ? (
        <div className="av-empty-inline">Belum ada notifikasi channel. Tambahkan untuk menerima alert.</div>
      ) : (
        <div className="av-notif-list">
          {channels.map(ch => (
            <div key={ch.id} className="av-notif-item">
              <span className="av-notif-type-icon">{typeIcon[ch.type] || <Bell size={14} />}</span>
              <span className="av-notif-name">{ch.name}</span>
              <span className="av-notif-type-badge">{ch.type}</span>
              <button className="av-delete-btn" onClick={() => handleDelete(ch.id)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main AlertsView ──────────────────────────────────────────────────────────
function AlertsView({ activeProject }) {
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [devices, setDevices] = useState([]);
  const [notifChannels, setNotifChannels] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [selectedDevice, setSelectedDevice] = useState("");
  const [deviceChannels, setDeviceChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [operator, setOperator] = useState(">");
  const [threshold, setThreshold] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [selectedNotifChannels, setSelectedNotifChannels] = useState([]);

  const projectId = activeProject?.id;

  const loadRules = useCallback(async () => {
    if (!projectId) return;
    setLoadingRules(true);
    try {
      const res = await rulesAPI.list(projectId);
      setRules(res.data || []);
    } catch (e) { console.error("Load rules error:", e); }
    finally { setLoadingRules(false); }
  }, [projectId]);

  const loadHistory = useCallback(async () => {
    if (!projectId) return;
    setLoadingHistory(true);
    try {
      const res = await alertHistoryAPI.list(projectId);
      setHistory(res.data || []);
    } catch (e) { console.error("Load history error:", e); }
    finally { setLoadingHistory(false); }
  }, [projectId]);

  const loadDevices = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await devicesAPI.list(projectId);
      setDevices(res.data || []);
    } catch (e) { console.error("Load devices error:", e); }
  }, [projectId]);

  useEffect(() => {
    loadRules();
    loadHistory();
    loadDevices();
  }, [loadRules, loadHistory, loadDevices]);

  // Saat pilih device → load channels-nya
  useEffect(() => {
    if (!selectedDevice) { setDeviceChannels([]); setSelectedChannel(""); return; }
    channelsAPI.list(selectedDevice).then(res => {
      const chs = (res.data || []).filter(c => c.channel_type === "numeric");
      setDeviceChannels(chs);
      // Auto-select jika hanya ada 1 channel
      if (chs.length === 1) setSelectedChannel(String(chs[0].id));
      else setSelectedChannel("");
    }).catch(console.error);
  }, [selectedDevice]);

  const handleToggleNotifChannel = (id) => {
    setSelectedNotifChannels(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateRule = async () => {
    if (!selectedDevice) { setFormError("Pilih perangkat terlebih dahulu."); return; }
    if (!selectedChannel) { setFormError("Pilih channel data."); return; }
    if (threshold === "" || isNaN(parseFloat(threshold))) { setFormError("Masukkan nilai threshold yang valid."); return; }
    setFormLoading(true); setFormError("");
    try {
      await rulesAPI.create(projectId, {
        device_id: parseInt(selectedDevice),
        channel_id: parseInt(selectedChannel),
        operator,
        threshold_value: parseFloat(threshold),
        cooldown_seconds: parseInt(cooldown),
        notification_channel_ids: selectedNotifChannels,
      });
      setShowForm(false);
      setSelectedDevice(""); setSelectedChannel(""); setThreshold(""); setCooldown(60);
      setSelectedNotifChannels([]);
      await loadRules();
    } catch (e) { setFormError(e.message); }
    finally { setFormLoading(false); }
  };

  const handleDeleteRule = async (ruleId) => {
    try { await rulesAPI.delete(ruleId); await loadRules(); }
    catch (e) { console.error(e); }
  };

  const handleToggleRule = async (ruleId) => {
    try { await rulesAPI.toggle(ruleId); await loadRules(); }
    catch (e) { console.error(e); }
  };

  if (!projectId) {
    return (
      <div className="av-no-project">
        <AlertTriangle size={48} />
        <h3>Pilih Project Terlebih Dahulu</h3>
        <p>Alert Engine membutuhkan project yang aktif. Pilih project dari menu sidebar.</p>
      </div>
    );
  }

  const selectedDeviceName = devices.find(d => String(d.id) === String(selectedDevice))?.name || "";

  return (
    <div className="alerts-view">
      {/* ── Header ── */}
      <div className="view-header">
        <div className="view-header-left">
          <Zap size={22} className="view-header-icon" />
          <div>
            <h1 className="view-title">Alert Engine</h1>
            <p className="view-subtitle">
              Buat aturan threshold, kelola notifikasi, dan pantau history alert real-time
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="av-btn-ghost" onClick={() => { loadRules(); loadHistory(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="av-btn-primary" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> Buat Alert Rule
          </button>
        </div>
      </div>

      {/* ── Create Rule Form ── */}
      {showForm && (
        <div className="av-form-card">
          <div className="av-form-header">
            <ShieldCheck size={18} />
            <h3>Buat Alert Rule Baru</h3>
            <button className="av-close-btn" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>

          <div className="av-form-body">
            <div className="form-row">
              {/* Pilih Device */}
              <div className="form-group">
                <label>Perangkat (Device)</label>
                <select className="tip-input" value={selectedDevice}
                  onChange={e => setSelectedDevice(e.target.value)}>
                  <option value="">-- Pilih Perangkat --</option>
                  {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Pilih Channel */}
              <div className="form-group">
                <label>Channel Data</label>
                {deviceChannels.length === 0 ? (
                  <div className="tip-input" style={{ color: "var(--text-muted)", cursor: "default" }}>
                    {selectedDevice ? "Tidak ada channel numerik" : "Pilih device dulu"}
                  </div>
                ) : deviceChannels.length === 1 ? (
                  // Auto-selected, tampilkan label saja
                  <div className="tip-input av-auto-selected">
                    <CheckCircle2 size={13} /> {deviceChannels[0].name}
                    {deviceChannels[0].unit && ` (${deviceChannels[0].unit})`}
                  </div>
                ) : (
                  // Dropdown jika lebih dari 1
                  <select className="tip-input" value={selectedChannel}
                    onChange={e => setSelectedChannel(e.target.value)}>
                    <option value="">-- Pilih Channel --</option>
                    {deviceChannels.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}{ch.unit ? ` (${ch.unit})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="form-row">
              {/* Operator */}
              <div className="form-group">
                <label>Kondisi / Operator</label>
                <select className="tip-input" value={operator}
                  onChange={e => setOperator(e.target.value)}>
                  {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              </div>

              {/* Threshold */}
              <div className="form-group">
                <label>Nilai Threshold</label>
                <input className="tip-input" type="number" step="any"
                  placeholder="contoh: 35.5"
                  value={threshold} onChange={e => setThreshold(e.target.value)} />
              </div>

              {/* Cooldown */}
              <div className="form-group">
                <label>Cooldown (detik)</label>
                <input className="tip-input" type="number" min="10"
                  placeholder="60"
                  value={cooldown} onChange={e => setCooldown(e.target.value)} />
              </div>
            </div>

            {/* Preview */}
            {selectedDevice && selectedChannel && threshold !== "" && (
              <div className="av-rule-preview">
                <strong>Preview:</strong> Jika {selectedDeviceName} → {deviceChannels.find(c => String(c.id) === selectedChannel)?.name} {operator} {threshold} → kirim notifikasi (cooldown {cooldown}s)
              </div>
            )}

            {/* Notif Channel Selection */}
            {notifChannels.length > 0 && (
              <div className="form-group">
                <label>Target Notifikasi (opsional)</label>
                <div className="av-notif-selector">
                  {notifChannels.map(nc => (
                    <label key={nc.id} className="av-notif-check">
                      <input type="checkbox"
                        checked={selectedNotifChannels.includes(nc.id)}
                        onChange={() => handleToggleNotifChannel(nc.id)} />
                      <span>{nc.name}</span>
                      <span className="av-notif-type-badge">{nc.type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formError && <div className="av-alert error"><AlertCircle size={13} /> {formError}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="av-btn-primary" onClick={handleCreateRule} disabled={formLoading}>
                {formLoading ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                Simpan Alert Rule
              </button>
              <button className="av-btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      <div className="av-main-grid">
        {/* ── Left: Rules List ── */}
        <div className="av-panel">
          <div className="av-panel-header">
            <ShieldCheck size={15} />
            <h3>Active Alert Rules</h3>
            <span className="av-count-badge">{rules.length}</span>
            {loadingRules && <Loader2 size={13} className="spin" />}
          </div>

          {rules.length === 0 && !loadingRules ? (
            <div className="av-empty-state">
              <ShieldCheck size={40} />
              <h4>Belum ada alert rule</h4>
              <p>Klik "Buat Alert Rule" untuk membuat aturan threshold pertama Anda.</p>
            </div>
          ) : (
            <div className="av-rules-list">
              {rules.map(rule => (
                <div key={rule.id} className={`av-rule-item ${rule.is_active ? "active" : "inactive"}`}>
                  <div className="av-rule-main">
                    <div className="av-rule-name">
                      {rule.device_name || `Device #${rule.device_id}`} →{" "}
                      <span className="av-rule-channel">{rule.channel_name || `Ch #${rule.channel_id}`}</span>
                      <span className="av-rule-op"> {rule.operator} {rule.threshold_value}</span>
                    </div>
                    <div className="av-rule-meta">
                      Cooldown: {rule.cooldown_seconds}s ·
                      Status: <span className={rule.is_active ? "av-active" : "av-inactive"}>
                        {rule.is_active ? "● Aktif" : "○ Nonaktif"}
                      </span>
                    </div>
                  </div>
                  <div className="av-rule-actions">
                    <button className="av-icon-btn" title="Toggle" onClick={() => handleToggleRule(rule.id)}>
                      {rule.is_active ? <ToggleRight size={18} style={{ color: "var(--accent)" }} /> : <ToggleLeft size={18} />}
                    </button>
                    <button className="av-icon-btn danger" title="Hapus" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notif Channel Manager */}
          <div style={{ marginTop: 24 }}>
            <NotifChannelManager projectId={projectId} onChannelsChange={setNotifChannels} />
          </div>
        </div>

        {/* ── Right: Alert History ── */}
        <div className="av-panel">
          <div className="av-panel-header">
            <Clock size={15} />
            <h3>Alert History</h3>
            <span className="av-count-badge">{history.length}</span>
            {loadingHistory && <Loader2 size={13} className="spin" />}
            <button className="av-btn-ghost sm" onClick={loadHistory} style={{ marginLeft: "auto" }}>
              <RefreshCw size={12} />
            </button>
          </div>

          {history.length === 0 && !loadingHistory ? (
            <div className="av-empty-state">
              <Clock size={40} />
              <h4>Belum ada alert history</h4>
              <p>History akan muncul ketika rule terpicu oleh data sensor.</p>
            </div>
          ) : (
            <div className="av-history-list">
              {history.map(item => (
                <div key={item.history_id || item.id} className="av-history-item">
                  <div className="av-history-icon">⚠️</div>
                  <div className="av-history-body">
                    <div className="av-history-rule">
                      Rule #{item.alert_rule_id} · Device #{item.device_id}
                    </div>
                    <div className="av-history-value">
                      Nilai: <strong>{item.value_at_trigger}</strong>
                    </div>
                    <div className="av-history-time">
                      {item.triggered_at
                        ? new Date(item.triggered_at).toLocaleString("id-ID")
                        : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        .alerts-view { padding: 0; display: flex; flex-direction: column; gap: 0; height: 100%; }
        .av-no-project { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; height: 60vh; color: var(--text-muted); text-align: center; }
        .av-no-project h3 { color: var(--text); font-size: 20px; margin: 0; }
        .av-btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--accent); color: #000; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .2s; }
        .av-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .av-btn-ghost { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: transparent; border: 1px solid var(--border); color: var(--text-muted); border-radius: 8px; font-size: 13px; cursor: pointer; }
        .av-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
        .av-btn-ghost.sm { padding: 4px 8px; font-size: 11px; }
        .av-btn-sm { display: flex; align-items: center; gap: 5px; padding: 5px 10px; background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 6px; font-size: 11px; cursor: pointer; margin-left: auto; }
        .av-form-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; margin: 0 24px 16px; overflow: hidden; flex-shrink: 0; }
        .av-form-header { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--surface); }
        .av-form-header h3 { font-size: 15px; font-weight: 700; margin: 0; flex: 1; }
        .av-close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; display: flex; }
        .av-close-btn:hover { color: var(--text); }
        .av-form-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
        .tip-input { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--text); width: 100%; outline: none; transition: border-color .2s; font-family: inherit; }
        .tip-input:focus { border-color: var(--accent); }
        .av-auto-selected { display: flex; align-items: center; gap: 6px; color: var(--accent); font-weight: 500; }
        .av-rule-preview { background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.25); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: var(--text); }
        .av-notif-selector { display: flex; flex-direction: column; gap: 6px; }
        .av-notif-check { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }
        .av-notif-type-badge { font-size: 10px; background: var(--surface); border: 1px solid var(--border); padding: 2px 6px; border-radius: 8px; color: var(--text-muted); }
        .av-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 12px; }
        .av-alert.error { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; }
        .av-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 0 24px 24px; flex: 1; overflow: hidden; }
        .av-panel { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
        .av-panel-header { display: flex; align-items: center; gap: 8px; padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
        .av-panel-header h3 { font-size: 14px; font-weight: 700; color: var(--text); margin: 0; }
        .av-count-badge { background: var(--accent); color: #000; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
        .av-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 48px 24px; color: var(--text-muted); text-align: center; flex: 1; }
        .av-empty-state h4 { color: var(--text); font-size: 16px; margin: 0; }
        .av-empty-state p { margin: 0; font-size: 13px; line-height: 1.5; }
        .av-rules-list { display: flex; flex-direction: column; gap: 8px; padding: 14px; overflow-y: auto; }
        .av-rule-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; transition: border-color .2s; }
        .av-rule-item.active { border-left: 3px solid var(--accent); }
        .av-rule-item.inactive { opacity: .6; }
        .av-rule-main { flex: 1; }
        .av-rule-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .av-rule-channel { color: var(--accent); font-family: monospace; }
        .av-rule-op { color: #f59e0b; font-weight: 700; }
        .av-rule-meta { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
        .av-active { color: var(--accent); }
        .av-inactive { color: var(--text-muted); }
        .av-rule-actions { display: flex; align-items: center; gap: 4px; }
        .av-icon-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: none; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; color: var(--text-muted); transition: all .15s; }
        .av-icon-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(16,185,129,.08); }
        .av-icon-btn.danger:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,.08); }
        .av-notif-manager { padding: 14px; border-top: 1px solid var(--border); margin-top: 4px; }
        .av-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .av-section-header h3 { font-size: 13px; font-weight: 600; color: var(--text); margin: 0; flex: 1; }
        .av-notif-form { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; }
        .av-notif-list { display: flex; flex-direction: column; gap: 6px; }
        .av-notif-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
        .av-notif-type-icon { color: var(--accent); display: flex; }
        .av-notif-name { flex: 1; font-size: 12px; color: var(--text); font-weight: 500; }
        .av-delete-btn { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: none; border: none; cursor: pointer; color: var(--text-muted); border-radius: 4px; }
        .av-delete-btn:hover { color: #ef4444; }
        .av-empty-inline { font-size: 12px; color: var(--text-muted); padding: 8px 0; }
        .av-history-list { display: flex; flex-direction: column; gap: 8px; padding: 14px; overflow-y: auto; flex: 1; }
        .av-history-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.2); border-radius: 10px; }
        .av-history-icon { font-size: 18px; flex-shrink: 0; }
        .av-history-body { flex: 1; }
        .av-history-rule { font-size: 12px; font-weight: 700; color: var(--text); }
        .av-history-value { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .av-history-value strong { color: #f87171; }
        .av-history-time { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .av-main-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default AlertsView;
