import React, { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  LogOut,
  Menu,
  X,
  Phone,
  CheckCircle2,
  TrendingUp,
  CalendarDays,
  Timer,
  User,
  FileText,
} from "lucide-react";

import { useAuth } from "./AuthContext";
import { C, Panel, PageHeader } from "./ui";
import LeadsTable from "./LeadsTable";

import {
  getLeadsForEmployee,
  updateLead,
} from "./leadsDatabase";

import {
  getTodayTimesheet,
  getEmployeeTimesheets,
  checkIn,
  checkOut,
} from "./timesheetDatabase";

import EmployeeMonthlyTimesheet from "./EmployeeMonthlyTimesheet";

import logo from "./assets/ruvigza-logo.png";

export default function EmployeeView() {
  const { currentUser, logout } = useAuth();

  const [view, setView] = useState("dashboard");
  const [leads, setLeads] = useState([]);
  const [todayTimesheet, setTodayTimesheet] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [liveWorkingSeconds, setLiveWorkingSeconds] = useState(0);

  // =====================================================
  // CLOSE NOTE STATE
  // =====================================================

  const [closeNoteOpen, setCloseNoteOpen] = useState(false);
  const [selectedCloseLead, setSelectedCloseLead] = useState(null);
  const [closeSubmitting, setCloseSubmitting] = useState(false);
  const [closeError, setCloseError] = useState("");

  const [closeForm, setCloseForm] = useState({
    requirement: "",
    service: "",
    budget: "",
    budgetType: "daily",
    fromDate: "",
    toDate: "",
    remark: "",
  });

  const employeeId = currentUser?.id;

  // =====================================================
  // REFRESH
  // =====================================================

  const refresh = useCallback(async () => {
    if (!employeeId) return;

    try {
      setLoading(true);

      const [
        employeeLeads,
        today,
        history,
      ] = await Promise.all([
        getLeadsForEmployee(employeeId),
        getTodayTimesheet(employeeId),
        getEmployeeTimesheets(employeeId),
      ]);

      setLeads(employeeLeads || []);
      setTodayTimesheet(today || null);
      setTimesheets(history || []);
    } catch (error) {
      console.error(
        "Employee refresh error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // =====================================================
  // LIVE WORKING TIMER
  // =====================================================

  useEffect(() => {
    if (
      !todayTimesheet?.check_in ||
      todayTimesheet?.check_out
    ) {
      setLiveWorkingSeconds(
        todayTimesheet?.working_minutes
          ? todayTimesheet.working_minutes * 60
          : 0
      );

      return;
    }

    const calculateElapsedTime = () => {
      const checkInTime = new Date(
        todayTimesheet.check_in
      ).getTime();

      const now = Date.now();

      const elapsedSeconds = Math.max(
        0,
        Math.floor(
          (now - checkInTime) / 1000
        )
      );

      setLiveWorkingSeconds(
        elapsedSeconds
      );
    };

    calculateElapsedTime();

    const timer = setInterval(
      calculateElapsedTime,
      1000
    );

    return () => clearInterval(timer);
  }, [
    todayTimesheet?.check_in,
    todayTimesheet?.check_out,
    todayTimesheet?.working_minutes,
  ]);

  // =====================================================
  // STATUS UPDATE
  // =====================================================

  const handleUpdateStatus = async (
    id,
    status
  ) => {
    // -------------------------------------------------
    // Closed status साठी आधी Close Note उघडेल
    // -------------------------------------------------

    if (status === "Closed") {
      const lead = leads.find(
        (item) => item.id === id
      );

      if (!lead) {
        alert(
          "Lead information could not be found."
        );

        return;
      }

      setSelectedCloseLead(lead);

      setCloseForm({
        requirement:
          lead.closeRequirement || "",
        service:
          lead.closeService || "",
        budget:
          lead.closeBudget ?? "",
        budgetType:
          lead.closeBudgetType || "daily",
        fromDate:
          lead.closeFromDate || "",
        toDate:
          lead.closeToDate || "",
        remark:
          lead.closeRemark || "",
      });

      setCloseError("");
      setCloseNoteOpen(true);

      return;
    }

    // -------------------------------------------------
    // बाकी status direct update
    // -------------------------------------------------

    try {
      const updates = {
        status,
      };

      await updateLead(
        id,
        updates
      );

      await refresh();
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      alert(
        error.message ||
          "Unable to update lead status."
      );
    }
  };

  // =====================================================
  // CLOSE NOTE FORM CHANGE
  // =====================================================

  const handleCloseFormChange = (
    field,
    value
  ) => {
    setCloseForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (closeError) {
      setCloseError("");
    }
  };

  // =====================================================
  // CLOSE NOTE MODAL CLOSE
  // =====================================================

  const closeCloseNoteModal = () => {
    if (closeSubmitting) return;

    setCloseNoteOpen(false);
    setSelectedCloseLead(null);
    setCloseError("");

    setCloseForm({
      requirement: "",
      service: "",
      budget: "",
      budgetType: "daily",
      fromDate: "",
      toDate: "",
      remark: "",
    });
  };

  // =====================================================
  // SUBMIT CLOSE NOTE
  // =====================================================

  const handleSubmitCloseLead = async () => {
    setCloseError("");

    const requirement =
      closeForm.requirement.trim();

    const service =
      closeForm.service;

    const budget =
      closeForm.budget;

    const budgetType =
      closeForm.budgetType;

    const fromDate =
      closeForm.fromDate;

    const toDate =
      closeForm.toDate;

    const remark =
      closeForm.remark.trim();

    // -------------------------------------------------
    // Required validation
    // -------------------------------------------------

    if (!requirement) {
      setCloseError(
        "Requirement is required."
      );

      return;
    }

    if (!service) {
      setCloseError(
        "Please select a service."
      );

      return;
    }

    if (
      budget === "" ||
      budget === null ||
      budget === undefined
    ) {
      setCloseError(
        "Budget is required."
      );

      return;
    }

    const numericBudget =
      Number(budget);

    if (
      !Number.isFinite(
        numericBudget
      ) ||
      numericBudget <= 0
    ) {
      setCloseError(
        "Please enter a valid budget greater than 0."
      );

      return;
    }

    if (!budgetType) {
      setCloseError(
        "Please select budget type."
      );

      return;
    }

    if (!fromDate) {
      setCloseError(
        "From Date is required."
      );

      return;
    }

    if (!toDate) {
      setCloseError(
        "To Date is required."
      );

      return;
    }

    // -------------------------------------------------
    // Date validation
    // -------------------------------------------------

    if (toDate < fromDate) {
      setCloseError(
        "To Date cannot be earlier than From Date."
      );

      return;
    }

    if (!selectedCloseLead) {
      setCloseError(
        "Lead information is missing."
      );

      return;
    }

    try {
      setCloseSubmitting(true);

      await updateLead(
        selectedCloseLead.id,
        {
          status: "Closed",
          closedBy: employeeId,

          closeRequirement:
            requirement,

          closeService:
            service,

          closeBudget:
            numericBudget,

          closeBudgetType:
            budgetType,

          closeFromDate:
            fromDate,

          closeToDate:
            toDate,

          closeRemark:
            remark,
        }
      );

      // -------------------------------------------------
      // Close modal
      // -------------------------------------------------

      setCloseNoteOpen(false);
      setSelectedCloseLead(null);

      setCloseForm({
        requirement: "",
        service: "",
        budget: "",
        budgetType: "daily",
        fromDate: "",
        toDate: "",
        remark: "",
      });

      setCloseError("");

      // -------------------------------------------------
      // Refresh leads
      // -------------------------------------------------

      await refresh();
    } catch (error) {
      console.error(
        "Close lead error:",
        error
      );

      setCloseError(
        error.message ||
          "Unable to close lead. Please try again."
      );
    } finally {
      setCloseSubmitting(false);
    }
  };

  // =====================================================
  // CHECK IN
  // =====================================================

  const handleCheckIn = async () => {
    if (!employeeId) return;

    try {
      setAttendanceLoading(true);

      const result =
        await checkIn(employeeId);

      setTodayTimesheet(result);

      const history =
        await getEmployeeTimesheets(
          employeeId
        );

      setTimesheets(history || []);
    } catch (error) {
      console.error(
        "Check in error:",
        error
      );

      alert(
        error.message ||
          "Unable to check in."
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  // =====================================================
  // CHECK OUT
  // =====================================================

  const handleCheckOut = async () => {
    if (!employeeId) return;

    try {
      setAttendanceLoading(true);

      const result =
        await checkOut(employeeId);

      setTodayTimesheet(result);

      const history =
        await getEmployeeTimesheets(
          employeeId
        );

      setTimesheets(history || []);
    } catch (error) {
      console.error(
        "Check out error:",
        error
      );

      alert(
        error.message ||
          "Unable to check out."
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  // =====================================================
  // PACKAGE UPDATE
  // =====================================================

  const handleUpdatePackage = async (
  id,
  packageTier,
  packageAmount
) => {
  try {
    console.log(
      "SAVING PACKAGE:",
      {
        id,
        packageTier,
        packageAmount,
      }
    );

    await updateLead(id, {
      packageTier,
      packageAmount,
    });

    await refresh();
  } catch (error) {
    console.error(
      "Update package error:",
      error
    );

    alert(
      error.message ||
        "Unable to update package."
    );
  }
};

  // =====================================================
  // FORMATTERS
  // =====================================================

  const formatTime = (value) => {
    if (!value) return "—";

    return new Date(
      value
    ).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatMinutes = (
    minutes
  ) => {
    if (!minutes) return "0m";

    const hours = Math.floor(
      minutes / 60
    );

    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}m`;
    }

    return `${hours}h ${mins}m`;
  };

  const formatLiveTime = (
    seconds
  ) => {
    const hours = Math.floor(
      seconds / 3600
    );

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    const secs = seconds % 60;

    return [
      String(hours).padStart(
        2,
        "0"
      ),
      String(minutes).padStart(
        2,
        "0"
      ),
      String(secs).padStart(
        2,
        "0"
      ),
    ].join(":");
  };

  // =====================================================
  // STATS
  // =====================================================

  const totalLeads =
    leads.length;

  const newLeads =
    leads.filter(
      (lead) =>
        lead.status === "New"
    ).length;

  const contactedLeads =
    leads.filter(
      (lead) =>
        lead.status ===
        "Contacted"
    ).length;

  const interestedLeads =
    leads.filter(
      (lead) =>
        lead.status ===
        "Interested"
    ).length;

  const followUpLeads =
    leads.filter(
      (lead) =>
        lead.status ===
        "Follow Up"
    ).length;

  const onboardedLeads =
    leads.filter(
      (lead) =>
        lead.status ===
        "Onboarded"
    ).length;

  // =====================================================
  // NAV
  // =====================================================

  const nav = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "leads",
      label: "Assigned Leads",
      icon: Users,
      badge: totalLeads,
    },
    {
      id: "timesheet",
      label: "Timesheet",
      icon: Clock,
    },
  ];

  const selectView = (id) => {
    setView(id);
    setMobileMenu(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: C.bg,
        color: C.ink,
        fontFamily:
          "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* =================================================
          MOBILE TOP BAR
      ================================================= */}

      <div
        style={{
          display: "none",
        }}
        className="employee-mobile-topbar"
      >
        <button
          onClick={() =>
            setMobileMenu(true)
          }
          style={{
            border: "none",
            background:
              "transparent",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <Menu size={24} />
        </button>

        <img
          src={logo}
          alt="RUVIGZA"
          style={{
            height: 30,
            width: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {mobileMenu && (
        <div
          onClick={() =>
            setMobileMenu(false)
          }
          className="employee-mobile-overlay"
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`employee-sidebar ${
          mobileMenu
            ? "employee-sidebar-open"
            : ""
        }`}
        style={{
          width: 250,
          height: "100vh",
          minHeight: "100vh",
          background: "#0B1220",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1100,
          borderRight:
            "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* LOGO */}

        <div
          style={{
            padding:
              "25px 22px 22px",
            borderBottom:
              "1px solid rgba(255,255,255,0.06)",
            position: "relative",
          }}
        >
          <img
            src={logo}
            alt="RUVIGZA Digital Technologies"
            style={{
              width: 155,
              height: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />

          <div
  style={{
    fontSize: 8,
    letterSpacing: "1.4px",
    color: "#94A3B8",
    marginTop: 9,
    fontWeight: 600,
    cursor: "pointer",
    transition: "color 0.2s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.color = "#00B7FF";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.color = "#94A3B8";
  }}
>
  TRACKING & MANAGEMENT SOLUTION
</div>

          <button
            onClick={() =>
              setMobileMenu(false)
            }
            className="employee-mobile-close"
            style={{
              display: "none",
              position: "absolute",
              right: 15,
              top: 18,
              border: "none",
              background:
                "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* NAVIGATION */}

        <div
          style={{
            flex: 1,
            padding: "18px 12px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#64748B",
              fontWeight: 700,
              letterSpacing: "1px",
              padding:
                "0 12px 9px",
              textTransform:
                "uppercase",
            }}
          >
            Workspace
          </div>

          {nav.map((item) => {
            const Icon = item.icon;

            const active =
              view === item.id;

            return (
              <button
                key={item.id}
                onClick={() =>
                  selectView(item.id)
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding:
                    "11px 12px",
                  marginBottom: 4,
                  borderRadius: 8,
                  border: "none",
                  background: active
                    ? "rgba(255,255,255,0.11)"
                    : "transparent",
                  color: active
                    ? "#fff"
                    : "#A8B4C5",
                  fontSize: 14,
                  fontWeight: active
                    ? 600
                    : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition:
                    "all 0.2s ease",
                }}
              >
                <Icon size={17} />

                <span
                  style={{
                    flex: 1,
                  }}
                >
                  {item.label}
                </span>

                {item.badge > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      background: active
                        ? "rgba(255,255,255,0.17)"
                        : "rgba(255,255,255,0.08)",
                      color: "#CBD5E1",
                      padding:
                        "2px 7px",
                      borderRadius: 20,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* EMPLOYEE PROFILE */}

        <div
          style={{
            padding:
              "14px 12px",
            borderTop:
              "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding:
                "8px 10px",
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background:
                  "#1E293B",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                flexShrink: 0,
              }}
            >
              <User
                size={17}
                color="#CBD5E1"
              />
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#00A8FF",
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {currentUser?.name ||
                  "Employee"}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#64748B",
                  marginTop: 2,
                }}
              >
                Sales Employee
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding:
                "10px 12px",
              borderRadius: 7,
              border: "none",
              background:
                "transparent",
              color: "#94A3B8",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: 250,
          padding: "30px 34px",
        }}
        className="employee-main"
      >
        {/* =================================================
            DASHBOARD
        ================================================= */}

        {view === "dashboard" && (
          <>
            <PageHeader
              title={`Welcome back, ${
                currentUser?.name ||
                "Employee"
              }`}
              subtitle="Here is your work overview for today."
            />

            {/* STATS */}

            <div
              className="employee-stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 22,
              }}
            >
              <EmployeeStat
                icon={Users}
                label="Assigned Leads"
                value={totalLeads}
              />

              <EmployeeStat
                icon={CheckCircle2}
                label="Onboarded"
                value={onboardedLeads}
              />

              <EmployeeStat
                icon={TrendingUp}
                label="Interested"
                value={interestedLeads}
              />

              <EmployeeStat
                icon={Phone}
                label="Contacted"
                value={contactedLeads}
              />
            </div>

            {/* TWO COLUMNS */}

            <div
              className="employee-dashboard-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1.5fr) minmax(300px, 1fr)",
                gap: 18,
              }}
            >
              {/* LEAD PIPELINE */}

              <Panel
                style={{
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: C.ink,
                      }}
                    >
                      My Lead Pipeline
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: C.inkSoft,
                        marginTop: 3,
                      }}
                    >
                      Current status of your assigned leads
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setView("leads")
                    }
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      color:
                        C.primary,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor:
                        "pointer",
                    }}
                  >
                    View Leads →
                  </button>
                </div>

                <PipelineRow
                  label="New"
                  value={newLeads}
                  total={totalLeads}
                />

                <PipelineRow
                  label="Contacted"
                  value={
                    contactedLeads
                  }
                  total={totalLeads}
                />

                <PipelineRow
                  label="Interested"
                  value={
                    interestedLeads
                  }
                  total={totalLeads}
                />

                <PipelineRow
                  label="Follow Up"
                  value={
                    followUpLeads
                  }
                  total={totalLeads}
                />

                <PipelineRow
                  label="Onboarded"
                  value={
                    onboardedLeads
                  }
                  total={totalLeads}
                />
              </Panel>

              {/* TODAY ATTENDANCE */}

              <Panel
                style={{
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      background:
                        "#EEF2FF",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <Clock
                      size={18}
                      color="#4F46E5"
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      Today's Attendance
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: C.inkSoft,
                      }}
                    >
                      {new Date().toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <AttendanceBox
                    label="Check In"
                    value={formatTime(
                      todayTimesheet?.check_in
                    )}
                  />

                  <AttendanceBox
                    label="Check Out"
                    value={formatTime(
                      todayTimesheet?.check_out
                    )}
                  />
                </div>

                <div
                  style={{
                    padding:
                      "13px 14px",
                    background:
                      C.borderSoft,
                    borderRadius: 8,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: C.inkSoft,
                      marginBottom: 4,
                    }}
                  >
                    Working Time
                  </div>

                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 750,
                      letterSpacing: "1px",
                      fontVariantNumeric:
                        "tabular-nums",
                    }}
                  >
                    {todayTimesheet?.check_in
                      ? formatLiveTime(
                          liveWorkingSeconds
                        )
                      : "00:00:00"}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: C.inkSoft,
                      marginTop: 5,
                    }}
                  >
                    {todayTimesheet?.check_out
                      ? "Total working time"
                      : todayTimesheet?.check_in
                      ? "Timer running"
                      : "Check in to start timer"}
                  </div>
                </div>

                {!todayTimesheet?.check_in ? (
                  <button
                    onClick={
                      handleCheckIn
                    }
                    disabled={
                      attendanceLoading
                    }
                    style={{
                      width: "100%",
                      padding:
                        "11px 14px",
                      border: "none",
                      borderRadius: 8,
                      background:
                        "#0F172A",
                      color: "#fff",
                      fontWeight: 600,
                      cursor:
                        attendanceLoading
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        attendanceLoading
                          ? 0.6
                          : 1,
                    }}
                  >
                    {attendanceLoading
                      ? "Checking in..."
                      : "Check In"}
                  </button>
                ) : !todayTimesheet?.check_out ? (
                  <button
                    onClick={
                      handleCheckOut
                    }
                    disabled={
                      attendanceLoading
                    }
                    style={{
                      width: "100%",
                      padding:
                        "11px 14px",
                      border: "none",
                      borderRadius: 8,
                      background:
                        "#DC2626",
                      color: "#fff",
                      fontWeight: 600,
                      cursor:
                        attendanceLoading
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        attendanceLoading
                          ? 0.6
                          : 1,
                    }}
                  >
                    {attendanceLoading
                      ? "Checking out..."
                      : "Check Out"}
                  </button>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      padding:
                        "11px 14px",
                      borderRadius: 8,
                      background:
                        "#ECFDF5",
                      color:
                        "#047857",
                      textAlign:
                        "center",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Attendance Completed
                  </div>
                )}
              </Panel>
            </div>

            {/* QUICK ACTIONS */}

            <Panel
              style={{
                padding: 22,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 15,
                }}
              >
                Quick Actions
              </div>

              <div
                className="quick-actions"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <QuickAction
                  icon={Users}
                  title="Assigned Leads"
                  subtitle={`${totalLeads} leads assigned`}
                  onClick={() =>
                    setView("leads")
                  }
                />

                <QuickAction
                  icon={Clock}
                  title="Timesheet"
                  subtitle="View attendance history"
                  onClick={() =>
                    setView("timesheet")
                  }
                />

                <QuickAction
                  icon={Phone}
                  title="Start Calling"
                  subtitle="Open assigned leads"
                  onClick={() =>
                    setView("leads")
                  }
                />
              </div>
            </Panel>
          </>
        )}

        {/* =================================================
            LEADS
        ================================================= */}

        {view === "leads" && (
          <>
            <PageHeader
              title="Assigned Leads"
              subtitle={`${totalLeads} leads assigned to you.`}
            />

            <div
              className="employee-lead-stats"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <MiniStat
                label="Total"
                value={totalLeads}
              />

              <MiniStat
                label="New"
                value={newLeads}
              />

              <MiniStat
                label="Follow Up"
                value={
                  followUpLeads
                }
              />

              <MiniStat
                label="Onboarded"
                value={
                  onboardedLeads
                }
              />
            </div>

            <LeadsTable
              leads={leads}
              employees={[]}
              onUpdateStatus={
                handleUpdateStatus
              }
              onUpdatePackage={
                handleUpdatePackage
              }
            />
          </>
        )}

        {/* =================================================
            TIMESHEET
        ================================================= */}

        {view === "timesheet" && (
          <>
            <PageHeader
              title="My Timesheet"
              subtitle="Track your daily working hours and attendance."
            />

            {/* ATTENDANCE CARD */}

            <Panel
              style={{
                padding: 22,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 13,
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 11,
                      background:
                        "#EEF2FF",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <Clock
                      size={22}
                      color="#4F46E5"
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      Today's Attendance
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: C.inkSoft,
                        marginTop: 3,
                      }}
                    >
                      Check in when you start work and
                      check out when you finish.
                    </div>
                  </div>
                </div>

                {!todayTimesheet?.check_in ? (
                  <button
                    onClick={
                      handleCheckIn
                    }
                    disabled={
                      attendanceLoading
                    }
                    style={attendanceButton(
                      "#0F172A"
                    )}
                  >
                    {attendanceLoading
                      ? "Checking in..."
                      : "Check In"}
                  </button>
                ) : !todayTimesheet?.check_out ? (
                  <button
                    onClick={
                      handleCheckOut
                    }
                    disabled={
                      attendanceLoading
                    }
                    style={attendanceButton(
                      "#DC2626"
                    )}
                  >
                    {attendanceLoading
                      ? "Checking out..."
                      : "Check Out"}
                  </button>
                ) : (
                  <div
                    style={{
                      padding:
                        "10px 16px",
                      borderRadius: 8,
                      background:
                        "#ECFDF5",
                      color:
                        "#047857",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Completed
                  </div>
                )}
              </div>
            </Panel>

            {/* TIMESHEET STATS */}

            <div
              className="timesheet-stats"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <MiniStat
                label="Check In"
                value={formatTime(
                  todayTimesheet?.check_in
                )}
              />

              <MiniStat
                label="Check Out"
                value={formatTime(
                  todayTimesheet?.check_out
                )}
              />

              <MiniStat
                label="Today's Working Time"
                value={formatMinutes(
                  todayTimesheet?.working_minutes
                )}
              />
            </div>

            {/* HISTORY */}

            <Panel
              style={{
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding:
                    "18px 20px",
                  borderBottom:
                    `1px solid ${C.border}`,
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 10,
                }}
              >
                <CalendarDays
                  size={18}
                  color={C.primary}
                />

                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Attendance History
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: C.inkSoft,
                      marginTop: 2,
                    }}
                  >
                    Your previous working days
                  </div>
                </div>
              </div>

              {timesheets.length ===
              0 ? (
                <div
                  style={{
                    padding: 35,
                    textAlign:
                      "center",
                    color: C.inkSoft,
                    fontSize: 13,
                  }}
                >
                  No attendance records found.
                </div>
              ) : (
                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: 650,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={
                            tableHeadStyle
                          }
                        >
                          Date
                        </th>

                        <th
                          style={
                            tableHeadStyle
                          }
                        >
                          Check In
                        </th>

                        <th
                          style={
                            tableHeadStyle
                          }
                        >
                          Check Out
                        </th>

                        <th
                          style={
                            tableHeadStyle
                          }
                        >
                          Working Time
                        </th>

                        <th
                          style={
                            tableHeadStyle
                          }
                        >
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {timesheets.map(
                        (row) => (
                          <tr
                            key={
                              row.id
                            }
                          >
                            <td
                              style={
                                tableCellStyle
                              }
                            >
                              {new Date(
                                `${row.work_date}T00:00:00`
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month:
                                    "short",
                                  year: "numeric",
                                }
                              )}
                            </td>

                            <td
                              style={
                                tableCellStyle
                              }
                            >
                              {formatTime(
                                row.check_in
                              )}
                            </td>

                            <td
                              style={
                                tableCellStyle
                              }
                            >
                              {formatTime(
                                row.check_out
                              )}
                            </td>

                            <td
                              style={{
                                ...tableCellStyle,
                                fontWeight: 600,
                              }}
                            >
                              {formatMinutes(
                                row.working_minutes
                              )}
                            </td>

                            <td
                              style={
                                tableCellStyle
                              }
                            >
                              <span
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  gap: 5,
                                  padding:
                                    "4px 9px",
                                  borderRadius:
                                    20,
                                  background:
                                    row.status ===
                                    "Completed"
                                      ? "#ECFDF5"
                                      : "#FFF7ED",
                                  color:
                                    row.status ===
                                    "Completed"
                                      ? "#047857"
                                      : "#C2410C",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                <Timer
                                  size={12}
                                />

                                {row.status}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <EmployeeMonthlyTimesheet
              employeeId={
                employeeId
              }
              leads={leads}
            />
          </>
        )}
      </main>

      {/* =================================================
          CLOSE NOTE MODAL
      ================================================= */}

      {closeNoteOpen && (
        <div
          className="close-note-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCloseNoteModal();
            }
          }}
        >
          <div
            className="close-note-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent:
                  "space-between",
                gap: 15,
                padding:
                  "20px 22px",
                borderBottom:
                  `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 11,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9,
                    background:
                      "#EEF2FF",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText
                    size={19}
                    color={C.primary}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 750,
                      color: C.ink,
                    }}
                  >
                    Close Lead
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: C.inkSoft,
                      marginTop: 3,
                    }}
                  >
                    Add client requirement before closing this lead.
                  </div>
                </div>
              </div>

              <button
                onClick={
                  closeCloseNoteModal
                }
                disabled={
                  closeSubmitting
                }
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  borderRadius: 7,
                  background:
                    C.borderSoft,
                  color: C.inkSoft,
                  cursor:
                    closeSubmitting
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* LEAD INFO */}

            {selectedCloseLead && (
              <div
                style={{
                  margin:
                    "18px 22px 0",
                  padding:
                    "12px 14px",
                  borderRadius: 8,
                  background:
                    "#F8FAFC",
                  border:
                    `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: C.inkSoft,
                    marginBottom: 3,
                  }}
                >
                  Lead
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.ink,
                  }}
                >
                  {selectedCloseLead.name ||
                    "Unnamed Lead"}
                </div>

                {selectedCloseLead.businessName && (
                  <div
                    style={{
                      fontSize: 11,
                      color: C.inkSoft,
                      marginTop: 2,
                    }}
                  >
                    {
                      selectedCloseLead.businessName
                    }
                  </div>
                )}
              </div>
            )}

            {/* FORM */}

            <div
              style={{
                padding:
                  "20px 22px 22px",
              }}
            >
              {closeError && (
                <div
                  style={{
                    padding:
                      "10px 12px",
                    borderRadius: 7,
                    background:
                      "#FEF2F2",
                    border:
                      "1px solid #FECACA",
                    color:
                      "#B91C1C",
                    fontSize: 12,
                    marginBottom: 16,
                  }}
                >
                  {closeError}
                </div>
              )}

              {/* REQUIREMENT */}

              <div
                style={{
                  marginBottom: 15,
                }}
              >
                <label
                  style={
                    closeLabelStyle
                  }
                >
                  Requirement
                  <span
                    style={{
                      color: "#DC2626",
                    }}
                  >
                    *
                  </span>
                </label>

                <textarea
                  value={
                    closeForm.requirement
                  }
                  onChange={(event) =>
                    handleCloseFormChange(
                      "requirement",
                      event.target.value
                    )
                  }
                  placeholder="Enter client's requirement..."
                  rows={3}
                  disabled={
                    closeSubmitting
                  }
                  style={{
                    ...closeInputStyle,
                    resize: "vertical",
                    minHeight: 80,
                  }}
                />
              </div>

              {/* SERVICE + BUDGET TYPE */}

              <div
                className="close-note-two-column"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    marginBottom: 15,
                  }}
                >
                  <label
                    style={
                      closeLabelStyle
                    }
                  >
                    Service
                    <span
                      style={{
                        color: "#DC2626",
                      }}
                    >
                      *
                    </span>
                  </label>

                  <select
                    value={
                      closeForm.service
                    }
                    onChange={(event) =>
                      handleCloseFormChange(
                        "service",
                        event.target.value
                      )
                    }
                    disabled={
                      closeSubmitting
                    }
                    style={
                      closeInputStyle
                    }
                  >
                    <option value="">
                      Select Service
                    </option>

                    <option value="Google Ads">
                      Google Ads
                    </option>

                    <option value="Meta Ads">
                      Meta Ads
                    </option>

                    <option value="Website">
                      Website
                    </option>
                  
                  </select>
                </div>

                <div
                  style={{
                    marginBottom: 15,
                  }}
                >
                  <label
                    style={
                      closeLabelStyle
                    }
                  >
                    Budget Type
                    <span
                      style={{
                        color: "#DC2626",
                      }}
                    >
                      *
                    </span>
                  </label>

                  <select
                    value={
                      closeForm.budgetType
                    }
                    onChange={(event) =>
                      handleCloseFormChange(
                        "budgetType",
                        event.target.value
                      )
                    }
                    disabled={
                      closeSubmitting
                    }
                    style={
                      closeInputStyle
                    }
                  >
                    <option value="daily">
                      Daily
                    </option>

                    <option value="monthly">
                      Monthly
                    </option>
                  </select>
                </div>
              </div>

              {/* BUDGET */}

              <div
                style={{
                  marginBottom: 15,
                }}
              >
                <label
                  style={
                    closeLabelStyle
                  }
                >
                  Budget
                  <span
                    style={{
                      color: "#DC2626",
                    }}
                  >
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    closeForm.budget
                  }
                  onChange={(event) =>
                    handleCloseFormChange(
                      "budget",
                      event.target.value
                    )
                  }
                  placeholder="Enter budget"
                  disabled={
                    closeSubmitting
                  }
                  style={
                    closeInputStyle
                  }
                />
              </div>

              {/* DATES */}

              <div
                className="close-note-two-column"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    marginBottom: 15,
                  }}
                >
                  <label
                    style={
                      closeLabelStyle
                    }
                  >
                    From Date
                    <span
                      style={{
                        color: "#DC2626",
                      }}
                    >
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    value={
                      closeForm.fromDate
                    }
                    onChange={(event) =>
                      handleCloseFormChange(
                        "fromDate",
                        event.target.value
                      )
                    }
                    disabled={
                      closeSubmitting
                    }
                    style={
                      closeInputStyle
                    }
                  />
                </div>

                <div
                  style={{
                    marginBottom: 15,
                  }}
                >
                  <label
                    style={
                      closeLabelStyle
                    }
                  >
                    To Date
                    <span
                      style={{
                        color: "#DC2626",
                      }}
                    >
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    value={
                      closeForm.toDate
                    }
                    min={
                      closeForm.fromDate ||
                      undefined
                    }
                    onChange={(event) =>
                      handleCloseFormChange(
                        "toDate",
                        event.target.value
                      )
                    }
                    disabled={
                      closeSubmitting
                    }
                    style={
                      closeInputStyle
                    }
                  />
                </div>
              </div>

              {/* REMARK */}

              <div
                style={{
                  marginBottom: 20,
                }}
              >
                <label
                  style={
                    closeLabelStyle
                  }
                >
                  Remark
                  <span
                    style={{
                      color: C.inkSoft,
                      fontWeight: 400,
                      marginLeft: 5,
                    }}
                  >
                    (Optional)
                  </span>
                </label>

                <textarea
                  value={
                    closeForm.remark
                  }
                  onChange={(event) =>
                    handleCloseFormChange(
                      "remark",
                      event.target.value
                    )
                  }
                  placeholder="Add any additional information..."
                  rows={3}
                  disabled={
                    closeSubmitting
                  }
                  style={{
                    ...closeInputStyle,
                    resize: "vertical",
                    minHeight: 75,
                  }}
                />
              </div>

              {/* BUTTONS */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                  paddingTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={
                    closeCloseNoteModal
                  }
                  disabled={
                    closeSubmitting
                  }
                  style={{
                    padding:
                      "10px 16px",
                    border:
                      `1px solid ${C.border}`,
                    borderRadius: 8,
                    background:
                      "#fff",
                    color: C.ink,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      closeSubmitting
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSubmitCloseLead
                  }
                  disabled={
                    closeSubmitting
                  }
                  style={{
                    padding:
                      "10px 18px",
                    border: "none",
                    borderRadius: 8,
                    background:
                      C.primary,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 650,
                    cursor:
                      closeSubmitting
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      closeSubmitting
                        ? 0.65
                        : 1,
                  }}
                >
                  {closeSubmitting
                    ? "Saving..."
                    : "Close Lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          RESPONSIVE CSS
      ================================================= */}

      <style>{`
        .employee-mobile-overlay {
          display: none;
        }

        .close-note-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }

        .close-note-modal {
          width: 100%;
          max-width: 620px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
        }

        @media (max-width: 900px) {
          .employee-sidebar {
            position: fixed !important;
            width: 250px !important;
            height: 100vh !important;
            min-height: 100vh !important;
            top: 0 !important;
            bottom: 0 !important;
            left: -260px !important;
            z-index: 1100 !important;
            transition: left 0.25s ease !important;
            box-shadow: 10px 0 30px rgba(0,0,0,0.18);
          }

          .employee-sidebar-open {
            left: 0 !important;
          }

          .employee-mobile-topbar {
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 58px;
            background: #0B1220;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            z-index: 900;
          }

          .employee-mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 950;
          }

          .employee-mobile-close {
            display: block !important;
          }

          .employee-main {
            width: 100%;
            margin-left: 0 !important;
            padding: 82px 18px 25px !important;
          }

          .employee-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .employee-dashboard-grid {
            grid-template-columns: 1fr !important;
          }

          .employee-lead-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .quick-actions {
            grid-template-columns: 1fr !important;
          }

          .timesheet-stats {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .close-note-overlay {
            align-items: flex-start;
            padding: 10px;
          }

          .close-note-modal {
            max-height: calc(100vh - 20px);
            border-radius: 10px;
          }

          .close-note-two-column {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
        }

        @media (max-width: 520px) {
          .employee-stats-grid {
            grid-template-columns:
              1fr 1fr !important;
            gap: 10px !important;
          }

          .employee-lead-stats {
            grid-template-columns:
              1fr 1fr !important;
          }

          .employee-main {
            padding-left: 13px !important;
            padding-right: 13px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function EmployeeStat({
  icon: Icon,
  label,
  value,
}) {
  return (
    <Panel
      style={{
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: C.inkSoft,
              marginBottom: 7,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: 27,
              fontWeight: 750,
              lineHeight: 1,
              color: C.ink,
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 9,
            background:
              C.borderSoft,
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          <Icon
            size={18}
            color={C.primary}
          />
        </div>
      </div>
    </Panel>
  );
}

function MiniStat({
  label,
  value,
}) {
  return (
    <Panel
      style={{
        padding: 17,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.inkSoft,
          marginBottom: 7,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 21,
          fontWeight: 700,
          color: C.ink,
        }}
      >
        {value}
      </div>
    </Panel>
  );
}

function PipelineRow({
  label,
  value,
  total,
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) * 100
        )
      : 0;

  return (
    <div
      style={{
        marginBottom: 17,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: C.inkSoft,
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {value}
        </span>
      </div>

      <div
        style={{
          height: 7,
          background:
            C.borderSoft,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background:
              C.primary,
            borderRadius: 20,
            transition:
              "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function AttendanceBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding: "12px 13px",
        border:
          `1px solid ${C.border}`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.inkSoft,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems:
          "center",
        gap: 12,
        padding: "14px",
        border:
          `1px solid ${C.border}`,
        borderRadius: 9,
        background: "#fff",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background:
            C.borderSoft,
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          flexShrink: 0,
        }}
      >
        <Icon
          size={17}
          color={C.primary}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.ink,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 11,
            color: C.inkSoft,
            marginTop: 3,
          }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function attendanceButton(
  background
) {
  return {
    minWidth: 130,
    padding: "11px 18px",
    border: "none",
    borderRadius: 8,
    background,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}

const closeLabelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 650,
  color: C.ink,
  marginBottom: 6,
};

const closeInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  border:
    `1px solid ${C.border}`,
  borderRadius: 7,
  background: "#fff",
  color: C.ink,
  fontSize: 13,
  outline: "none",
  fontFamily:
    "'IBM Plex Sans', sans-serif",
};

const tableHeadStyle = {
  padding: "12px 18px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: C.inkSoft,
  background:
    C.borderSoft,
  borderBottom:
    `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  padding: "13px 18px",
  fontSize: 12,
  color: C.ink,
  borderBottom:
    `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};