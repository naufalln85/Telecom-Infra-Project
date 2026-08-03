import { useState, useEffect } from "react";
import { X, Settings, Cpu, Hash, Palette, Check, Sliders } from "lucide-react";
import { devicesAPI, channelsAPI } from "../services/api";

export default function WidgetConfigModal({ widget, activeProjectId, onClose, onSave }) {
  const [title, setTitle] = useState(widget?.title || "Widget Title");
  const [selectedDevice, setSelectedDevice] = useState(widget?.deviceId || "");
  const [selectedChannel, setSelectedChannel] = useState(widget?.channel || "temperature");
  const [unit, setUnit] = useState(widget?.unit || "°C");
  const [minVal, setMinVal] = useState(widget?.config?.min ?? 0);
  const [maxVal, setMaxVal] = useState(widget?.config?.max ?? 100);
  const [colorTheme, setColorTheme] = useState(widget?.config?.colorTheme || "emerald");

  const [devices, setDevices] = useState([]);
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await devicesAPI.list(activeProjectId || 1);
        if (res?.data && res.data.length > 0) {
          setDevices(res.data);
          if (!selectedDevice) setSelectedDevice(String(res.data[0].id));
        }
      } catch {
        setDevices([{ id: 1, name: "Quickstart Device (Greenhouse Node)" }]);
      }
    }
    loadDevices();
  }, [activeProjectId]);

  useEffect(() => {
    if (!selectedDevice) return;
    async function loadChannels() {
      try {
        const res = await channelsAPI.list(selectedDevice);
        if (res?.data && res.data.length > 0) {
          setChannels(res.data);
        } else {
          setChannels([
            { id: 1, name: "temperature", channel_type: "numeric", unit: "°C" },
            { id: 2, name: "humidity", channel_type: "numeric", unit: "%" },
            { id: 3, name: "relay_1", channel_type: "boolean", unit: null },
          ]);
        }
      } catch {
        setChannels([
          { id: 1, name: "temperature", channel_type: "numeric", unit: "°C" },
          { id: 2, name: "humidity", channel_type: "numeric", unit: "%" },
          { id: 3, name: "relay_1", channel_type: "boolean", unit: null },
        ]);
      }
    }
    loadChannels();
  }, [selectedDevice]);

  const handleChannelChange = (e) => {
    const chName = e.target.value;
    setSelectedChannel(chName);
    const found = channels.find(c => c.name === chName);
    if (found?.unit) setUnit(found.unit);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...widget,
      title,
      deviceId: selectedDevice,
      channel: selectedChannel,
      unit,
      config: {
        ...(widget.config || {}),
        min: Number(minVal),
        max: Number(maxVal),
        colorTheme,
      }
    });
    onClose();
  };

  return (
    <div className="blynk-modal-overlay">
      <div className="blynk-modal-box" style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Settings size={20} style={{ color: "#22C55E" }} />
            <h3 style={{ margin: 0 }}>Configure Widget: {widget.type.toUpperCase()}</h3>
          </div>
          <button type="button" className="btn-icon-square" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group">
            <label>Widget Title</label>
            <input
              required
              placeholder="e.g. Temperature Sensor #1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Select Device</label>
              <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Datastream / Channel</label>
              <select value={selectedChannel} onChange={handleChannelChange}>
                {channels.map(ch => (
                  <option key={ch.id} value={ch.name}>
                    {ch.name} {ch.unit ? `(${ch.unit})` : `[${ch.channel_type}]`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Unit Symbol</label>
              <input
                placeholder="°C, %, V, cm"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            {(widget.type === "gauge" || widget.type === "chart" || widget.type === "slider") && (
              <>
                <div className="form-group">
                  <label>Min Limit</label>
                  <input
                    type="number"
                    value={minVal}
                    onChange={(e) => setMinVal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Max Limit</label>
                  <input
                    type="number"
                    value={maxVal}
                    onChange={(e) => setMaxVal(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label>Color Theme</label>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {[
                { id: "emerald", label: "Emerald", color: "#10B981" },
                { id: "cyan", label: "Cyan", color: "#06B6D4" },
                { id: "amber", label: "Amber", color: "#F59E0B" },
                { id: "purple", label: "Purple", color: "#8B5CF6" }
              ].map(th => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setColorTheme(th.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: colorTheme === th.id ? `2px solid ${th.color}` : "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: th.color }} />
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn-blynk-outlined" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-blynk-green-action">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
