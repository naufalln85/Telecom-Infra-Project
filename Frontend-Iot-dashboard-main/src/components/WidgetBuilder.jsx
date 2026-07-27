import { useState } from "react";
import { X, ArrowLeft, Plus, LayoutGrid } from "lucide-react";
import schemas from "../data/widget-schemas.json";

function setDeep(obj, path, value) {
  const keys = path.split(".");
  const result = { ...obj };
  let cursor = result;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
    } else {
      cursor[key] = { ...(cursor[key] || {}) };
      cursor = cursor[key];
    }
  });

  return result;
}

function slugify(text, fallback) {
  const base = (text || fallback || "widget")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "widget"}-${Date.now().toString(36)}`;
}

function WidgetBuilder({ onAddWidget, onClose }) {
  const [step, setStep] = useState("pick");
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [error, setError] = useState("");

  const handleSelectTemplate = (schema) => {
    setSelectedSchema(schema);
    setFormValues({});
    setError("");
    setStep("form");
  };

  const handleFieldChange = (key, value) => {
    setFormValues((prev) => setDeep(prev, key, value));
  };

  const getFieldValue = (key) => {
    return key.split(".").reduce((acc, k) => acc?.[k], formValues) ?? "";
  };

  const handleBack = () => {
    setStep("pick");
    setSelectedSchema(null);
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const missingRequired = selectedSchema.fields.some(
      (field) => field.required !== false && !getFieldValue(field.key)
    );

    if (missingRequired) {
      setError("Mohon lengkapi semua field yang wajib diisi.");
      return;
    }

    const newWidget = {
      id: slugify(formValues.title, selectedSchema.type),
      type: selectedSchema.type,
      title: formValues.title,
      deviceId: formValues.deviceId || "node-01",
      ...formValues,
    };

    onAddWidget(newWidget);
    onClose();
  };

  return (
    <div className="modal-backdrop-blur" onClick={onClose}>
      <div
        className="widget-builder-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-flex">
          {step === "form" ? (
            <button
              type="button"
              className="action-icon-btn"
              onClick={handleBack}
              aria-label="Kembali"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800, color: "var(--text-main)" }}>
              <LayoutGrid size={20} style={{ color: "var(--primary-emerald)" }} /> Grafana Widget Gallery
            </span>
          )}

          <button
            type="button"
            className="action-icon-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {step === "pick" && (
          <div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              Pilih tipe widget telemetri yang ingin ditambahkan ke dashboard dinamis Anda:
            </p>
            <div className="type-selector-grid">
              {schemas.map((schema) => (
                <button
                  type="button"
                  key={schema.type}
                  className="type-option-card"
                  onClick={() => handleSelectTemplate(schema)}
                >
                  <span className="type-option-icon">{schema.icon}</span>
                  <span className="type-option-title">{schema.label}</span>
                  <span className="type-option-desc">{schema.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)", marginBottom: 8 }}>
              Konfigurasi Widget: {selectedSchema.label}
            </h3>

            {selectedSchema.fields.map((field) => (
              <div key={field.key} className="form-group-field">
                <label>
                  {field.label}
                  {field.required === false ? " (opsional)" : " *"}
                </label>
                <input
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={getFieldValue(field.key)}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              </div>
            ))}

            {error && <p style={{ color: "var(--accent-red)", fontSize: 13, fontWeight: 600 }}>{error}</p>}

            <button type="submit" className="btn-emerald" style={{ justifyContent: "center", marginTop: 12 }}>
              <Plus size={18} />
              Tambahkan ke Dashboard
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default WidgetBuilder;