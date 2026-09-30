import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  LayoutDashboard,
  Users,
  Clock,
  LogOut,
  Menu,
  X,
  Activity,
  PauseCircle,
  CheckCircle2,
  CalendarDays,
  Timer,
  User,
  RefreshCw,
  FileText,
} from "lucide-react";

import { useAuth } from "./AuthContext";

import {
  C,
  Panel,
  PageHeader,
} from "./ui";

import {
  getTodayTimesheet,
  getEmployeeTimesheets,
  checkIn,
  checkOut,
} from "./timesheetDatabase";

import EmployeeMonthlyTimesheet from "./EmployeeMonthlyTimesheet";
import MetaAdsReports from "./MetaAdsReports";

import { supabase } from "./supabase";

import logo from "./assets/ruvigza-logo.png";


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function MetaAdsDashboard() {
  const {
    currentUser,
    logout,
  } = useAuth();

  const [view, setView] =
    useState("dashboard");

  const [clients, setClients] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [todayTimesheet, setTodayTimesheet] =
    useState(null);

  const [timesheets, setTimesheets] =
    useState([]);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [liveWorkingSeconds, setLiveWorkingSeconds] =
    useState(0);

  const [
    updatingStatusId,
    setUpdatingStatusId,
  ] = useState(null);

  const employeeId =
    currentUser?.id;


  /* =======================================================
     LOAD CLIENTS
  ======================================================= */

  const loadClients = useCallback(
    async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);

        /*
          IMPORTANT:

          requirement_note is loaded from
          client_service_assignments.

          completed_at is also loaded here so that
          the dashboard keeps the exact completion
          timestamp used by Service Performance.
        */

        const {
          data: assignments,
          error: assignmentError,
        } = await supabase
          .from(
            "client_service_assignments"
          )
          .select(`
            id,
            lead_id,
            service_type,
            assigned_to,
            assigned_by,
            status,
            assigned_at,
            completed_at,
            requirement_note
          `)
          .eq(
            "assigned_to",
            currentUser.id
          )
          .eq(
            "service_type",
            "meta_ads"
          )
          .order(
            "assigned_at",
            {
              ascending: false,
            }
          );

        if (assignmentError) {
          throw assignmentError;
        }

        const assignmentRows =
          assignments || [];

        if (
          assignmentRows.length === 0
        ) {
          setClients([]);
          return;
        }

        const leadIds =
          assignmentRows.map(
            (item) =>
              item.lead_id
          );

        const {
          data: leads,
          error: leadsError,
        } = await supabase
          .from("leads")
          .select("*")
          .in(
            "id",
            leadIds
          );

        if (leadsError) {
          throw leadsError;
        }

        const leadMap =
          new Map(
            (leads || []).map(
              (lead) => [
                lead.id,
                lead,
              ]
            )
          );

        /*
          Load the employee names used by the
          Sales Close Note.
        */

        const closedByIds = [
          ...(leads || [])
            .map(
              (lead) =>
                lead.closed_by
            )
            .filter(Boolean),
        ];

        let closedByMap =
          new Map();

        if (
          closedByIds.length > 0
        ) {
          const {
            data: closedByEmployees,
            error: closedByError,
          } = await supabase
            .from("team_members")
            .select(
              "id, name, email"
            )
            .in(
              "id",
              closedByIds
            );

          if (closedByError) {
            console.warn(
              "Closed-by employee load error:",
              closedByError
            );
          } else {
            closedByMap =
              new Map(
                (
                  closedByEmployees ||
                  []
                ).map(
                  (employee) => [
                    String(
                      employee.id
                    ),
                    employee,
                  ]
                )
              );
          }
        }

        const combined =
          assignmentRows.map(
            (assignment) => ({
              ...assignment,

              lead: (() => {
                const sourceLead =
                  leadMap.get(
                    assignment.lead_id
                  );

                if (!sourceLead) {
                  return null;
                }

                const closedById =
                  sourceLead.closed_by;

                return {
                  ...sourceLead,

                  closedByName:
                    closedByMap.get(
                      String(
                        closedById ||
                          ""
                      )
                    )?.name ||
                    closedByMap.get(
                      String(
                        closedById ||
                          ""
                      )
                    )?.email ||
                    closedById ||
                    "",
                };
              })(),

              /*
                Fallback:

                If requirement_note was not stored
                in assignment for an older client,
                use lead Close Note requirement.
              */

              requirementNote:
                assignment.requirement_note ||
                leadMap.get(
                  assignment.lead_id
                )?.close_requirement ||
                "",

              closedByName:
                closedByMap.get(
                  String(
                    leadMap.get(
                      assignment.lead_id
                    )?.closed_by ||
                      ""
                  )
                )?.name ||
                closedByMap.get(
                  String(
                    leadMap.get(
                      assignment.lead_id
                    )?.closed_by ||
                      ""
                  )
                )?.email ||
                leadMap.get(
                  assignment.lead_id
                )?.closed_by ||
                "",
            })
          );

        setClients(
          combined
        );
      } catch (error) {
        console.error(
          "Meta clients load error:",
          error
        );

        setClients([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.id]
  );


  /* =======================================================
     LOAD TIMESHEET
  ======================================================= */

  const loadTimesheet =
    useCallback(
      async () => {
        if (!employeeId) return;

        try {
          const [
            today,
            history,
          ] = await Promise.all([
            getTodayTimesheet(
              employeeId
            ),

            getEmployeeTimesheets(
              employeeId
            ),
          ]);

          setTodayTimesheet(
            today || null
          );

          setTimesheets(
            history || []
          );
        } catch (error) {
          console.error(
            "Meta timesheet load error:",
            error
          );
        }
      },
      [employeeId]
    );


  /* =======================================================
     REFRESH
  ======================================================= */

  const refresh = useCallback(
    async () => {
      await Promise.all([
        loadClients(),
        loadTimesheet(),
      ]);
    },
    [
      loadClients,
      loadTimesheet,
    ]
  );


  useEffect(() => {
    refresh();
  }, [refresh]);


  /* =======================================================
     LIVE TIMER
  ======================================================= */

  useEffect(() => {
    if (
      !todayTimesheet?.check_in ||
      todayTimesheet?.check_out
    ) {
      setLiveWorkingSeconds(
        todayTimesheet?.working_minutes
          ? todayTimesheet.working_minutes *
            60
          : 0
      );

      return;
    }

    const calculateElapsedTime =
      () => {
        const checkInTime =
          new Date(
            todayTimesheet.check_in
          ).getTime();

        const now =
          Date.now();

        const elapsedSeconds =
          Math.max(
            0,
            Math.floor(
              (
                now -
                checkInTime
              ) /
                1000
            )
          );

        setLiveWorkingSeconds(
          elapsedSeconds
        );
      };

    calculateElapsedTime();

    const timer =
      setInterval(
        calculateElapsedTime,
        1000
      );

    return () =>
      clearInterval(timer);
  }, [
    todayTimesheet?.check_in,
    todayTimesheet?.check_out,
    todayTimesheet?.working_minutes,
  ]);


  /* =======================================================
     CHECK IN
  ======================================================= */

  const handleCheckIn =
    async () => {
      if (!employeeId) return;

      try {
        setAttendanceLoading(
          true
        );

        const result =
          await checkIn(
            employeeId
          );

        setTodayTimesheet(
          result
        );

        const history =
          await getEmployeeTimesheets(
            employeeId
          );

        setTimesheets(
          history || []
        );
      } catch (error) {
        console.error(
          "Meta check in error:",
          error
        );

        alert(
          error.message ||
            "Unable to check in."
        );
      } finally {
        setAttendanceLoading(
          false
        );
      }
    };


  /* =======================================================
     CHECK OUT
  ======================================================= */

  const handleCheckOut =
    async () => {
      if (!employeeId) return;

      try {
        setAttendanceLoading(
          true
        );

        const result =
          await checkOut(
            employeeId
          );

        setTodayTimesheet(
          result
        );

        const history =
          await getEmployeeTimesheets(
            employeeId
          );

        setTimesheets(
          history || []
        );
      } catch (error) {
        console.error(
          "Meta check out error:",
          error
        );

        alert(
          error.message ||
            "Unable to check out."
        );
      } finally {
        setAttendanceLoading(
          false
        );
      }
    };


  /* =======================================================
     UPDATE CLIENT STATUS
  ======================================================= */

  const handleStatusChange =
    async (
      assignmentId,
      newStatus
    ) => {
      if (
        !assignmentId ||
        !newStatus
      ) {
        return;
      }

      try {
        setUpdatingStatusId(
          assignmentId
        );

        /*
          IMPORTANT COMPLETION LOGIC:

          When status becomes Completed,
          save the exact completion timestamp.

          When status changes away from Completed,
          remove completed_at.

          This is required by Service Performance
          to calculate Completed Leads and monthly
          service incentive correctly.
        */

        const completedAt =
          newStatus === "Completed"
            ? new Date().toISOString()
            : null;

        const {
          data,
          error,
        } = await supabase
          .from(
            "client_service_assignments"
          )
          .update({
            status:
              newStatus,

            completed_at:
              completedAt,
          })
          .eq(
            "id",
            assignmentId
          )
          .eq(
            "assigned_to",
            currentUser.id
          )
          .eq(
            "service_type",
            "meta_ads"
          )
          .select(`
            id,
            lead_id,
            service_type,
            assigned_to,
            assigned_by,
            status,
            assigned_at,
            completed_at,
            requirement_note
          `)
          .single();

        if (error) {
          throw error;
        }

        setClients(
          (previous) =>
            previous.map(
              (client) =>
                client.id ===
                assignmentId
                  ? {
                      ...client,

                      status:
                        data.status,

                      completed_at:
                        data.completed_at,

                      requirement_note:
                        data.requirement_note,

                      requirementNote:
                        data.requirement_note ||
                        client.requirementNote ||
                        client.lead
                          ?.close_requirement ||
                        "",
                    }
                  : client
            )
        );
      } catch (error) {
        console.error(
          "Client status update error:",
          error
        );

        alert(
          error.message ||
            "Unable to update client status."
        );
      } finally {
        setUpdatingStatusId(
          null
        );
      }
    };


  /* =======================================================
     HELPERS
  ======================================================= */

  const formatTime =
    (value) => {
      if (!value) return "—";

      return new Date(
        value
      ).toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      );
    };


  const formatMinutes =
    (minutes) => {
      if (!minutes) return "0m";

      const hours =
        Math.floor(
          minutes / 60
        );

      const mins =
        minutes % 60;

      if (hours === 0) {
        return `${mins}m`;
      }

      return `${hours}h ${mins}m`;
    };


  const formatLiveTime =
    (seconds) => {
      const hours =
        Math.floor(
          seconds / 3600
        );

      const minutes =
        Math.floor(
          (seconds % 3600) /
            60
        );

      const secs =
        seconds % 60;

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


  const selectView =
    (id) => {
      setView(id);
      setMobileMenu(
        false
      );
    };


  /* =======================================================
     CLIENT STATS
  ======================================================= */

  const totalClients =
    clients.length;

  const assignedClients =
    clients.filter(
      (item) =>
        item.status ===
        "Assigned"
    ).length;

  const onboardingClients =
    clients.filter(
      (item) =>
        item.status ===
        "Onboarding"
    ).length;

  const activeClients =
    clients.filter(
      (item) =>
        item.status ===
        "Active"
    ).length;

  const pausedClients =
    clients.filter(
      (item) =>
        item.status ===
        "Paused"
    ).length;

  const completedClients =
    clients.filter(
      (item) =>
        item.status ===
        "Completed"
    ).length;


  const nav = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },

    {
      id: "clients",
      label: "My Clients",
      icon: Users,
      badge:
        totalClients,
    },

    {
      id: "timesheet",
      label: "Timesheet",
      icon: Clock,
    },

    {
    id: "reports",
    label: "Meta Ads Reports",
    icon: FileText,
  },

  ];


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        minHeight:
          "100vh",

        display:
          "flex",

        background:
          C.bg,

        color:
          C.ink,

        fontFamily:
          "'IBM Plex Sans', sans-serif",
      }}
    >

      {/* ===================================================
          MOBILE TOP BAR
      =================================================== */}

      <div
        className="meta-mobile-topbar"
        style={{
          display:
            "none",
        }}
      >
        <button
          onClick={() =>
            setMobileMenu(
              true
            )
          }
          style={{
            border:
              "none",

            background:
              "transparent",

            cursor:
              "pointer",

            color:
              "#fff",
          }}
        >
          <Menu
            size={24}
          />
        </button>

        <img
          src={logo}
          alt="RUVIGZA"
          style={{
            height: 30,
            width: "auto",
            objectFit:
              "contain",
          }}
        />
      </div>


      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {mobileMenu && (
        <div
          onClick={() =>
            setMobileMenu(
              false
            )
          }
          className="meta-mobile-overlay"
        />
      )}


      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`meta-sidebar ${
          mobileMenu
            ? "meta-sidebar-open"
            : ""
        }`}
        style={{
          width: 250,
          height: "100vh",
          minHeight:
            "100vh",

          background:
            "#0B1220",

          color:
            "#fff",

          display:
            "flex",

          flexDirection:
            "column",

          flexShrink: 0,

          position:
            "fixed",

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

            position:
              "relative",
          }}
        >
          <img
            src={logo}
            alt="RUVIGZA Digital Technologies"
            style={{
              width: 155,
              height:
                "auto",

              display:
                "block",

              objectFit:
                "contain",
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
              setMobileMenu(
                false
              )
            }
            className="meta-mobile-close"
            style={{
              display:
                "none",

              position:
                "absolute",

              right: 15,
              top: 18,

              border:
                "none",

              background:
                "transparent",

              color:
                "#fff",

              cursor:
                "pointer",
            }}
          >
            <X
              size={22}
            />
          </button>
        </div>


        {/* NAVIGATION */}

        <div
          style={{
            flex: 1,
            padding:
              "18px 12px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color:
                "#64748B",

              fontWeight: 700,

              letterSpacing:
                "1px",

              padding:
                "0 12px 9px",

              textTransform:
                "uppercase",
            }}
          >
            Workspace
          </div>

          {nav.map(
            (item) => {
              const Icon =
                item.icon;

              const active =
                view ===
                item.id;

              return (
                <button
                  key={
                    item.id
                  }
                  onClick={() =>
                    selectView(
                      item.id
                    )
                  }
                  style={{
                    width:
                      "100%",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap: 11,

                    padding:
                      "11px 12px",

                    marginBottom:
                      4,

                    borderRadius:
                      8,

                    border:
                      "none",

                    background:
                      active
                        ? "rgba(255,255,255,0.11)"
                        : "transparent",

                    color:
                      active
                        ? "#FFFFFF"
                        : "#A8B4C5",

                    fontSize: 14,

                    fontWeight:
                      active
                        ? 600
                        : 500,

                    cursor:
                      "pointer",

                    textAlign:
                      "left",
                  }}
                >
                  <Icon
                    size={17}
                  />

                  <span
                    style={{
                      flex: 1,
                    }}
                  >
                    {
                      item.label
                    }
                  </span>

                  {item.badge >
                    0 && (
                    <span
                      style={{
                        fontSize: 11,

                        background:
                          active
                            ? "rgba(255,255,255,0.17)"
                            : "rgba(255,255,255,0.08)",

                        color:
                          "#CBD5E1",

                        padding:
                          "2px 7px",

                        borderRadius:
                          20,
                      }}
                    >
                      {
                        item.badge
                      }
                    </span>
                  )}
                </button>
              );
            }
          )}
        </div>


        {/* PROFILE */}

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
              display:
                "flex",

              alignItems:
                "center",

              gap: 10,

              padding:
                "8px 10px",

              marginBottom:
                5,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,

                borderRadius:
                  "50%",

                background:
                  "#1E293B",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",
              }}
            >
              <User
                size={17}
                color="#CBD5E1"
              />
            </div>

            <div
              style={{
                minWidth:
                  0,
              }}
            >
              <div
                style={{
                  fontSize: 13,

                  fontWeight:
                    600,

                  color:
                    "#00A8FF",

                  overflow:
                    "hidden",

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

                  color:
                    "#64748B",

                  marginTop: 2,
                }}
              >
                Meta Ads Manager
              </div>
            </div>
          </div>

          <button
            onClick={
              logout
            }
            style={{
              width:
                "100%",

              display:
                "flex",

              alignItems:
                "center",

              gap: 10,

              padding:
                "10px 12px",

              borderRadius:
                7,

              border:
                "none",

              background:
                "transparent",

              color:
                "#94A3B8",

              fontSize: 13,

              cursor:
                "pointer",

              textAlign:
                "left",
            }}
          >
            <LogOut
              size={16}
            />

            Log out
          </button>
        </div>
      </aside>


      {/* ===================================================
          MAIN
      =================================================== */}

      <main
        className="meta-main"
        style={{
          flex: 1,

          minWidth: 0,

          marginLeft: 250,

          padding:
            "30px 34px",
        }}
      >

        {/* =================================================
            DASHBOARD
        ================================================= */}

        {view ===
          "dashboard" && (
          <>
            <PageHeader
              title={`Welcome back, ${
                currentUser?.name ||
                "Meta Ads Manager"
              }`}
              subtitle="Here is your Meta Ads workspace overview for today."
            />

            <div
              className="meta-stats-grid"
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",

                gap: 16,

                marginBottom:
                  22,
              }}
            >
              <MetaStat
                icon={
                  Users
                }
                label="My Clients"
                value={
                  totalClients
                }
              />

              <MetaStat
                icon={
                  Activity
                }
                label="Active"
                value={
                  activeClients
                }
              />

              <MetaStat
                icon={
                  PauseCircle
                }
                label="Paused"
                value={
                  pausedClients
                }
              />

              <MetaStat
                icon={
                  CheckCircle2
                }
                label="Completed"
                value={
                  completedClients
                }
              />
            </div>


            <div
              className="meta-dashboard-grid"
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "minmax(0, 1.5fr) minmax(300px, 1fr)",

                gap: 18,
              }}
            >

              {/* CLIENT OVERVIEW */}

              <Panel
                style={{
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    marginBottom:
                      20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      My Meta Ads Clients
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color:
                          C.inkSoft,

                        marginTop: 3,
                      }}
                    >
                      Clients assigned to you
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      selectView(
                        "clients"
                      )
                    }
                    style={{
                      border:
                        "none",

                      background:
                        "transparent",

                      color:
                        C.primary,

                      fontSize: 12,

                      fontWeight:
                        600,

                      cursor:
                        "pointer",
                    }}
                  >
                    View Clients →
                  </button>
                </div>

                {clients.length ===
                0 ? (
                  <div
                    style={{
                      padding:
                        "35px 20px",

                      textAlign:
                        "center",

                      color:
                        C.inkSoft,

                      fontSize: 13,
                    }}
                  >
                    No Meta Ads clients assigned yet.
                  </div>
                ) : (
                  clients
                    .slice(0, 5)
                    .map(
                      (
                        item
                      ) => (
                        <ClientOverviewRow
                          key={
                            item.id
                          }
                          client={
                            item
                          }
                        />
                      )
                    )
                )}
              </Panel>


              {/* ATTENDANCE */}

              <Panel
                style={{
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap: 10,

                    marginBottom:
                      20,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,

                      borderRadius:
                        9,

                      background:
                        "#EEF2FF",

                      display:
                        "flex",

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
                        color:
                          C.inkSoft,
                      }}
                    >
                      {new Date().toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month:
                            "short",
                          year:
                            "numeric",
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap: 12,

                    marginBottom:
                      18,
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

                    borderRadius:
                      8,

                    marginBottom:
                      14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        C.inkSoft,
                      marginBottom:
                        4,
                    }}
                  >
                    Working Time
                  </div>

                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 750,
                      letterSpacing:
                        "1px",
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
                      width:
                        "100%",

                      padding:
                        "11px 14px",

                      borderRadius:
                        8,

                      background:
                        "#ECFDF5",

                      color:
                        "#047857",

                      textAlign:
                        "center",

                      fontSize: 13,

                      fontWeight:
                        600,
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
                className="meta-quick-actions"
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",

                  gap: 12,
                }}
              >

              <div
                  className="meta-quick-actions"
                  style={{
                  display:
                  "grid",

                  gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",

                   gap: 12,
                  }}
                 ></div>

                <QuickAction
                  icon={
                    Users
                  }
                  title="My Clients"
                  subtitle={`${totalClients} Meta Ads clients`}
                  onClick={() =>
                    selectView(
                      "clients"
                    )
                  }
                />

                <QuickAction
                  icon={
                    Clock
                  }
                  title="Timesheet"
                  subtitle="View attendance history"
                  onClick={() =>
                    selectView(
                      "timesheet"
                    )
                  }
                />

                <QuickAction
                  icon={
                    RefreshCw
                  }
                  title="Refresh Data"
                  subtitle="Reload client information"
                  onClick={
                    refresh
                  }
                />
              </div>
            </Panel>
          </>
        )}


        {/* =================================================
            CLIENTS
        ================================================= */}

        {view ===
          "clients" && (
          <>
            <PageHeader
              title="My Clients"
              subtitle={`${totalClients} Meta Ads client${
                totalClients ===
                1
                  ? ""
                  : "s"
              } assigned to you.`}
            />

            <div
              className="meta-client-stats"
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(5, minmax(0, 1fr))",

                gap: 14,

                marginBottom:
                  18,
              }}
            >
              <MiniStat
                label="Total"
                value={
                  totalClients
                }
              />

              <MiniStat
                label="Assigned"
                value={
                  assignedClients
                }
              />

              <MiniStat
                label="Active"
                value={
                  activeClients
                }
              />

              <MiniStat
                label="Paused"
                value={
                  pausedClients
                }
              />

              <MiniStat
                label="Completed"
                value={
                  completedClients
                }
              />
            </div>


            <Panel
              style={{
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  padding:
                    "18px 20px",

                  borderBottom:
                    `1px solid ${C.border}`,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Meta Ads Clients
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color:
                        C.inkSoft,

                      marginTop: 2,
                    }}
                  >
                    Manage your assigned client service status and view requirements.
                  </div>
                </div>

                <button
                  onClick={
                    refresh
                  }
                  disabled={
                    loading
                  }
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap: 6,

                    padding:
                      "8px 12px",

                    border:
                      `1px solid ${C.border}`,

                    borderRadius:
                      7,

                    background:
                      "#fff",

                    color:
                      C.ink,

                    cursor:
                      "pointer",

                    fontSize: 12,

                    fontWeight:
                      600,
                  }}
                >
                  <RefreshCw
                    size={14}
                  />

                  Refresh
                </button>
              </div>

              {loading ? (
                <div
                  style={{
                    padding: 40,
                    textAlign:
                      "center",
                    color:
                      C.inkSoft,
                    fontSize: 13,
                  }}
                >
                  Loading clients...
                </div>
              ) : clients.length ===
                0 ? (
                <div
                  style={{
                    padding: 45,
                    textAlign:
                      "center",
                    color:
                      C.inkSoft,
                    fontSize: 13,
                  }}
                >
                  No Meta Ads clients assigned to you yet.
                </div>
              ) : (
                <ClientTable
                  clients={
                    clients
                  }

                  updatingStatusId={
                    updatingStatusId
                  }

                  onStatusChange={
                    handleStatusChange
                  }
                />
              )}
            </Panel>
          </>
        )}

        {/* =================================================
            META ADS REPORTS
          ================================================= */}

          {view ===
             "reports" && (
             <>
            <MetaAdsReports />
             </>
        )}       


        {/* =================================================
            TIMESHEET
        ================================================= */}

        {view ===
          "timesheet" && (
          <>
            <PageHeader
              title="My Timesheet"
              subtitle="Track your daily working hours and attendance."
            />

            <Panel
              style={{
                padding: 22,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  gap: 20,

                  flexWrap:
                    "wrap",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap: 13,
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,

                      borderRadius:
                        11,

                      background:
                        "#EEF2FF",

                      display:
                        "flex",

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
                        color:
                          C.inkSoft,
                        marginTop: 3,
                      }}
                    >
                      Check in when you start work and check out when you finish.
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

                      borderRadius:
                        8,

                      background:
                        "#ECFDF5",

                      color:
                        "#047857",

                      fontSize: 13,

                      fontWeight:
                        600,
                    }}
                  >
                    Completed
                  </div>
                )}
              </div>
            </Panel>


            <div
              className="meta-timesheet-stats"
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",

                gap: 14,

                marginBottom:
                  18,
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
                value={
                  todayTimesheet?.check_in &&
                  !todayTimesheet?.check_out
                    ? formatLiveTime(
                        liveWorkingSeconds
                      )
                    : formatMinutes(
                        todayTimesheet?.working_minutes
                      )
                }
              />
            </div>


            <Panel
              style={{
                padding: 22,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap: 12,
                }}
              >
                <Timer
                  size={22}
                  color={
                    C.primary
                  }
                />

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color:
                        C.inkSoft,
                    }}
                  >
                    Current Working Time
                  </div>

                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 750,
                      letterSpacing:
                        "1px",
                      fontVariantNumeric:
                        "tabular-nums",
                      marginTop: 3,
                    }}
                  >
                    {todayTimesheet?.check_in
                      ? formatLiveTime(
                          liveWorkingSeconds
                        )
                      : "00:00:00"}
                  </div>
                </div>
              </div>
            </Panel>


            <Panel
              style={{
                overflow:
                  "hidden",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  padding:
                    "18px 20px",

                  borderBottom:
                    `1px solid ${C.border}`,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap: 10,
                }}
              >
                <CalendarDays
                  size={18}
                  color={
                    C.primary
                  }
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
                </div>
              </div>

              {timesheets.length ===
              0 ? (
                <div
                  style={{
                    padding: 35,
                    textAlign:
                      "center",
                    color:
                      C.inkSoft,
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
                      width:
                        "100%",

                      borderCollapse:
                        "collapse",

                      minWidth:
                        650,
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
                              {formatDate(
                                row.work_date
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
                              style={
                                tableCellStyle
                              }
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
                              {row.status ||
                                "Completed"}
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

              leads={clients
                .map(
                  (item) => {
                    if (
                      !item.lead
                    ) {
                      return null;
                    }

                    return {
                      ...item.lead,

                      /*
                        Service assignment status वापरायचा.
                        Original sales lead status नाही.
                      */

                      status:
                        item.status ||
                        "Assigned",

                      originalLeadStatus:
                        item.lead
                          .status,

                      serviceType:
                        item.service_type,

                      assignmentId:
                        item.id,

                      /*
                        Requirement Note
                        also available in monthly
                        timesheet/client data.
                      */

                      requirementNote:
                        item.requirementNote ||
                        item.requirement_note ||
                        item.lead.close_requirement ||
                        "",
                    };
                  }
                )
                .filter(
                  Boolean
                )}
            />
          </>
        )}
      </main>


      {/* ===================================================
          CSS
      =================================================== */}

      <style>{`
        .meta-mobile-overlay {
          display: none;
        }

        @media (max-width: 1050px) {
          .meta-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .meta-client-stats {
            grid-template-columns:
              repeat(3, minmax(0, 1fr)) !important;
          }

          .meta-dashboard-grid {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 900px) {
          .meta-sidebar {
            position: fixed !important;
            width: 250px !important;
            height: 100vh !important;
            min-height: 100vh !important;
            top: 0 !important;
            bottom: 0 !important;
            left: -260px !important;
            z-index: 1100 !important;
            transition: left 0.25s ease !important;
            box-shadow:
              10px 0 30px rgba(0,0,0,0.18);
          }

          .meta-sidebar-open {
            left: 0 !important;
          }

          .meta-mobile-topbar {
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

          .meta-mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background:
              rgba(0,0,0,0.45);
            z-index: 950;
          }

          .meta-mobile-close {
            display: block !important;
          }

          .meta-main {
            width: 100%;
            margin-left: 0 !important;
            padding:
              82px 18px 25px !important;
          }

          .meta-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .meta-dashboard-grid {
            grid-template-columns:
              1fr !important;
          }

          .meta-client-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .meta-timesheet-stats {
            grid-template-columns:
              1fr !important;
          }

          .meta-quick-actions {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 520px) {
          .meta-stats-grid {
            grid-template-columns:
              1fr 1fr !important;
            gap: 10px !important;
          }

          .meta-client-stats {
            grid-template-columns:
              1fr 1fr !important;
          }

          .meta-main {
            padding-left:
              13px !important;

            padding-right:
              13px !important;
          }
        }
      `}</style>
    </div>
  );
}


/* =========================================================
   CLIENT TABLE
========================================================= */

function ClientTable({
  clients,
  updatingStatusId,
  onStatusChange,
}) {
  const [selectedRequirementLead, setSelectedRequirementLead] =
    useState(null);

  return (
    <div
      style={{
        overflowX:
          "auto",
      }}
    >
      <table
        style={{
          width:
            "100%",

          borderCollapse:
            "collapse",

          minWidth:
            1150,
        }}
      >
        <thead>
          <tr>
            <th
              style={
                tableHeadStyle
              }
            >
              Client
            </th>

            <th
              style={
                tableHeadStyle
              }
            >
              Category
            </th>

            <th
              style={
                tableHeadStyle
              }
            >
              Contact
            </th>

            <th
              style={
                tableHeadStyle
              }
            >
              Requirement Note
            </th>

            <th
              style={
                tableHeadStyle
              }
            >
              Status
            </th>

            <th
              style={
                tableHeadStyle
              }
            >
              Assigned
            </th>
          </tr>
        </thead>

        <tbody>
          {clients.map(
            (item) => {
              const lead =
                item.lead;

              const requirementNote =
                item.requirementNote ||
                item.requirement_note ||
                lead?.close_requirement ||
                "";

              return (
                <tr
                  key={
                    item.id
                  }
                >

                  {/* CLIENT */}

                  <td
                    style={
                      tableCellStyle
                    }
                  >
                    <div
                      style={{
                        fontWeight:
                          700,

                        fontSize:
                          13,
                      }}
                    >
                      {getClientName(
                        lead
                      )}
                    </div>

                    {lead?.email && (
                      <div
                        style={{
                          fontSize:
                            11,

                          color:
                            C.inkSoft,

                          marginTop:
                            3,
                        }}
                      >
                        {
                          lead.email
                        }
                      </div>
                    )}
                  </td>


                  {/* CATEGORY */}

                  <td
                    style={
                      tableCellStyle
                    }
                  >
                    {getCategory(
                      lead
                    )}
                  </td>


                  {/* CONTACT */}

                  <td
                    style={
                      tableCellStyle
                    }
                  >
                    {getContact(
                      lead
                    )}
                  </td>


                  {/* REQUIREMENT NOTE */}

                  <td
                    style={{
                      ...tableCellStyle,
                      whiteSpace:
                        "normal",
                      minWidth:
                        220,
                    }}
                  >
                    {hasCloseNote(lead) ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRequirementLead(
                            lead
                          )
                        }
                        style={
                          requirementButtonStyle
                        }
                      >
                        <FileText
                          size={14}
                        />
                        View Requirement
                      </button>
                    ) : (
                      <span
                        style={{
                          color:
                            C.inkSoft,
                          fontSize:
                            12,
                        }}
                      >
                        No requirement note added.
                      </span>
                    )}
                  </td>


                  {/* STATUS */}

                  <td
                    style={
                      tableCellStyle
                    }
                  >
                    <select
                      value={
                        item.status ||
                        "Assigned"
                      }
                      disabled={
                        updatingStatusId ===
                        item.id
                      }
                      onChange={(
                        event
                      ) =>
                        onStatusChange(
                          item.id,
                          event
                            .target
                            .value
                        )
                      }
                      style={{
                        minWidth:
                          125,

                        padding:
                          "7px 10px",

                        border:
                          `1px solid ${C.border}`,

                        borderRadius:
                          7,

                        background:
                          getStatusBackground(
                            item.status
                          ),

                        color:
                          getStatusColor(
                            item.status
                          ),

                        fontSize:
                          12,

                        fontWeight:
                          600,

                        cursor:
                          updatingStatusId ===
                          item.id
                            ? "wait"
                            : "pointer",

                        outline:
                          "none",
                      }}
                    >
                      <option value="Assigned">
                        Assigned
                      </option>

                      <option value="Onboarding">
                        Onboarding
                      </option>

                      <option value="Active">
                        Active
                      </option>

                      <option value="Paused">
                        Paused
                      </option>

                      <option value="Completed">
                        Completed
                      </option>
                    </select>

                    {updatingStatusId ===
                      item.id && (
                      <span
                        style={{
                          marginLeft:
                            7,

                          fontSize:
                            10,

                          color:
                            C.inkSoft,
                        }}
                      >
                        Saving...
                      </span>
                    )}
                  </td>


                  {/* ASSIGNED DATE */}

                  <td
                    style={
                      tableCellStyle
                    }
                  >
                    {formatDate(
                      item.assigned_at
                    )}
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>

      {selectedRequirementLead && (
        <RequirementNoteModal
          lead={
            selectedRequirementLead
          }
          onClose={() =>
            setSelectedRequirementLead(
              null
            )
          }
        />
      )}
    </div>
  );
}


/* =========================================================
   CLIENT OVERVIEW ROW
========================================================= */

function ClientOverviewRow({
  client,
}) {
  const [selectedRequirementLead, setSelectedRequirementLead] =
    useState(null);

  const lead =
    client.lead;

  const requirementNote =
    client.requirementNote ||
    client.requirement_note ||
    lead?.close_requirement ||
    "";

  return (
    <div
      style={{
        padding:
          "13px 0",

        borderBottom:
          `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: 12,
        }}
      >
        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,

              fontWeight: 700,

              overflow:
                "hidden",

              textOverflow:
                "ellipsis",

              whiteSpace:
                "nowrap",
            }}
          >
            {getClientName(
              lead
            )}
          </div>

          <div
            style={{
              fontSize: 11,

              color:
                C.inkSoft,

              marginTop: 3,
            }}
          >
            {getCategory(
              lead
            )}
          </div>
        </div>

        <StatusBadge
          status={
            client.status
          }
        />
      </div>


      {/* REQUIREMENT NOTE */}

      {hasCloseNote(lead) && (
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 10,
            marginTop: 10,
            padding:
              "9px 10px",
            borderRadius: 7,
            background:
              "#F8FAFC",
            border:
              `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 7,
              minWidth: 0,
            }}
          >
            <FileText
              size={14}
              color={
                C.primary
              }
              style={{
                flexShrink: 0,
              }}
            />

            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color:
                  C.inkSoft,
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.5px",
              }}
            >
              Requirement Note
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedRequirementLead(
                lead
              )
            }
            style={
              requirementButtonStyle
            }
          >
            View Requirement
          </button>
        </div>
      )}

      {selectedRequirementLead && (
        <RequirementNoteModal
          lead={
            selectedRequirementLead
          }
          onClose={() =>
            setSelectedRequirementLead(
              null
            )
          }
        />
      )}
    </div>
  );
}


