
import React, { useEffect, useMemo, useState } from "react";

import {
  Users,
  UserPlus,
  CheckCircle2,
  TrendingUp,
  UploadCloud,
  ArrowUpRight,
  IndianRupee,
  Wallet,
  Trophy,
  BriefcaseBusiness,
  Mail,
  Phone,
  CalendarDays,
} from "lucide-react";

import {
  C,
  Panel,
  PageHeader,
  EmptyNote,
} from "./ui";

import { supabase } from "./supabase";

/* =========================================================
   HELPERS
========================================================= */

const fmtDate = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getSalary = (employee) =>
  Number(
    employee?.monthlySalary ??
      employee?.monthly_salary ??
      0
  ) || 0;

const getLeadAssignee = (lead) =>
  lead?.assignedEmployeeId ??
  lead?.assigned_employee_id ??
  lead?.assigned_to ??
  null;

const getClosedBy = (lead) =>
  lead?.closed_by ??
  lead?.closedBy ??
  null;

const isClosedLead = (lead) =>
  String(lead?.status || "").toLowerCase() === "closed";

/* =========================================================
   EMPLOYEE PROFILE AVATAR

   Displays profile picture when available.
   Falls back to the employee's initial if the image
   is missing or cannot be loaded.
========================================================= */

function EmployeeProfileAvatar({ name, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const initial = (name || "E").trim().charAt(0).toUpperCase();

  return (
    <div className="employee-avatar">
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={`${name || "Employee"} profile`}
          className="employee-profile-image"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function Dashboard({
  leads = [],
  employees = [],
  uploadHistory = [],
  onNavigate,
}) {
  const [revenueRows, setRevenueRows] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState("");

  const [leaveRows, setLeaveRows] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveError, setLeaveError] = useState("");

  const [profilePictureUrls, setProfilePictureUrls] = useState({});

  /* -------------------------------------------------------
     LOAD PROFILE PICTURES FROM PRIVATE SUPABASE STORAGE

     AdminView supplies profilePicturePath from
     team_members.profile_picture_path.

     Signed URLs allow the private profile-photos bucket
     to display images without making the bucket public.
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadProfilePictures = async () => {
      const employeesWithPictures = employees.filter(
        (employee) =>
          employee?.id &&
          employee?.profilePicturePath
      );

      if (employeesWithPictures.length === 0) {
        setProfilePictureUrls({});
        return;
      }

      const results = await Promise.all(
        employeesWithPictures.map(async (employee) => {
          try {
            const { data, error } = await supabase.storage
              .from("profile-photos")
              .createSignedUrl(
                employee.profilePicturePath,
                3600
              );

            if (error) {
              console.error(
                "Profile picture URL error:",
                employee.id,
                error
              );

              return [String(employee.id), null];
            }

            return [
              String(employee.id),
              data?.signedUrl || null,
            ];
          } catch (error) {
            console.error(
              "Profile picture loading error:",
              employee.id,
              error
            );

            return [String(employee.id), null];
          }
        })
      );

      if (!cancelled) {
        setProfilePictureUrls(Object.fromEntries(results));
      }
    };

    loadProfilePictures();

    return () => {
      cancelled = true;
    };
  }, [employees]);

  /* -------------------------------------------------------
     LOAD REVENUE DATA
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadRevenue = async () => {
      setRevenueLoading(true);
      setRevenueError("");

      try {
        const { data, error } = await supabase
          .from("client_service_assignments")
          .select(`
            id,
            lead_id,
            status,
            completed_at,
            leads (
              id,
              package_amount,
              closed_at,
              close_budget,
              close_service
            )
          `)
          .eq("status", "Completed")
          .not("completed_at", "is", null)
          .not("leads.closed_at", "is", null)
          .not("leads.close_budget", "is", null)
          .not("leads.close_service", "is", null)
          .order("completed_at", { ascending: true });

        if (error) throw error;

        if (!cancelled) {
          setRevenueRows(data || []);
        }
      } catch (error) {
        console.error("Dashboard revenue error:", error);

        if (!cancelled) {
          setRevenueError(
            "Revenue data could not be loaded."
          );
          setRevenueRows([]);
        }
      } finally {
        if (!cancelled) {
          setRevenueLoading(false);
        }
      }
    };

    loadRevenue();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------
     LEAD STATISTICS
  ------------------------------------------------------- */

  const stats = useMemo(() => {
    const total = leads.length;

    const newLeads = leads.filter(
      (lead) => lead.status === "New"
    ).length;

    const closed = leads.filter(isClosedLead).length;

    const rate = total
      ? Math.round((closed / total) * 100)
      : 0;

    const bySource = {};
    const byEmployee = {};

    leads.forEach((lead) => {
      const source = lead.source || "Other";

      bySource[source] = (bySource[source] || 0) + 1;

      const assignedId = getLeadAssignee(lead);

      const employee = employees.find(
        (item) =>
          String(item.id) === String(assignedId)
      );

      const name = employee?.name || "Unassigned";

      byEmployee[name] = (byEmployee[name] || 0) + 1;
    });

    return {
      total,
      newLeads,
      closed,
      converted: closed,
      rate,
      bySource,
      byEmployee,
    };
  }, [leads, employees]);

  /* -------------------------------------------------------
     REVENUE STATISTICS

     One package amount per lead is counted to avoid
     counting the same package multiple times.
  ------------------------------------------------------- */

  const revenueStats = useMemo(() => {
    const now = new Date();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const uniqueLeads = new Map();

    revenueRows.forEach((row) => {
      const lead = Array.isArray(row.leads)
        ? row.leads[0]
        : row.leads;

      if (!lead?.id) return;

      const amount = Number(lead.package_amount);

      if (!Number.isFinite(amount) || amount < 0) return;

      const previous = uniqueLeads.get(lead.id);

      if (
        !previous ||
        new Date(row.completed_at) <
          new Date(previous.completedAt)
      ) {
        uniqueLeads.set(lead.id, {
          amount,
          completedAt: row.completed_at,
        });
      }
    });

    let totalRevenue = 0;
    let thisMonthRevenue = 0;

    uniqueLeads.forEach((item) => {
      totalRevenue += item.amount;

      const completedDate = new Date(item.completedAt);

      if (
        completedDate.getFullYear() === currentYear &&
        completedDate.getMonth() === currentMonth
      ) {
        thisMonthRevenue += item.amount;
      }
    });

    return {
      totalRevenue,
      thisMonthRevenue,
    };
  }, [revenueRows]);

  /* -------------------------------------------------------
     ACTIVE TEAM AND SALARY SUMMARY
  ------------------------------------------------------- */

  const teamStats = useMemo(() => {
    const activeEmployees = employees.filter(
      (employee) =>
        employee.isActive !== false &&
        employee.is_active !== false
    );

    const monthlySalary = activeEmployees.reduce(
      (total, employee) => total + getSalary(employee),
      0
    );

    return {
      activeEmployees,
      activeCount: activeEmployees.length,
      monthlySalary,
    };
  }, [employees]);

  /* -------------------------------------------------------
     LOAD APPROVED LEAVE REQUESTS
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadLeaves = async () => {
      setLeaveLoading(true);
      setLeaveError("");

      try {
        const { data, error } = await supabase
          .from("leave_requests")
          .select(`
            id,
            employee_id,
            leave_type,
            start_date,
            end_date,
            total_days,
            reason,
            status
          `)
          .in("status", ["accepted", "approved"])
          .order("start_date", { ascending: true });

        if (error) throw error;

        if (!cancelled) {
          setLeaveRows(data || []);
        }
      } catch (error) {
        console.error("Dashboard leave error:", error);

        if (!cancelled) {
          setLeaveError(
            "Leave information could not be loaded."
          );
          setLeaveRows([]);
        }
      } finally {
        if (!cancelled) {
          setLeaveLoading(false);
        }
      }
    };

    loadLeaves();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------
     EMPLOYEES CURRENTLY ON LEAVE
  ------------------------------------------------------- */

  const employeesOnLeave = useMemo(() => {
    const now = new Date();

    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    return leaveRows
      .filter((leave) => {
        const startDate = leave.start_date;
        const endDate = leave.end_date;

        return (
          startDate &&
          endDate &&
          startDate <= today &&
          endDate >= today
        );
      })
      .map((leave) => {
        const employee = employees.find(
          (item) =>
            String(item.id) === String(leave.employee_id)
        );

        return {
          ...leave,
          employeeId: employee?.id || leave.employee_id,
          profilePicturePath:
            employee?.profilePicturePath || null,
          employeeName:
            employee?.name || "Employee not found",
          employeeRole:
            employee?.employmentRoleName ||
            employee?.employment_role_name ||
            "Team Member",
        };
      })
      .filter(
        (leave) =>
          leave.employeeName !== "Employee not found"
      );
  }, [leaveRows, employees]);

  /* -------------------------------------------------------
     TEAM PERFORMANCE SUMMARY
  ------------------------------------------------------- */

  const performanceStats = useMemo(() => {
    const closedLeads = leads.filter(isClosedLead);

    const assignedLeads = leads.filter(
      (lead) => getLeadAssignee(lead)
    ).length;

    const performance = teamStats.activeEmployees.map(
      (employee) => {
        const employeeClosed = closedLeads.filter(
          (lead) =>
            String(getClosedBy(lead) || "") ===
            String(employee.id)
        ).length;

        return {
          ...employee,
          closedCount: employeeClosed,
        };
      }
    );

    performance.sort(
      (a, b) => b.closedCount - a.closedCount
    );

    return {
      assignedLeads,
      closedLeads: closedLeads.length,
      topPerformer:
        performance.length > 0 &&
        performance[0].closedCount > 0
          ? performance[0]
          : null,
      employeePerformance: performance,
    };
  }, [leads, teamStats.activeEmployees]);

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="crm-dashboard">

      {/* HEADER */}

      <div className="dashboard-header">
        <PageHeader
          title="Dashboard"
          subtitle="Overview across your sales and marketing team."
        />

        <div className="live-crm">
          <span className="live-dot" />
          <span className="live-label">LIVE</span>
          <span className="live-divider" />
          <span className="live-title">CRM + ERP SOLUTION</span>
        </div>
      </div>

      {/* LEAD STAT CARDS */}

      <div className="stats-grid">
        <DashboardStat
          icon={Users}
          label="Total Leads"
          value={stats.total}
          description="All CRM records"
          accent={C.primaryDeep}
          onClick={() => onNavigate?.("leads")}
        />

        <DashboardStat
          icon={UserPlus}
          label="New Leads"
          value={stats.newLeads}
          description="Waiting to be worked"
          accent={C.accentDeep}
          onClick={() => onNavigate?.("leads")}
        />

        <DashboardStat
          icon={CheckCircle2}
          label="Converted"
          value={stats.converted}
          description="Successfully converted"
          accent={C.primary}
          onClick={() => onNavigate?.("closed")}
        />

        <DashboardStat
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${stats.rate}%`}
          description="Closed leads / total leads"
          accent={C.primaryDeep}
        />
      </div>

      {/* REVENUE + SALARY */}

      <SectionTitle
        title="Business Overview"
        subtitle="Revenue and estimated monthly salary expenses"
      />

      <div className="stats-grid overview-grid">
        <DashboardStat
          icon={IndianRupee}
          label="Total Revenue"
          value={
            revenueLoading
              ? "Loading..."
              : revenueError
                ? "Unavailable"
                : formatCurrency(revenueStats.totalRevenue)
          }
          description="Completed client packages"
          accent={C.primary}
          onClick={() => onNavigate?.("revenue")}
        />

        <DashboardStat
          icon={TrendingUp}
          label="This Month Revenue"
          value={
            revenueLoading
              ? "Loading..."
              : revenueError
                ? "Unavailable"
                : formatCurrency(revenueStats.thisMonthRevenue)
          }
          description="Packages completed this month"
          accent={C.primaryDeep}
          onClick={() => onNavigate?.("revenue")}
        />

        <DashboardStat
          icon={Wallet}
          label="Monthly Salary Expense"
          value={formatCurrency(teamStats.monthlySalary)}
          description="Active employees' fixed monthly salary"
          accent={C.accentDeep}
          onClick={() => onNavigate?.("team")}
        />

        <DashboardStat
          icon={BriefcaseBusiness}
          label="Active Employees"
          value={teamStats.activeCount}
          description="Currently active sales team"
          accent={C.primaryDeep}
          onClick={() => onNavigate?.("team")}
        />
      </div>

      {revenueError && (
        <div className="dashboard-notice">
          {revenueError} Open Revenue Dashboard to investigate.
        </div>
      )}

      {/* TEAM PERFORMANCE */}

      <Panel
        style={{
          marginBottom: 16,
          padding: 20,
        }}
      >
        <SectionHeader
          icon={Trophy}
          title="Team Performance"
          subtitle="Quick overview of lead assignment and conversions"
          right={
            <button
              type="button"
              className="dashboard-text-button"
              onClick={() => onNavigate?.("performance")}
            >
              View details <ArrowUpRight size={15} />
            </button>
          }
        />

        <div className="performance-grid">
          <PerformanceMetric
            label="Assigned Leads"
            value={performanceStats.assignedLeads}
            description="Leads assigned to a team member"
          />

          <PerformanceMetric
            label="Closed Leads"
            value={performanceStats.closedLeads}
            description="Successfully closed leads"
          />

          <PerformanceMetric
            label="Conversion Rate"
            value={`${stats.rate}%`}
            description="Closed leads / total leads"
          />

          <div className="top-performer-card">
            <div className="metric-label">Top Performer</div>

            {performanceStats.topPerformer ? (
              <>
                <div className="top-performer-name">
                  {performanceStats.topPerformer.name}
                </div>

                <div className="metric-description">
                  {performanceStats.topPerformer.closedCount} closed lead
                  {performanceStats.topPerformer.closedCount === 1
                    ? ""
                    : "s"}
                </div>
              </>
            ) : (
              <>
                <div className="top-performer-name">—</div>
                <div className="metric-description">
                  No closed leads recorded yet
                </div>
              </>
            )}
          </div>
        </div>
      </Panel>

      {/* ACTIVE TEAM MEMBERS */}

      <Panel
        style={{
          marginBottom: 16,
          padding: 20,
        }}
      >
        <SectionHeader
          icon={Users}
          title="Active Team Members"
          subtitle="Current active sales employees"
          right={
            <button
              type="button"
              className="dashboard-text-button"
              onClick={() => onNavigate?.("team")}
            >
              Manage team <ArrowUpRight size={15} />
            </button>
          }
        />

        {teamStats.activeEmployees.length === 0 ? (
          <EmptyNote text="No active team members found." />
        ) : (
          <div className="employee-grid">
            {teamStats.activeEmployees.map((employee) => {
              const performance =
                performanceStats.employeePerformance.find(
                  (item) =>
                    String(item.id) === String(employee.id)
                );

              return (
                <div
                  className="employee-card"
                  key={employee.id}
                >
                  <div className="employee-card-top">
                    <EmployeeProfileAvatar
                      name={employee.name}
                      imageUrl={
                        profilePictureUrls[String(employee.id)] ||
                        employee.profilePictureUrl ||
                        employee.profile_picture_url ||
                        employee.avatar_url ||
                        employee.profile_picture ||
                        employee.profilePicture ||
                        null
                      }
                    />

                    <div className="employee-identity">
                      <div className="employee-name">
                        {employee.name || "Unnamed employee"}
                      </div>

                      <div className="employee-role">
                        {employee.employmentRoleName ||
                          employee.employment_role_name ||
                          "Sales Team"}
                      </div>
                    </div>

                    <span className="active-badge">
                      Active
                    </span>
                  </div>

                  {employee.email && (
                    <div className="employee-detail">
                      <Mail size={14} />
                      <span>{employee.email}</span>
                    </div>
                  )}

                  {employee.phone && (
                    <div className="employee-detail">
                      <Phone size={14} />
                      <span>{employee.phone}</span>
                    </div>
                  )}

                  <div className="employee-footer">
                    <span>Monthly salary</span>
                    <strong>
                      {formatCurrency(getSalary(employee))}
                    </strong>
                  </div>

                  <div className="employee-footer">
                    <span>Closed leads</span>
                    <strong>
                      {performance?.closedCount || 0}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* EMPLOYEES CURRENTLY ON LEAVE */}

      <Panel
        style={{
          marginBottom: 16,
          padding: 20,
        }}
      >
        <SectionHeader
          icon={CalendarDays}
          title="Employees on Leave"
          subtitle="Approved leaves that include today's date"
          right={
            <span
              style={{
                padding: "5px 9px",
                borderRadius: 20,
                background: employeesOnLeave.length
                  ? "#FFF1E8"
                  : "#E9F8EF",
                color: employeesOnLeave.length
                  ? "#B45309"
                  : "#16834A",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {employeesOnLeave.length} on leave
            </span>
          }
        />

        {leaveLoading ? (
          <EmptyNote text="Loading leave information..." />
        ) : leaveError ? (
          <div className="dashboard-notice">
            {leaveError}
          </div>
        ) : employeesOnLeave.length === 0 ? (
          <EmptyNote text="No employees are currently on approved leave." />
        ) : (
          <div className="employee-grid">
            {employeesOnLeave.map((leave) => (
              <div
                className="employee-card"
                key={leave.id}
              >
                <div className="employee-card-top">
                  <EmployeeProfileAvatar
                    name={leave.employeeName}
                    imageUrl={
                      profilePictureUrls[String(leave.employeeId)] ||
                      null
                    }
                  />

                  <div className="employee-identity">
                    <div className="employee-name">
                      {leave.employeeName}
                    </div>

                    <div className="employee-role">
                      {leave.employeeRole}
                    </div>
                  </div>

                  <span
                    style={{
                      flexShrink: 0,
                      padding: "4px 7px",
                      borderRadius: 20,
                      background: "#FFF1E8",
                      color: "#B45309",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    On Leave
                  </span>
                </div>

                <div className="employee-detail">
                  <CalendarDays size={14} />
                  <span>
                    <strong>Leave type:</strong>{" "}
                    {leave.leave_type || "Not specified"}
                  </span>
                </div>

                <div className="employee-detail">
                  <CalendarDays size={14} />
                  <span>
                    <strong>From:</strong>{" "}
                    {fmtDate(leave.start_date)}
                  </span>
                </div>

                <div className="employee-detail">
                  <CalendarDays size={14} />
                  <span>
                    <strong>To:</strong>{" "}
                    {fmtDate(leave.end_date)}
                  </span>
                </div>

                <div className="employee-footer">
                  <span>Total leave days</span>
                  <strong>{leave.total_days ?? "—"}</strong>
                </div>

                {leave.reason && (
                  <div className="employee-detail">
                    <span>
                      <strong>Reason:</strong> {leave.reason}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* LEADS BY SOURCE + TEAM MEMBER */}

      <div className="two-column-grid">
        <Panel
          title="Leads by Source"
          style={{ padding: 20 }}
        >
          {Object.keys(stats.bySource).length === 0 ? (
            <EmptyNote text="No leads yet." />
          ) : (
            <BarList
              data={stats.bySource}
              total={stats.total}
              color={C.primary}
            />
          )}
        </Panel>

        <Panel
          title="Leads by Team Member"
          style={{ padding: 20 }}
        >
          {Object.keys(stats.byEmployee).length === 0 ? (
            <EmptyNote text="No leads yet." />
          ) : (
            <BarList
              data={stats.byEmployee}
              total={stats.total}
              color={C.accentDeep}
            />
          )}
        </Panel>
      </div>

      {/* RECENT IMPORTS */}

      <Panel
        style={{
          marginTop: 16,
          padding: 20,
        }}
      >
        <div
          className="imports-clickable"
          onClick={() => onNavigate?.("upload")}
        >
          <SectionHeader
            icon={UploadCloud}
            title="Recent Imports"
            subtitle="Latest Excel lead imports"
            right={<ArrowUpRight size={17} />}
          />

          {uploadHistory.length === 0 ? (
            <EmptyNote text="No Excel files imported yet." />
          ) : (
            <div className="imports-wrapper">
              <table className="imports-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Date</th>
                    <th>Added</th>
                    <th>Updated</th>
                    <th>Skipped</th>
                  </tr>
                </thead>

                <tbody>
                  {uploadHistory.slice(0, 8).map((history) => (
                    <tr key={history.id}>
                      <td className="file-cell">
                        <div className="file-name">
                          {history.fileName}
                        </div>
                      </td>

                      <td className="muted-cell">
                        {fmtDate(history.uploadedAt)}
                      </td>

                      <td className="added-cell">
                        {history.added}
                      </td>

                      <td className="updated-cell">
                        {history.updated}
                      </td>

                      <td className="skipped-cell">
                        {history.skipped}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {/* RESPONSIVE CSS */}

      <style>
        {`
          .crm-dashboard {
            width: 100%;
            box-sizing: border-box;
          }

          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 24px;
          }

          .live-crm {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            padding: 10px 14px;
            border-radius: 12px;
            background: linear-gradient(135deg, #101B2D, #0B1220);
            border: 1px solid #26364D;
            box-shadow: 0 4px 14px rgba(11, 18, 32, 0.12);
            white-space: nowrap;
          }

          .live-dot {
            width: 8px;
            height: 8px;
            flex-shrink: 0;
            border-radius: 50%;
            background: #39E58C;
            box-shadow: 0 0 0 4px rgba(57, 229, 140, 0.12);
            animation: livePulse 2s ease-in-out infinite;
          }

          .live-label {
            color: #7CF0B1;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
          }

          .live-divider {
            width: 1px;
            height: 16px;
            background: #344258;
          }

          .live-title {
            color: #FFFFFF;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.2px;
          }

          @keyframes livePulse {
            0%, 100% {
              box-shadow: 0 0 0 3px rgba(57, 229, 140, 0.10);
            }
            50% {
              box-shadow: 0 0 0 6px rgba(57, 229, 140, 0.04);
            }
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 24px;
          }

          .overview-grid {
            margin-bottom: 16px;
          }

          .dashboard-section-title {
            margin: 8px 0 14px;
          }

          .dashboard-section-title h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: ${C.ink};
          }

          .dashboard-section-title p {
            margin: 4px 0 0;
            font-size: 12px;
            color: ${C.inkSoft};
          }

          .dashboard-notice {
            margin: -4px 0 16px;
            padding: 11px 13px;
            border-radius: 8px;
            border: 1px solid ${C.border};
            color: ${C.inkSoft};
            background: #FFFFFF;
            font-size: 12px;
          }

          .performance-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
          }

          .performance-metric,
          .top-performer-card {
            min-width: 0;
            padding: 15px;
            border-radius: 10px;
            background: #F8FAF9;
            border: 1px solid ${C.borderSoft};
          }

          .metric-label {
            color: ${C.inkSoft};
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .metric-value {
            margin-top: 9px;
            font-size: 25px;
            line-height: 1.2;
            font-weight: 700;
            color: ${C.ink};
            font-family: 'Space Grotesk', sans-serif;
            overflow-wrap: anywhere;
          }

          .metric-description {
            margin-top: 5px;
            font-size: 11px;
            color: ${C.inkFaint};
            line-height: 1.5;
          }

          .top-performer-name {
            margin-top: 10px;
            font-size: 16px;
            line-height: 1.4;
            font-weight: 700;
            color: ${C.ink};
            overflow-wrap: anywhere;
          }

          .dashboard-text-button {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            border: none;
            padding: 4px 0;
            background: transparent;
            color: ${C.primaryDeep};
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
          }

          .dashboard-text-button:hover {
            opacity: 0.75;
          }

          .employee-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .employee-card {
            min-width: 0;
            padding: 15px;
            border: 1px solid ${C.borderSoft};
            border-radius: 10px;
            background: #FFFFFF;
          }

          .employee-card-top {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            min-width: 0;
          }

          .employee-avatar {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            flex-shrink: 0;
            overflow: hidden;
            border-radius: 10px;
            background: ${C.primary}15;
            color: ${C.primaryDeep};
            font-weight: 700;
            font-size: 16px;
          }

          .employee-profile-image {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: inherit;
          }

          .employee-identity {
            flex: 1;
            min-width: 0;
          }

          .employee-name {
            font-size: 13px;
            font-weight: 700;
            color: ${C.ink};
            overflow-wrap: anywhere;
          }

          .employee-role {
            margin-top: 3px;
            font-size: 11px;
            color: ${C.inkSoft};
          }

          .active-badge {
            flex-shrink: 0;
            padding: 4px 7px;
            border-radius: 20px;
            background: #E9F8EF;
            color: #16834A;
            font-size: 10px;
            font-weight: 600;
          }

          .employee-detail {
            display: flex;
            align-items: flex-start;
            gap: 7px;
            margin-top: 9px;
            color: ${C.inkSoft};
            font-size: 11px;
            min-width: 0;
          }

          .employee-detail svg {
            flex-shrink: 0;
            margin-top: 1px;
          }

          .employee-detail span {
            min-width: 0;
            overflow-wrap: anywhere;
          }

          .employee-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            margin-top: 13px;
            padding-top: 10px;
            border-top: 1px solid ${C.borderSoft};
            font-size: 11px;
            color: ${C.inkSoft};
          }

          .employee-footer strong {
            text-align: right;
            color: ${C.ink};
            font-weight: 700;
          }

          .two-column-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .imports-clickable {
            cursor: pointer;
          }

          .imports-wrapper {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .imports-table {
            width: 100%;
            min-width: 620px;
            border-collapse: collapse;
            font-size: 13px;
          }

          .imports-table th {
            padding: 7px 8px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: ${C.inkFaint};
            text-align: left;
            white-space: nowrap;
          }

          .imports-table td {
            padding: 11px 8px;
            border-top: 1px solid ${C.borderSoft};
            white-space: nowrap;
          }

          .file-cell {
            font-weight: 500;
            color: ${C.ink};
            max-width: 280px;
          }

          .file-name {
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .muted-cell {
            color: ${C.inkSoft};
          }

          .added-cell {
            color: ${C.primaryDeep};
            font-weight: 600;
          }

          .updated-cell {
            color: ${C.accentDeep};
            font-weight: 600;
          }

          .skipped-cell {
            color: ${C.danger};
            font-weight: 600;
          }

          .dashboard-stat-clickable {
            cursor: pointer;
          }

          .dashboard-stat-clickable:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 16px rgba(0,0,0,0.07);
          }

          @media (max-width: 1100px) {
            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .performance-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .employee-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 760px) {
            .dashboard-header {
              align-items: flex-start;
              margin-bottom: 20px;
            }

            .two-column-grid {
              grid-template-columns: 1fr;
            }

            .employee-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 560px) {
            .dashboard-header {
              flex-direction: column;
              gap: 8px;
            }

            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .performance-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
            }

            .live-crm {
              align-self: flex-start;
            }

            .employee-card {
              padding: 13px;
            }
          }

          @media (max-width: 390px) {
            .stats-grid {
              grid-template-columns: 1fr;
            }

            .performance-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
        `}
      </style>
    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({ title, subtitle }) {
  return (
    <div className="dashboard-section-title">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  right,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 18,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: C.ink,
          }}
        >
          <Icon size={17} strokeWidth={2} />
          <span>{title}</span>
        </div>

        <div
          style={{
            marginTop: 3,
            fontSize: 12,
            color: C.inkSoft,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          fontSize: 12,
          color: C.inkFaint,
        }}
      >
        {right}
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD STAT CARD
========================================================= */

function DashboardStat({
  icon: Icon,
  label,
  value,
  description,
  accent,
  onClick,
}) {
  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        background: "#FFFFFF",
        border: `1px solid ${C.border}`,
        borderRadius: 11,
        padding: "17px 18px",
        minHeight: 112,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
      className={
        clickable
          ? "dashboard-stat dashboard-stat-clickable"
          : "dashboard-stat"
      }
    >
      <div
        style={{
          position: "absolute",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `${accent}08`,
          right: -35,
          bottom: -35,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
          zIndex: 1,
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: C.inkFaint,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
          }}
        >
          {label}
        </div>

        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${accent}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} color={accent} />
        </div>
      </div>

      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 25,
          fontWeight: 700,
          marginTop: 12,
          color: C.ink,
          position: "relative",
          zIndex: 1,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 11,
          color: C.inkFaint,
          marginTop: 3,
          position: "relative",
          zIndex: 1,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* =========================================================
   PERFORMANCE METRIC
========================================================= */

function PerformanceMetric({
  label,
  value,
  description,
}) {
  return (
    <div className="performance-metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-description">{description}</div>
    </div>
  );
}

/* =========================================================
   BAR LIST
========================================================= */

function BarList({ data, total, color }) {
  const entries = Object.entries(data).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div>
      {entries.map(([label, count]) => {
        const percentage = total
          ? Math.round((count / total) * 100)
          : 0;

        return (
          <div key={label} style={{ marginBottom: 15 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  color: C.ink,
                  fontWeight: 500,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>

              <span
                style={{
                  color: C.inkSoft,
                  flexShrink: 0,
                  fontSize: 11,
                }}
              >
                {count} · {percentage}%
              </span>
            </div>

            <div
              style={{
                height: 7,
                background: "#EAEDE7",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${percentage}%`,
                  background: color,
                  borderRadius: 10,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
