import { Camera, Cpu } from "lucide-react";

function ImageWidget({ title, image, label, confidence }) {
  return (
    <div className="widget-bento-card" style={{ padding: 16 }}>
      <div className="card-header-bento" style={{ marginBottom: 10 }}>
        <h3>
          <span className="card-header-icon">
            <Camera size={16} />
          </span>
          {title || "AI Inference Feed"}
        </h3>
        <span style={{ fontSize: 11, fontWeight: 700, background: "var(--emerald-soft-bg)", color: "var(--primary-emerald)", padding: "3px 8px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4 }}>
          <Cpu size={12} /> ONNX Sandbox
        </span>
      </div>

      <div className="ai-image-container">
        {image ? (
          <img src={image} alt={label || "AI Detection Feed"} />
        ) : (
          <div style={{ flex: 1, background: "var(--bg-canvas)", border: "1px dashed var(--border-light)", borderRadius: 16, display: "flex", alignItems: "center", justifyCenter: "center", color: "var(--text-muted)", fontSize: 13, padding: 20 }}>
            Waiting for AI camera feed stream...
          </div>
        )}

        {(label || confidence !== undefined) && (
          <div className="ai-overlay-badge">
            <span>
              Result: <b className="ai-label-bold">{label || "Processing"}</b>
            </span>
            {confidence !== undefined && (
              <span style={{ background: "rgba(16, 185, 129, 0.2)", padding: "2px 8px", borderRadius: 999 }}>
                Confidence: {confidence}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageWidget;