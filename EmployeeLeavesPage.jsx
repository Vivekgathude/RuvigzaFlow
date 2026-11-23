import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Send,
  UserRound,
  BriefcaseBusiness,
  Wifi,
} from "lucide-react";
import { supabase } from "./supabase";
import { C, Panel, PageHeader } from "./ui";

const INITIAL_FORM = {
  leave_type: "Casual Leave",
  start_date: "",
  end_date: "",
  reason: "",
};

const getLeaveDaysExcludingSundays = (start, end) => {
  if (!start || !end || end < start) return 0;
  const from = new Date(`${start}T12:00:00`);
  const to = new Date(`${end}T12:00:00`);
  let count = 0;
  for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
    if (day.getDay() !== 0) count += 1;
  }
  return count;
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusStyle = (status) => {
  if (status === "accepted") {
    return { color: "#166534", background: "#DCFCE7", label: "Accepted" };
  }
  if (status === "rejected") {
    return { color: "#991B1B", background: "#FEE2E2", label: "Rejected" };
  }
  return { color: "#92400E", background: "#FEF3C7", label: "Pending" };
};

export default function EmployeeLeavesPage({ currentUser }) {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roleName, setRoleName] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  const employeeId = profile?.id;
  const requestedDays = getLeaveDaysExcludingSundays(form.start_date, form.end_date);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let member = null;
      const byAuth = await supabase
        .from("team_members")
        .select("id, auth_user_id, name, role, employment_role_id, employment_type, total_leaves, leaves_taken, leaves_remaining, confirmation_date")
        .eq("auth_user_id", currentUser.id)
        .maybeSingle();
      if (byAuth.error) throw byAuth.error;
      member = byAuth.data;

      // Compatibility fallback for sessions where currentUser.id is already team_members.id.
      if (!member) {
        const byMemberId = await supabase
          .from("team_members")
          .select("id, auth_user_id, name, role, employment_role_id, employment_type, total_leaves, leaves_taken, leaves_remaining, confirmation_date")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (byMemberId.error) throw byMemberId.error;
        member = byMemberId.data;
      }
      if (!member) throw new Error("Employee profile could not be found in team_members.");
      setProfile(member);

      if (member.employment_role_id) {
        const { data: role, error: roleError } = await supabase
          .from("roles")
          .select("id, name")
          .eq("id", member.employment_role_id)
          .maybeSingle();
        if (roleError) console.warn("Employee role lookup error:", roleError);
        setRoleName(role?.name || "Employee");
      } else {
        setRoleName(member.role === "admin" ? "Admin" : "Employee");
      }

      const today = new Date().toLocaleDateString("en-CA");
      const { data: todayRows, error: timesheetError } = await supabase
        .from("employee_timesheets")
        .select("check_in, check_out")
        .eq("employee_id", member.id)
        .eq("work_date", today)
        .not("check_in", "is", null)
        .order("check_in", { ascending: false })
        .limit(1);
      if (timesheetError) console.warn("Employee online status lookup error:", timesheetError);
      const currentShift = todayRows?.[0];
      setIsOnline(Boolean(currentShift?.check_in && !currentShift?.check_out));

      const { data, error: requestsError } = await supabase
        .from("leave_requests")
        .select("id, employee_id, leave_type, start_date, end_date, total_days, reason, status, admin_remark, created_at, decided_at")
        .eq("employee_id", member.id)
        .order("created_at", { ascending: false });
      if (requestsError) throw requestsError;
      setRequests(data || []);
    } catch (err) {
      console.error("Leaves page load error:", err);
      setError(err.message || "Unable to load leave information.");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update the employee's request list as soon as Admin changes its status.
  useEffect(() => {
    if (!employeeId) return undefined;
    const channel = supabase
      .channel(`employee-leave-requests-${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
          filter: `employee_id=eq.${employeeId}`,
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, loadData]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!employeeId) {
      setError("Employee profile is not ready. Please refresh the page.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError("Please select both leave start date and end date.");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("End date cannot be earlier than start date.");
      return;
    }
    if (requestedDays < 1) {
      setError("Selected dates do not include any leave day (Sundays are excluded). Please choose another date range.");
      return;
    }
    if (!form.reason.trim()) {
      setError("Please enter the reason for your leave.");
      return;
    }
    if (profile?.leaves_remaining != null && requestedDays > Number(profile.leaves_remaining)) {
      setError(`You have only ${profile.leaves_remaining} leave day(s) remaining.`);
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: requestedDays,
        reason: form.reason.trim(),
        status: "pending",
      });
      if (insertError) throw insertError;
      setForm(INITIAL_FORM);
      setSuccess("Leave request sent to Admin successfully.");
      await loadData();
    } catch (err) {
      console.error("Leave request submit error:", err);
      setError(err.message || "Unable to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  const statCard = (label, value, color, icon) => {
    const Icon = icon;
    return (
      <div key={label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: C.inkSoft, fontSize: 12, fontWeight: 600 }}>{label}</span>
          <Icon size={17} color={color} />
        </div>
        <div style={{ marginTop: 10, fontSize: 26, fontWeight: 750, color: C.ink, lineHeight: 1.1 }}>{value ?? "—"}</div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Leaves"
        subtitle="Apply for leave, track request status, and review your leave balance."
      />

      {error && <div role="alert" style={{ marginBottom: 14, padding: "11px 13px", borderRadius: 8, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13 }}>{error}</div>}
      {success && <div role="status" style={{ marginBottom: 14, padding: "11px 13px", borderRadius: 8, color: "#166534", background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 13 }}>{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 18 }} className="employee-leave-stats">
        {statCard("Total Leaves", profile?.total_leaves ?? 0, "#2563EB", CalendarDays)}
        {statCard("Leaves Taken", profile?.leaves_taken ?? 0, "#D97706", CheckCircle2)}
        {statCard("Leaves Remaining", profile?.leaves_remaining ?? 0, "#16A34A", Clock3)}
        {statCard("Confirmation Date", formatDate(profile?.confirmation_date), "#7C3AED", FileText)}
      </div>

      <Panel style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 750, color: C.ink }}><UserRound size={18} /> Employee Profile</div>
            <div style={{ marginTop: 4, fontSize: 12, color: C.inkSoft }}>Your employment details and current leave balance</div>
          </div>
          <button type="button" onClick={loadData} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${C.border}`, background: C.panel, color: C.ink, borderRadius: 8, padding: "8px 11px", fontSize: 12, fontWeight: 650, cursor: loading ? "wait" : "pointer" }}><RefreshCw size={14} /> Refresh</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }} className="employee-leave-profile-grid">
          <ProfileItem label="Employee Name" value={profile?.name || currentUser?.name || "—"} />
          <ProfileItem label="Role" value={roleName || (profile?.role === "admin" ? "Admin" : "Employee")} icon={BriefcaseBusiness} />
          <ProfileItem label="Online Status" value={isOnline ? "Online" : "Offline"} online={isOnline} icon={Wifi} />
          <ProfileItem label="Confirmation Date" value={formatDate(profile?.confirmation_date)} />
          <ProfileItem label="Financial Year Leave Entitlement" value={`${profile?.total_leaves ?? 0} day(s)`} />
          <ProfileItem label="Leave Balance" value={`${profile?.leaves_remaining ?? 0} day(s)`} />
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 18, alignItems: "start" }} className="employee-leave-main-grid">
        <Panel style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5, fontSize: 16, fontWeight: 750, color: C.ink }}><Send size={17} /> Apply for Leave</div>
          <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.6, marginBottom: 18 }}>Your request will remain pending until Admin reviews it. Leave balance is deducted only after acceptance.</div>
          <form onSubmit={submitRequest}>
            <FieldLabel>Leave Type</FieldLabel>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} style={inputStyle}>
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Personal Leave</option>
              <option>Other</option>
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><FieldLabel>From Date</FieldLabel><input type="date" min={new Date().toISOString().slice(0, 10)} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: form.end_date && form.end_date < e.target.value ? e.target.value : form.end_date })} style={inputStyle} required /></div>
              <div><FieldLabel>To Date</FieldLabel><input type="date" min={form.start_date || new Date().toISOString().slice(0, 10)} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} required /></div>
            </div>
            <div style={{ padding: "10px 12px", margin: "4px 0 14px", background: "#EFF6FF", borderRadius: 8, color: "#1D4ED8", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span>Requested leave days (Sundays excluded)</span><strong>{requestedDays}</strong></div>
            <FieldLabel>Reason for Leave</FieldLabel>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Briefly explain why you need leave..." rows={4} maxLength={1000} style={{ ...inputStyle, resize: "vertical", minHeight: 94 }} required />
            <button type="submit" disabled={submitting || loading || !employeeId} style={{ width: "100%", marginTop: 5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", borderRadius: 9, padding: "12px 14px", background: submitting ? "#94A3B8" : "#0F172A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: submitting ? "wait" : "pointer" }}><Send size={15} />{submitting ? "Sending Request…" : "Submit Leave Request"}</button>
          </form>
        </Panel>

        <Panel style={{ padding: 20, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div><div style={{ fontSize: 16, fontWeight: 750, color: C.ink }}>My Leave Requests</div><div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>Check whether each request is pending, accepted, or rejected.</div></div>
            <span style={{ padding: "4px 9px", borderRadius: 20, background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 700 }}>{requests.length} request(s)</span>
          </div>
          {loading ? <div style={{ padding: 30, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>Loading leave details…</div> : requests.length === 0 ? <div style={{ padding: "30px 14px", border: `1px dashed ${C.border}`, borderRadius: 10, textAlign: "center" }}><CalendarDays size={25} color={C.inkSoft} /><div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.ink }}>No leave requests yet</div><div style={{ marginTop: 4, fontSize: 12, color: C.inkSoft }}>Your submitted requests will appear here.</div></div> : <div style={{ display: "grid", gap: 11 }}>{requests.map((request) => {
            const status = statusStyle(request.status);
            return <div key={request.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}><div style={{ fontSize: 13, fontWeight: 750, color: C.ink }}>{request.leave_type || "Leave"}</div><span style={{ flexShrink: 0, background: status.background, color: status.color, borderRadius: 20, padding: "4px 9px", fontSize: 11, fontWeight: 750 }}>{status.label}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, color: C.inkSoft, fontSize: 12 }}><CalendarDays size={14} />{formatDate(request.start_date)} – {formatDate(request.end_date)} <strong style={{ color: C.ink }}>({request.total_days ?? getLeaveDaysExcludingSundays(request.start_date, request.end_date)} day(s))</strong></div>
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6, color: C.ink }}>{request.reason}</div>
              {request.admin_remark && <div style={{ marginTop: 9, padding: "8px 10px", borderRadius: 7, background: "#F8FAFC", color: C.inkSoft, fontSize: 12 }}><strong style={{ color: C.ink }}>Admin remark:</strong> {request.admin_remark}</div>}
              <div style={{ marginTop: 9, color: C.inkSoft, fontSize: 11 }}>Submitted: {formatDate(request.created_at)}</div>
            </div>;
          })}</div>}
        </Panel>
      </div>
      <style>{`@media (max-width: 900px) { .employee-leave-main-grid { grid-template-columns: 1fr !important; } .employee-leave-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } .employee-leave-profile-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } } @media (max-width: 520px) { .employee-leave-profile-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label style={{ display: "block", margin: "10px 0 6px", fontSize: 12, fontWeight: 700, color: C.ink }}>{children}</label>;
}

function ProfileItem({ label, value, online = false, icon: Icon }) {
  return <div style={{ padding: "11px 12px", border: `1px solid ${C.border}`, borderRadius: 8, minWidth: 0 }}><div style={{ color: C.inkSoft, fontSize: 11, marginBottom: 6 }}>{label}</div><div style={{ display: "flex", alignItems: "center", gap: 6, color: online ? "#16A34A" : C.ink, fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>{Icon && <Icon size={14} />}{online && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A" }} />}{value || "—"}</div></div>;
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  background: C.panel,
  color: C.ink,
  padding: "10px 11px",
  fontSize: 13,
  outline: "none",
  marginBottom: 8,
};
