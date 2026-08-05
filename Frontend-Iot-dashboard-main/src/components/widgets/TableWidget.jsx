import { useState } from "react";
import { Table, Download, Search, RefreshCw, CheckCircle, Database } from "lucide-react";

function TableWidget({ title = "Sensor Telemetry Data Table", history = [], deviceId = "esp32-sensor-01" }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Sample data fallback if history is empty
  const defaultLogs = [
    { time: "12:00:15", device_id: deviceId || "esp32-sensor-01", temperature: 27.2, humidity: 64.5, status: "ONLINE" },
    { time: "12:00:10", device_id: deviceId || "esp32-sensor-01", temperature: 27.0, humidity: 65.0, status: "ONLINE" },
    { time: "12:00:05", device_id: deviceId || "esp32-sensor-01", temperature: 26.8, humidity: 65.2, status: "ONLINE" },
    { time: "12:00:00", device_id: deviceId || "esp32-sensor-01", temperature: 26.5, humidity: 66.0, status: "ONLINE" },
  ];

  const dataToDisplay = history && history.length > 0
    ? history.map((item, idx) => ({
        time: item.time || new Date().toLocaleTimeString(),
        device_id: item.device_id || deviceId || "esp32-sensor-01",
        temperature: item.temperature !== undefined ? item.temperature : (26 + idx % 3),
        humidity: item.humidity !== undefined ? item.humidity : (60 + idx % 5),
        status: "ONLINE"
      }))
    : defaultLogs;

  const filteredData = dataToDisplay.filter(row =>
    String(row.device_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(row.time).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = "Timestamp,Device ID,Temperature (C),Humidity (%),Status\n";
    const rows = filteredData.map(r => `${r.time},${r.device_id},${r.temperature},${r.humidity},${r.status}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telemetry_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="table-widget-container">
      <div className="widget-header-flex">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Table size={16} className="widget-icon-emerald" />
          <h4 className="widget-title-text">{title}</h4>
        </div>
        <button type="button" className="action-icon-btn-sm" onClick={handleExportCSV} title="Export CSV Data">
          <Download size={13} />
        </button>
      </div>

      <div className="table-widget-search-bar">
        <Search size={13} style={{ color: "#64748B" }} />
        <input
          type="text"
          placeholder="Filter data sensor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="count-badge">{filteredData.length} records</span>
      </div>

      <div className="table-widget-scroll-wrapper">
        <table className="telemetry-data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device ID</th>
              <th>Temp (°C)</th>
              <th>Humidity (%)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={idx}>
                <td className="font-mono">{row.time}</td>
                <td><span className="device-chip">{row.device_id}</span></td>
                <td className="temp-val">{row.temperature}°C</td>
                <td className="hum-val">{row.humidity}%</td>
                <td>
                  <span className="status-pill-online">
                    <CheckCircle size={10} /> {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableWidget;
