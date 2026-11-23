
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "./supabase";
import { C, Panel, PageHeader } from "./ui";

const formatDate = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(
    "en-IN",
    withTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : { day: "2-digit", month: "short", year: "numeric" }
  );
};

const statusMeta = {
  pending: { label: "Pending", color: "#92400E", bg: "#FEF3C7" },
  accepted: { label: "Approved", color: "#166534", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#991B1B", bg: "#FEE2E2" },
};

export default function AdminLeaveRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: leaveRows, error: leaveError } = await supabase
        .from("leave_requests")
        .select(
          "id, employee_id, leave_type, start_date, end_date, total_days, reason, status, admin_remark, created_at, decided_at"
        )
        .order("created_at", { ascending: false });

      if (leaveError) throw leaveError;

      const rows = leaveRows || [];
      const employeeIds = [
        ...new Set(rows.map((r) => r.employee_id).filter(Boolean)),
      ];

      let membersById = {};
      let roleIds = [];

      if (employeeIds.length) {
        const { data: members, error: membersError } = await supabase
          .from("team_members")
          .select("id, name, role, employment_role_id, employment_type")
          .in("id", employeeIds);

        if (membersError) throw membersError;

        membersById = Object.fromEntries(
          (members || []).map((m) => [m.id, m])
        );

        roleIds = [
          ...new Set(
            (members || [])
              .map((m) => m.employment_role_id)
              .filter(Boolean)
          ),
        ];
      }

      let rolesById = {};

      if (roleIds.length) {
        const { data: roles, error: rolesError } = await supabase
          .from("roles")
          .select("id, name")
          .in("id", roleIds);

        if (rolesError) console.warn("Leave request role lookup:", rolesError);

        rolesById = Object.fromEntries(
          (roles || []).map((r) => [r.id, r.name])
        );
      }

      setRequests(
        rows.map((row) => {
          const member = membersById[row.employee_id] || {};

          return {
            ...row,
            employee_name: member.name || "Unknown employee",
            employee_role:
              (member.employment_role_id &&
                rolesById[member.employment_role_id]) ||
              (member.role === "admin"
                ? "Admin"
                : member.role || member.employment_type || "Employee"),
          };
        })
      );
    } catch (err) {
      console.error("Admin leave requests load error:", err);
      setError(
        err.message ||
          "Unable to load leave requests. Check Supabase permissions and table setup."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel("admin-leave-requests-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
        },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const decideRequest = async (request, status) => {
    const action = status === "accepted" ? "approve" : "reject";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${request.employee_name}'s leave request?`
      )
    ) {
      return;
    }

    setBusyId(request.id);
    setError("");
    setSuccess("");

    try {
      const { data, error: updateError } = await supabase
        .from("leave_requests")
        .update({ status })
        .eq("id", request.id)
        .eq("status", "pending")
        .select("id, status");

      if (updateError) throw updateError;

      if (!data?.length) {
        throw new Error(
          "This request may already have been reviewed. Refresh the page and try again."
        );
      }

      setSuccess(
        status === "accepted"
          ? `Leave approved for ${request.employee_name}. Their leave balance will be updated automatically.`
          : `Leave request rejected for ${request.employee_name}.`
      );

      await loadRequests();
    } catch (err) {
      console.error("Leave request decision error:", err);
      setError(err.message || `Unable to ${action} this request.`);
    } finally {
      setBusyId(null);
    }
  };

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests.filter((r) => {
      const statusMatches = filter === "all" || r.status === filter;

      const searchMatches =
        !term ||
        [r.employee_name, r.employee_role, r.leave_type, r.reason].some(
          (value) => String(value || "").toLowerCase().includes(term)
        );

      return statusMatches && searchMatches;
    });
  }, [requests, filter, search]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "accepted").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  // Click a statistic card to show that status's requests.
  const selectStatus = (status) => {
    setFilter(status);
    setSuccess("");
  };

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        subtitle="Review employee leave requests and approve or reject pending applications."
      />

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: "11px 13px",
            borderRadius: 8,
            color: "#991B1B",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: "11px 13px",
            borderRadius: 8,
            color: "#166534",
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            fontSize: 13,
          }}
        >
          {success}
        </div>
      )}

      <div
        className="admin-leave-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <Stat
          label="Pending Requests"
          value={pendingCount}
          color="#D97706"
          icon={Clock3}
          selected={filter === "pending"}
          onClick={() => selectStatus("pending")}
        />

        <Stat
          label="Approved Requests"
          value={approvedCount}
          color="#16A34A"
          icon={CheckCircle2}
          selected={filter === "accepted"}
          onClick={() => selectStatus("accepted")}
        />

        <Stat
          label="Rejected Requests"
          value={rejectedCount}
          color="#DC2626"
          icon={XCircle}
          selected={filter === "rejected"}
          onClick={() => selectStatus("rejected")}
        />
      </div>

      <Panel style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 750,
              color: C.ink,
            }}
          >
            Employee Applications{" "}
            <span style={{ color: C.inkSoft, fontWeight: 500 }}>
              ({visibleRequests.length})
            </span>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            style={secondaryButton}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div
          className="admin-leave-filters"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 1fr) minmax(220px, 1.6fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <select
            aria-label="Filter by status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={fieldStyle}
          >
            <option value="pending">Pending requests</option>
            <option value="accepted">Approved requests</option>
            <option value="rejected">Rejected requests</option>
            <option value="all">All requests</option>
          </select>

          <div style={{ position: "relative" }}>
            <Search
              size={15}
              color={C.inkSoft}
              style={{
                position: "absolute",
                left: 11,
                top: 12,
              }}
            />

            <input
              aria-label="Search leave requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, role, leave type…"
              style={{
                ...fieldStyle,
                paddingLeft: 34,
                marginBottom: 0,
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={emptyStyle}>Loading leave requests…</div>
        ) : visibleRequests.length === 0 ? (
          <div style={emptyStyle}>
            <CalendarDays size={26} color={C.inkSoft} />

            <div
              style={{
                marginTop: 8,
                fontWeight: 700,
                color: C.ink,
              }}
            >
              {requests.length === 0
                ? "No leave requests yet"
                : "No requests match this filter"}
            </div>

            <div style={{ marginTop: 4 }}>
              Employee requests will appear here after they are submitted.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {visibleRequests.map((request) => {
              const status = statusMeta[request.status] || statusMeta.pending;
              const busy = busyId === request.id;

              return (
                <article
                  key={request.id}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 11,
                    padding: 15,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: C.ink,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {request.employee_name}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: C.inkSoft,
                        }}
                      >
                        {request.employee_role}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: 20,
                        background: status.bg,
                        color: status.color,
                        fontSize: 11,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div
                    className="admin-leave-details"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <Detail
                      label="Leave Type"
                      value={request.leave_type || "Leave"}
                    />

                    <Detail
                      label="Leave Date(s)"
                      value={`${formatDate(request.start_date)}${
                        request.end_date &&
                        request.end_date !== request.start_date
                          ? ` – ${formatDate(request.end_date)}`
                          : ""
                      } · ${request.total_days ?? "—"} day(s)`}
                    />

                    <Detail
                      label="Request Date"
                      value={formatDate(request.created_at, true)}
                    />
                  </div>

                  {request.reason && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 11px",
                        borderRadius: 8,
                        background: C.panelAlt || "#F8FAFC",
                        color: C.ink,
                        fontSize: 12,
                        lineHeight: 1.6,
                        overflowWrap: "anywhere",
                      }}
                    >
                      <strong>Reason:</strong> {request.reason}
                    </div>
                  )}

                  {request.admin_remark && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: C.inkSoft,
                      }}
                    >
                      <strong>Admin remark:</strong> {request.admin_remark}
                    </div>
                  )}

                  {request.status === "pending" && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 9,
                        flexWrap: "wrap",
                        marginTop: 14,
                      }}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decideRequest(request, "rejected")}
                        style={{
                          ...actionButton,
                          color: "#B91C1C",
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          opacity: busy ? 0.65 : 1,
                        }}
                      >
                        <XCircle size={15} />
                        {busy ? "Processing…" : "Reject"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decideRequest(request, "accepted")}
                        style={{
                          ...actionButton,
                          color: "#fff",
                          background: "#15803D",
                          border: "1px solid #15803D",
                          opacity: busy ? 0.65 : 1,
                        }}
                      >
                        <CheckCircle2 size={15} />
                        {busy ? "Processing…" : "Approve Leave"}
                      </button>
                    </div>
                  )}

                  {request.status !== "pending" && request.decided_at && (
                    <div
                      style={{
                        marginTop: 11,
                        fontSize: 11,
                        color: C.inkSoft,
                      }}
                    >
                      Reviewed on {formatDate(request.decided_at, true)}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <style>{`
        @media (max-width: 760px) {
          .admin-leave-stats {
            grid-template-columns: 1fr !important;
          }

          .admin-leave-filters {
            grid-template-columns: 1fr !important;
          }

          .admin-leave-details {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, color, icon: Icon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${label}: ${value}. Click to view these requests.`}
      style={{
        display: "block",
        width: "100%",
        minWidth: 0,
        textAlign: "left",
        padding: 0,
        border: "none",
        borderRadius: 11,
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        outlineOffset: 3,
      }}
    >
      <Panel
        style={{
          padding: 15,
          minWidth: 0,
          border: selected
            ? `2px solid ${color}`
            : `1px solid ${C.border}`,
          background: selected ? `${color}0D` : C.panel,
          boxShadow: selected ? `0 0 0 2px ${color}18` : "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: C.inkSoft,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {label}
          </span>

          <Icon size={17} color={color} />
        </div>

        <div
          style={{
            marginTop: 9,
            fontSize: 27,
            fontWeight: 800,
            color: C.ink,
          }}
        >
          {value}
        </div>

        <div
          style={{
            marginTop: 7,
            fontSize: 10,
            fontWeight: 700,
            color,
          }}
        >
          {selected ? "Currently viewing" : "Click to view"}
        </div>
      </Panel>
    </button>
  );
}

function Detail({ label, value }) {
  return (
    <div
      style={{
        padding: "10px 11px",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: C.inkSoft,
          fontSize: 11,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: C.ink,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.5,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  background: C.panel,
  color: C.ink,
  padding: "10px 11px",
  fontSize: 12,
  outline: "none",
  marginBottom: 0,
};

const secondaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  border: `1px solid ${C.border}`,
  background: C.panel,
  color: C.ink,
  borderRadius: 8,
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const actionButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  borderRadius: 8,
  padding: "9px 13px",
  fontSize: 12,
  fontWeight: 750,
  cursor: "pointer",
};

const emptyStyle = {
  padding: "32px 14px",
  textAlign: "center",
  color: C.inkSoft,
  fontSize: 12,
  border: `1px dashed ${C.border}`,
  borderRadius: 10,
};