/* =========================================================
   REQUIREMENT NOTE MODAL
========================================================= */

function RequirementNoteModal({
  lead,
  onClose,
}) {
  if (!lead) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        zIndex: 3000,
        padding: 20,
      }}
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 12,
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            padding:
              "18px 20px",
            borderBottom:
              `1px solid ${C.border}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 750,
              }}
            >
              Requirement Note
            </div>

            <div
              style={{
                fontSize: 12,
                color:
                  C.inkSoft,
                marginTop: 4,
              }}
            >
              {getClientName(
                lead
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            style={{
              width: 34,
              height: 34,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              border:
                "none",
              borderRadius:
                7,
              background:
                C.borderSoft,
              cursor:
                "pointer",
            }}
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div
          style={{
            padding: 20,
          }}
        >
          <CloseNoteRow
            label="Requirement"
            value={
              lead.close_requirement
            }
            multiline
          />

          <CloseNoteRow
            label="Service"
            value={formatCloseService(
              lead.close_service
            )}
          />

          <CloseNoteRow
            label="Budget"
            value={formatBudget(
              lead.close_budget,
              lead.close_budget_type
            )}
          />

          <CloseNoteRow
            label="Budget Type"
            value={formatBudgetType(
              lead.close_budget_type
            )}
          />

          <CloseNoteRow
            label="From Date"
            value={formatDate(
              lead.close_from_date
            )}
          />

          <CloseNoteRow
            label="To Date"
            value={formatDate(
              lead.close_to_date
            )}
          />

          <CloseNoteRow
            label="Remark"
            value={
              lead.close_remark
            }
            multiline
            optional
          />

          <div
            style={{
              height: 1,
              background:
                C.border,
              margin:
                "18px 0",
            }}
          />

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <div
                style={
                  closeNoteLabelStyle
                }
              >
                Closed By
              </div>

              <div
                style={
                  closeNoteValueStyle
                }
              >
                {lead.closedByName ||
                  lead.closed_by ||
                  "—"}
              </div>
            </div>

            <div>
              <div
                style={
                  closeNoteLabelStyle
                }
              >
                Closed Date
              </div>

              <div
                style={
                  closeNoteValueStyle
                }
              >
                {formatDateTime(
                  lead.closed_at
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "flex-end",
            padding:
              "0 20px 20px",
          }}
        >
          <button
            type="button"
            onClick={
              onClose
            }
            style={{
              padding:
                "9px 16px",
              border:
                `1px solid ${C.border}`,
              borderRadius:
                7,
              background:
                "#fff",
              cursor:
                "pointer",
              fontSize: 12,
              fontWeight:
                600,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


function CloseNoteRow({
  label,
  value,
  multiline = false,
  optional = false,
}) {
  return (
    <div
      style={{
        marginBottom: 16,
      }}
    >
      <div
        style={
          closeNoteLabelStyle
        }
      >
        {label}

        {optional && (
          <span
            style={{
              fontWeight: 400,
              color:
                C.inkSoft,
              marginLeft: 5,
            }}
          >
            (Optional)
          </span>
        )}
      </div>

      <div
        style={{
          ...closeNoteValueStyle,
          whiteSpace:
            multiline
              ? "pre-wrap"
              : "normal",
          minHeight:
            multiline
              ? 40
              : "auto",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {
  const background =
    getStatusBackground(
      status
    );

  const color =
    getStatusColor(
      status
    );

  return (
    <span
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        padding:
          "4px 9px",

        borderRadius:
          20,

        background,

        color,

        fontSize: 11,

        fontWeight:
          600,

        whiteSpace:
          "nowrap",
      }}
    >
      {status ||
        "Assigned"}
    </span>
  );
}


/* =========================================================
   ATTENDANCE BOX
========================================================= */

function AttendanceBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding:
          "12px 13px",

        border:
          `1px solid ${C.border}`,

        borderRadius:
          8,
      }}
    >
      <div
        style={{
          fontSize: 10,

          color:
            C.inkSoft,

          marginBottom:
            4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,

          fontWeight:
            700,
        }}
      >
        {value}
      </div>
    </div>
  );
}


/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
}) {
  return (
    <button
      onClick={
        onClick
      }
      style={{
        display:
          "flex",

        alignItems:
          "center",

        gap: 12,

        padding:
          "14px",

        border:
          `1px solid ${C.border}`,

        borderRadius:
          9,

        background:
          "#fff",

        cursor:
          "pointer",

        textAlign:
          "left",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,

          borderRadius:
            8,

          background:
            C.borderSoft,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          flexShrink: 0,
        }}
      >
        <Icon
          size={17}
          color={
            C.primary
          }
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 13,

            fontWeight:
              700,

            color:
              C.ink,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 11,

            color:
              C.inkSoft,

            marginTop:
              3,
          }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}


/* =========================================================
   GENERAL HELPERS
========================================================= */

function formatDate(
  value
) {
  if (!value)
    return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


function formatDateTime(
  value
) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


function formatCloseService(
  value
) {
  if (!value) return "—";

  if (
    value ===
    "google_ads"
  ) {
    return "Google Ads";
  }

  if (
    value ===
    "meta_ads"
  ) {
    return "Meta Ads";
  }

  return value;
}


function formatBudgetType(
  value
) {
  if (!value) return "—";

  if (
    value ===
    "daily"
  ) {
    return "Daily";
  }

  if (
    value ===
    "monthly"
  ) {
    return "Monthly";
  }

  return value;
}


function formatBudget(
  budget,
  budgetType
) {
  if (
    budget === null ||
    budget === undefined ||
    budget === ""
  ) {
    return "—";
  }

  const number =
    Number(budget);

  if (
    Number.isNaN(number)
  ) {
    return String(
      budget
    );
  }

  return `₹${number.toLocaleString(
    "en-IN"
  )} / ${formatBudgetType(
    budgetType
  )}`;
}


function hasCloseNote(
  lead
) {
  if (!lead) return false;

  return Boolean(
    lead.close_requirement ||
    lead.close_service ||
    lead.close_budget ||
    lead.close_budget_type ||
    lead.close_from_date ||
    lead.close_to_date ||
    lead.close_remark ||
    lead.closed_by ||
    lead.closed_at
  );
}


const requirementButtonStyle = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap: 6,

  padding:
    "7px 11px",

  border:
    `1px solid ${C.border}`,

  borderRadius:
    7,

  background:
    "#fff",

  color:
    C.ink,

  fontSize: 11,

  fontWeight:
    650,

  cursor:
    "pointer",
};


const closeNoteLabelStyle = {
  fontSize: 11,

  fontWeight:
    700,

  color:
    C.inkSoft,

  marginBottom:
    6,

  textTransform:
    "uppercase",

  letterSpacing:
    "0.03em",
};


const closeNoteValueStyle = {
  padding:
    "10px 12px",

  border:
    `1px solid ${C.border}`,

  borderRadius:
    7,

  background:
    "#F8FAFC",

  fontSize: 13,

  lineHeight:
    1.5,

  color:
    C.ink,
};


function attendanceButton(
  background
) {
  return {
    minWidth: 130,

    padding:
      "11px 18px",

    border:
      "none",

    borderRadius:
      8,

    background,

    color:
      "#fff",

    fontSize: 13,

    fontWeight:
      600,

    cursor:
      "pointer",
  };
}


function getClientName(
  lead
) {
  if (!lead) {
    return "Unnamed Client";
  }

  return (
    lead.name ||
    lead.business_name ||
    lead.businessName ||
    lead.company_name ||
    lead.companyName ||
    "Unnamed Client"
  );
}


function getCategory(
  lead
) {
  if (!lead)
    return "—";

  return (
    lead.business_category ||
    lead.category ||
    lead.businessCategory ||
    "—"
  );
}


function getContact(
  lead
) {
  if (!lead)
    return "—";

  return (
    lead.contact ||
    lead.phone ||
    lead.mobile ||
    "—"
  );
}


/* =========================================================
   STATUS COLORS
========================================================= */

function getStatusBackground(
  status
) {
  switch (
    status
  ) {
    case "Active":
      return "#ECFDF5";

    case "Paused":
      return "#FFF7ED";

    case "Onboarding":
      return "#EEF2FF";

    case "Completed":
      return "#F0FDF4";

    case "Assigned":
    default:
      return "#F1F5F9";
  }
}


function getStatusColor(
  status
) {
  switch (
    status
  ) {
    case "Active":
      return "#047857";

    case "Paused":
      return "#C2410C";

    case "Onboarding":
      return "#4338CA";

    case "Completed":
      return "#166534";

    case "Assigned":
    default:
      return "#475569";
  }
}


/* =========================================================
   TABLE STYLES
========================================================= */

const tableHeadStyle = {
  padding:
    "12px 18px",

  textAlign:
    "left",

  fontSize: 11,

  fontWeight:
    700,

  color:
    C.inkSoft,

  background:
    C.borderSoft,

  borderBottom:
    `1px solid ${C.border}`,

  whiteSpace:
    "nowrap",
};


const tableCellStyle = {
  padding:
    "13px 18px",

  fontSize: 12,

  color:
    C.ink,

  borderBottom:
    `1px solid ${C.border}`,

  whiteSpace:
    "nowrap",
};


/* =========================================================
   MINI STAT
========================================================= */

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

          color:
            C.inkSoft,

          marginBottom:
            7,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 21,

          fontWeight:
            700,

          color:
            C.ink,
        }}
      >
        {value}
      </div>
    </Panel>
  );
}


/* =========================================================
   META STAT
========================================================= */

function MetaStat({
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
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,

              color:
                C.inkSoft,

              marginBottom:
                7,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: 27,

              fontWeight:
                750,

              lineHeight: 1,

              color:
                C.ink,
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            width: 40,
            height: 40,

            borderRadius:
              9,

            background:
              C.borderSoft,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",
          }}
        >
          <Icon
            size={18}
            color={
              C.primary
            }
          />
        </div>
      </div>
    </Panel>
  );
}