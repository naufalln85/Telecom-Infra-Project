import { useState, useEffect, useCallback } from "react";
import {
  Users as UsersIcon, Plus, Search, Filter, RefreshCw, Shield,
  CheckCircle2, Mail, UserPlus, Trash2, MoreHorizontal, Building, Key
} from "lucide-react";
import { membersAPI, projectsAPI } from "../../services/api";

export default function UsersView({ activeProject, userAccount }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Invite Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("Admin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const projectId = activeProject?.id || 1;
  const orgName = activeProject?.name || "My organization - 2464XA";

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersAPI.list(projectId);
      if (res && res.data && res.data.length > 0) {
        setMembers(res.data);
      } else {
        // Fallback default user if DB is fresh
        setMembers([
          {
            id: userAccount?.id || 1,
            email: userAccount?.email || "naufalmaulanahasan@gmail.com",
            name: userAccount?.name ? `${userAccount.name} (you)` : "naufal (you)",
            role: "Admin",
            status: "Active",
            last_logged_at: "12:30 PM Today",
          }
        ]);
      }
    } catch {
      setMembers([
        {
          id: 1,
          email: userAccount?.email || "naufalmaulanahasan@gmail.com",
          name: userAccount?.name ? `${userAccount.name} (you)` : "naufal (you)",
          role: "Admin",
          status: "Active",
          last_logged_at: "12:30 PM Today",
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [projectId, userAccount]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      await membersAPI.invite(projectId, inviteEmail, inviteName, inviteRole);
      setSuccessMsg(`User ${inviteEmail} berhasil ditambahkan ke organisasi dengan role ${inviteRole}!`);
      setInviteEmail("");
      setInviteName("");
      fetchMembers();
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setSuccessMsg("");
      }, 1500);
    } catch (err) {
      setError(err.message || "Gagal mengundang anggota baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="blynk-users-container">
      {/* ── TOP TITLE & ACTION BAR (Matching Image 2) ── */}
      <div className="blynk-users-header">
        <h1 className="blynk-page-title">Users</h1>

        <button
          type="button"
          className="btn-blynk-green-action"
          onClick={() => {
            setIsInviteModalOpen(true);
            setError("");
            setSuccessMsg("");
          }}
        >
          <Plus size={16} /> Create New User
        </button>
      </div>

      {/* ── TOOLBAR: SEARCH & FILTERS (Matching Image 2) ── */}
      <div className="blynk-users-toolbar">
        <div className="blynk-search-input-box">
          <Search size={16} className="search-icon" />
          <input
            placeholder="Start typing"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="blynk-users-filter-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All {filteredMembers.length}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            My organization members
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "nodevice" ? "active" : ""}`}
            onClick={() => setActiveTab("nodevice")}
          >
            With no devices
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <button type="button" className="btn-icon-square" onClick={fetchMembers} title="Refresh Users List">
          <RefreshCw size={15} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* ── USERS DATA TABLE (Matching Image 2) ── */}
      <div className="blynk-table-card">
        <table className="blynk-data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Last Logged At</th>
              <th>Role</th>
              <th>Organization</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                  <UsersIcon size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div>Belum ada anggota di organisasi ini. Klik <b>+ Create New User</b> untuk menambahkan.</div>
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td><input type="checkbox" /></td>
                  <td className="user-name-cell">
                    <strong>{member.name || member.email.split("@")[0]}</strong>
                  </td>
                  <td className="email-cell">{member.email}</td>
                  <td>
                    <span className="status-badge-pill online">
                      <span className="dot" /> {member.status || "Active"}
                    </span>
                  </td>
                  <td className="time-cell">{member.last_logged_at || "12:30 PM Today"}</td>
                  <td>
                    <span className="role-chip-pill admin">
                      {member.role || "Admin"}
                    </span>
                  </td>
                  <td className="org-cell">
                    <Building size={13} style={{ display: "inline", marginRight: 4 }} />
                    {orgName}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn-icon-square" title="User Actions">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── INVITE NEW USER MODAL (Matching Image 2) ── */}
      {isInviteModalOpen && (
        <div className="blynk-modal-overlay">
          <div className="blynk-modal-box" style={{ maxWidth: 460 }}>
            <h3>Create / Invite New User</h3>
            <p>Tambah anggota baru ke organisasi <b>{orgName}</b> dan atur hak aksesnya.</p>

            <form onSubmit={handleInvite} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group">
                <label>Nama Anggota</label>
                <input
                  placeholder="e.g. Naufal Maulana"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Role / Akses Permission</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="Admin">Admin (Full Control, Add Devices, Manage Users)</option>
                  <option value="Staff">Staff (Control Devices, Trigger Actuators)</option>
                  <option value="Viewer">Viewer (Read-Only Telemetry View)</option>
                </select>
              </div>

              {error && <p style={{ color: "#EF4444", fontSize: 12, fontWeight: 700 }}>{error}</p>}
              {successMsg && <p style={{ color: "#10B981", fontSize: 12, fontWeight: 700 }}>{successMsg}</p>}

              <div className="modal-actions" style={{ marginTop: 10 }}>
                <button type="button" className="btn-blynk-outlined" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-blynk-green-action" disabled={isSubmitting}>
                  {isSubmitting ? "Inviting..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
