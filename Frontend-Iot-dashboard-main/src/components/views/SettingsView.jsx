import { useState } from "react";
import { Settings, Key, Shield, Bell, Users, Save, Check } from "lucide-react";
import confetti from "canvas-confetti";

function SettingsView({ userAccount }) {
  const [telegramToken, setTelegramToken] = useState("718294021:AAFx9810293...");
  const [telegramChatId, setTelegramChatId] = useState("981204918");
  const [webhookUrl, setWebhookUrl] = useState("https://api.telecominfra.id/webhook/alert");
  const [apiKey, setApiKey] = useState("tip_live_8f910a9284b1273918029341");
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaved(true);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="hero-bento-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>
            <Settings style={{ color: "var(--emerald-neon)" }} /> Project & System Settings
          </h1>
          <p>Konfigurasi Notification Dispatcher, Hash API Key Device, & Tenant Isolation (Modul A)</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Device API Key Hash Card */}
        <div className="widget-bento-card">
          <div className="card-header-bento">
            <h3>
              <span className="card-header-icon">
                <Key size={16} />
              </span>
              Device Authentication API Key (SHA-256)
            </h3>
          </div>

          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
            API Key digunakan oleh Gateway Device Modul B untuk mengautentikasi pengiriman payload telemetri.
          </p>

          <div className="form-group-field">
            <label>Current API Key Plaintext</label>
            <input type="text" readOnly value={apiKey} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }} />
          </div>

          <button
            type="button"
            className="btn-glass-pill"
            style={{ width: "fit-content", marginTop: 6 }}
            onClick={() => setApiKey(`tip_live_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`)}
          >
            Regenerate Device API Key
          </button>
        </div>

        {/* Notification Channels Configuration */}
        <div className="widget-bento-card">
          <div className="card-header-bento">
            <h3>
              <span className="card-header-icon">
                <Bell size={16} />
              </span>
              Notification Dispatcher Target (Modul A)
            </h3>
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group-field">
              <label>Telegram Bot Token</label>
              <input type="text" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} />
            </div>

            <div className="form-group-field">
              <label>Telegram Chat ID</label>
              <input type="text" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} />
            </div>

            <div className="form-group-field">
              <label>Webhook Destination URL</label>
              <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            </div>

            <button type="submit" className="btn-emerald-primary" style={{ width: "fit-content" }}>
              {saved ? <Check size={16} /> : <Save size={16} />}
              <span>{saved ? "Settings Saved!" : "Save Notification Config"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
