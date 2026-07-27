import { useState } from "react";
import { X, Plus, Layers, Trash2, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { projectsAPI } from "../services/api";

function ProjectModal({ projects, activeProject, onSelectProject, onCreateProject, onDeleteProject, onClose }) {
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setError("Nama project tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await projectsAPI.create(newProjectName.trim());
      const newProj = {
        id: res.data?.id || `proj-${Date.now()}`,
        name: res.data?.name || newProjectName.trim(),
      };

      onCreateProject(newProj);
      setNewProjectName("");

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10B981", "#34D399", "#A7F3D0"]
      });
    } catch (err) {
      console.warn("Backend project creation warning:", err);
      // Fallback local state creation
      const newProj = {
        id: `proj-${Date.now()}`,
        name: newProjectName.trim(),
      };
      onCreateProject(newProj);
      setNewProjectName("");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projId) => {
    try {
      await projectsAPI.delete(projId);
    } catch (err) {
      console.warn("Backend project deletion warning:", err);
    }
    onDeleteProject(projId);
  };

  return (
    <div className="modal-backdrop-blur" onClick={onClose}>
      <div className="widget-builder-dialog" style={{ width: "min(500px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-flex">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-icon-emerald" style={{ width: 32, height: 32, fontSize: 16 }}>
              <Layers size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                Manajemen Project (Multi-Tenant)
              </h2>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
                Tambah, hapus, atau pilih project aktif di bawah account Anda
              </p>
            </div>
          </div>

          <button type="button" className="action-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Create New Project Form */}
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="+ Bikin Project Baru..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            style={{
              flex: 1,
              border: "1px solid var(--glass-card-border)",
              borderRadius: "var(--radius-card)",
              padding: "10px 16px",
              background: "rgba(3, 18, 12, 0.8)",
              color: "white",
              fontSize: 13,
              outline: "none"
            }}
          />
          <button type="submit" className="btn-emerald-primary" disabled={loading} style={{ padding: "10px 18px", fontSize: 13 }}>
            <Plus size={16} /> {loading ? "Buat..." : "Buat"}
          </button>
        </form>

        {error && <p style={{ color: "#EF4444", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</p>}

        {/* Existing Projects List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Daftar Project Aktif:</label>

          {projects.map((proj) => {
            const isSelected = activeProject === proj.name;
            return (
              <div
                key={proj.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 18,
                  background: isSelected ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  border: isSelected ? "1px solid var(--emerald-neon)" : "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer"
                }}
                onClick={() => onSelectProject(proj.name)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Layers size={16} style={{ color: isSelected ? "var(--emerald-neon)" : "var(--text-secondary)" }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "#A7F3D0" : "var(--text-primary)" }}>
                    {proj.name}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: 10, fontWeight: 800, background: "var(--emerald-neon)", color: "#02120C", padding: "2px 8px", borderRadius: 999 }}>
                      ACTIVE
                    </span>
                  )}
                </div>

                {projects.length > 1 && (
                  <button
                    type="button"
                    className="action-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(proj.id);
                    }}
                    title="Hapus Project"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProjectModal;
