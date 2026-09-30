import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  LayoutDashboard,
  Users,
  UploadCloud,
  UserCog,
  LogOut,
  Menu,
  X,
  BarChart3,
  Clock,
  BriefcaseBusiness,
  FileBarChart,
  CircleDollarSign,
  ChevronDown,
} from "lucide-react";

import { useAuth } from "./AuthContext";
import { C, PageHeader } from "./ui";

import Dashboard from "./Dashboard";
import LeadsTable from "./LeadsTable";
import UploadExcel from "./UploadExcel";
import TeamManagement from "./TeamManagement";
import TeamPerformance from "./TeamPerformance";
import TimesheetAdmin from "./TimesheetAdmin";
import ClosedLeads from "./ClosedLeads";
import MetaAdsReports from "./MetaAdsReports";
import GoogleAdsReports from "./GoogleAdsReports";
import RevenueDashboard from "./RevenueDashboard";

import {
  getAllLeads,
  deleteLead,
  updateLead,
  assignLead,
} from "./leadsDatabase";

import { getUploadHistory } from "./mockDatabase";

import { supabase } from "./supabase";

import logo from "./assets/ruvigza-logo.png";

export default function AdminView() {
  const { currentUser, logout } = useAuth();

  // ---------------------------------------------------------
  // VIEW STATE
  // ---------------------------------------------------------

  const [view, setView] = useState("dashboard");

  // Existing Reports state
  const [reportsOpen, setReportsOpen] = useState(false);

  // New collapsible section states
  const [clientManagementOpen, setClientManagementOpen] =
    useState(false);

  const [businessManagementOpen, setBusinessManagementOpen] =
    useState(false);

  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ---------------------------------------------------------
  // REFRESH ADMIN DATA
  // ---------------------------------------------------------

  const refresh = useCallback(async () => {
    try {
      const [
        allLeads,
        teamMembersResult,
        rolesResult,
        history,
      ] = await Promise.all([
        getAllLeads(),

        supabase
          .from("team_members")
          .select("*")
          .eq("is_active", true)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("roles")
          .select("id, name")
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),

        getUploadHistory(),
      ]);

      const {
        data: teamMembers,
        error: teamError,
      } = teamMembersResult;

      const {
        data: roles,
        error: rolesError,
      } = rolesResult;

      // -----------------------------------------------------
      // TEAM MEMBERS ERROR
      // -----------------------------------------------------

      if (teamError) {
        console.error(
          "Team members fetch error:",
          teamError
        );

        return;
      }

      // -----------------------------------------------------
      // ROLES ERROR
      // -----------------------------------------------------

      if (rolesError) {
        console.error(
          "Roles fetch error:",
          rolesError
        );

        return;
      }

      setLeads(allLeads || []);

      // -----------------------------------------------------
      // MAP EMPLOYEES
      // -----------------------------------------------------

      const mappedEmployees = (teamMembers || [])
        .filter(
          (member) =>
            member.role === "sales"
        )
        .map((member) => {
          const employmentRole =
            (roles || []).find(
              (role) =>
                Number(role.id) ===
                Number(
                  member.employment_role_id
                )
            );

          return {
            id: member.id,

            name: member.name,

            username: member.email,

            email: member.email,

            phone: member.phone,

            role: "employee",

            employmentType:
              member.employment_type,

            employmentRoleId:
              member.employment_role_id,

            employmentRoleName:
              employmentRole?.name || "",

            isActive:
              member.is_active,

            authUserId:
              member.auth_user_id,

            monthlySalary:
              member.monthly_salary,

            commissionPercentage:
              member.commission_percentage,
          };
        });

      // -----------------------------------------------------
      // DEBUG
      // -----------------------------------------------------

      console.log(
        "TEAM MEMBERS:",
        teamMembers
      );

      console.log(
        "ROLES:",
        roles
      );

      console.log(
        "MAPPED EMPLOYEES:",
        mappedEmployees
      );

      // -----------------------------------------------------
      // SAVE DATA
      // -----------------------------------------------------

      setEmployees(
        mappedEmployees
      );

      setUploadHistory(
        history || []
      );
    } catch (error) {
      console.error(
        "Admin refresh error:",
        error
      );
    }
  }, []);

  // ---------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---------------------------------------------------------
  // LEAD HANDLERS
  // ---------------------------------------------------------

  const handleUpdateStatus = async (
    id,
    status
  ) => {
    await updateLead(id, {
      status,
    });

    await refresh();
  };

  const handleAssign = async (
    id,
    employeeId
  ) => {
    await assignLead(
      id,
      employeeId
    );

    await refresh();
  };

  const handleUpdatePackage = async (
    id,
    packageTier
  ) => {
    try {
      await updateLead(id, {
        packageTier,
      });

      await refresh();
    } catch (error) {
      console.error(
        "Update package error:",
        error
      );

      alert(
        "Unable to update package."
      );
    }
  };

  const handleDelete = async (id) => {
    await deleteLead(id);

    await refresh();
  };

  // ---------------------------------------------------------
  // VIEW CHANGE
  // ---------------------------------------------------------

  const handleViewChange = (id) => {
    setView(id);
    setMobileMenuOpen(false);

    // Automatically open relevant parent section
    if (
      id === "leads" ||
      id === "closed-leads"
    ) {
      setClientManagementOpen(true);
    }

    if (
      id === "revenue" ||
      id === "performance" ||
      id === "team"
    ) {
      setBusinessManagementOpen(true);
    }

    if (
      id === "reports" ||
      id === "greports"
    ) {
      setReportsOpen(true);
    }
  };

  // ---------------------------------------------------------
  // ACTIVE STATES
  // ---------------------------------------------------------

  const clientManagementActive =
    view === "leads" ||
    view === "closed-leads";

  const businessManagementActive =
    view === "revenue" ||
    view === "performance" ||
    view === "team";

  const reportsActive =
    view === "reports" ||
    view === "greports";

  // ---------------------------------------------------------
  // NAV ITEM RENDERER
  // ---------------------------------------------------------

  const renderNavItem = ({
    id,
    label,
    icon: Icon,
    badge,
    nested = false,
  }) => {
    const active =
      view === id;

    return (
      <button
        key={id}
        onClick={() =>
          handleViewChange(id)
        }
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: nested ? 8 : 11,
          padding: nested
            ? "8px 10px"
            : "10px 12px",
          marginBottom: 2,
          borderRadius: nested ? 7 : 8,
          border: "none",
          background: active
            ? nested
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.11)"
            : "transparent",
          color: active
            ? "#FFFFFF"
            : "#AEB8C5",
          fontSize: nested ? 12 : 13,
          fontWeight: active
            ? 600
            : 500,
          cursor: "pointer",
          textAlign: "left",
          transition:
            "background 0.2s ease, color 0.2s ease",
        }}
      >
        {nested ? (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background:
                "currentColor",
              flexShrink: 0,
            }}
          />
        ) : (
          <Icon size={17} />
        )}

        <span
          style={{
            flex: 1,
          }}
        >
          {label}
        </span>

        {badge > 0 && (
          <span
            style={{
              fontSize: 10,
              background:
                "rgba(255,255,255,0.12)",
              padding: "2px 7px",
              borderRadius: 20,
              lineHeight: 1.3,
            }}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  // ---------------------------------------------------------
  // COLLAPSIBLE SECTION HEADER
  // ---------------------------------------------------------

  const renderSection = ({
    label,
    icon: Icon,
    open,
    setOpen,
    active,
    children,
  }) => {
    return (
      <div
        style={{
          marginBottom: 4,
        }}
      >
        <button
          onClick={() =>
            setOpen(
              (prev) => !prev
            )
          }
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "10px 12px",
            marginBottom: open ? 2 : 3,
            borderRadius: 8,
            border: "none",
            background: active
              ? "rgba(255,255,255,0.11)"
              : "transparent",
            color: active
              ? "#FFFFFF"
              : "#AEB8C5",
            fontSize: 13,
            fontWeight: active
              ? 600
              : 500,
            cursor: "pointer",
            textAlign: "left",
            transition:
              "background 0.2s ease, color 0.2s ease",
          }}
        >
          <Icon size={17} />

          <span
            style={{
              flex: 1,
            }}
          >
            {label}
          </span>

          <ChevronDown
            size={15}
            style={{
              transition:
                "transform 0.2s ease",
              transform: open
                ? "rotate(180deg)"
                : "rotate(0deg)",
              opacity: 0.8,
            }}
          />
        </button>

        {open && (
          <div
            style={{
              marginLeft: 28,
              marginBottom: 5,
            }}
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily:
          "'IBM Plex Sans', sans-serif",
        color: C.ink,
        background: C.bg,
      }}
    >
      {/* =====================================================
          MOBILE HEADER
      ====================================================== */}

      <div
        className="admin-mobile-header"
        style={{
          display: "none",
          height: 62,
          background: "#0B1220",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 16px",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <img
          src={logo}
          alt="RUVIGZA"
          style={{
            width: 125,
            height: "auto",
            objectFit: "contain",
          }}
        />

        <button
          onClick={() =>
            setMobileMenuOpen(
              !mobileMenuOpen
            )
          }
          style={{
            border: "none",
            background:
              "transparent",
            color: "#fff",
            cursor: "pointer",
            padding: 6,
          }}
        >
          {mobileMenuOpen ? (
            <X size={23} />
          ) : (
            <Menu size={23} />
          )}
        </button>
      </div>

      {/* =====================================================
          OVERLAY
      ====================================================== */}

      {mobileMenuOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`admin-sidebar ${
          mobileMenuOpen
            ? "admin-sidebar-open"
            : ""
        }`}
        style={{
          width: 250,
          background: "#0B1220",
          color: "#EDF3F1",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          minHeight: "100vh",
          position: "fixed",
          zIndex: 1100,
        }}
      >
        {/* ---------------------------------------------------
            LOGO
        ---------------------------------------------------- */}

        <div
          style={{
            padding:
              "22px 20px 18px",
            borderBottom:
              "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <img
            src={logo}
            alt="RUVIGZA Digital Technologies"
            style={{
              width: 145,
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
              display: "block",
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
              transition:
                "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color =
                "#00B7FF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color =
                "#94A3B8";
            }}
          >
            TRACKING & MANAGEMENT SOLUTION
          </div>
        </div>

        {/* ---------------------------------------------------
            NAVIGATION
        ---------------------------------------------------- */}

        <div
          style={{
            flex: 1,
            padding: "12px 10px",
            overflowY: "auto",
          }}
        >
          {/* =================================================
              DASHBOARD
          ================================================== */}

          {renderNavItem({
            id: "dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
          })}

          {/* =================================================
              CLIENT MANAGEMENT
          ================================================== */}

          {renderSection({
            label: "Client Management",
            icon: Users,
            open:
              clientManagementOpen,
            setOpen:
              setClientManagementOpen,
            active:
              clientManagementActive,
            children: (
              <>
                {renderNavItem({
                  id: "leads",
                  label: "Leads & Clients",
                  badge: leads.length,
                  nested: true,
                })}

                {renderNavItem({
                  id: "closed-leads",
                  label: "Closed Leads",
                  badge:
                    leads.filter(
                      (lead) =>
                        lead.status ===
                        "Closed"
                    ).length,
                  nested: true,
                })}
              </>
            ),
          })}

          {/* =================================================
              BUSINESS MANAGEMENT
          ================================================== */}

          {renderSection({
            label: "Business Management",
            icon: BriefcaseBusiness,
            open:
              businessManagementOpen,
            setOpen:
              setBusinessManagementOpen,
            active:
              businessManagementActive,
            children: (
              <>
                {renderNavItem({
                  id: "revenue",
                  label: "Agency Revenue",
                  icon: CircleDollarSign,
                  nested: true,
                })}

                {renderNavItem({
                  id: "performance",
                  label: "Team Performance",
                  icon: BarChart3,
                  nested: true,
                })}

                {renderNavItem({
                  id: "team",
                  label: "Team",
                  icon: UserCog,
                  nested: true,
                })}
              </>
            ),
          })}

          {/* =================================================
              TIMESHEETS
          ================================================== */}

          {renderNavItem({
            id: "timesheets",
            label: "Timesheets",
            icon: Clock,
          })}

          {/* =================================================
              IMPORT EXCEL
          ================================================== */}

          {renderNavItem({
            id: "upload",
            label: "Import Excel",
            icon: UploadCloud,
          })}

          {/* =================================================
              REPORTS
              Existing functionality preserved
          ================================================== */}

          <div
            style={{
              marginTop: 3,
            }}
          >
            <button
              onClick={() =>
                setReportsOpen(
                  (prev) => !prev
                )
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding:
                  "10px 12px",
                marginBottom:
                  reportsOpen ? 2 : 3,
                borderRadius: 8,
                border: "none",
                background:
                  reportsActive
                    ? "rgba(255,255,255,0.11)"
                    : "transparent",
                color:
                  reportsActive
                    ? "#FFFFFF"
                    : "#AEB8C5",
                fontSize: 13,
                fontWeight:
                  reportsActive
                    ? 600
                    : 500,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FileBarChart size={17} />

              <span
                style={{
                  flex: 1,
                }}
              >
                Reports
              </span>

              <ChevronDown
                size={15}
                style={{
                  transition:
                    "transform 0.2s ease",
                  transform:
                    reportsOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  opacity: 0.8,
                }}
              />
            </button>

            {/* -------------------------------------------------
                REPORTS SUB MENU
            -------------------------------------------------- */}

            {reportsOpen && (
              <div
                style={{
                  marginLeft: 28,
                  marginBottom: 5,
                }}
              >
                {/* META ADS REPORTS */}

                <button
                  onClick={() =>
                    handleViewChange(
                      "reports"
                    )
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    padding:
                      "8px 10px",
                    marginBottom: 2,
                    borderRadius: 7,
                    border: "none",
                    background:
                      view === "reports"
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                    color:
                      view === "reports"
                        ? "#FFFFFF"
                        : "#AEB8C5",
                    fontSize: 12,
                    fontWeight:
                      view === "reports"
                        ? 600
                        : 500,
                    cursor: "pointer",
                    textAlign:
                      "left",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius:
                        "50%",
                      background:
                        "currentColor",
                      flexShrink: 0,
                    }}
                  />

                  <span>
                    Meta Ads Reports
                  </span>
                </button>

                {/* GOOGLE ADS REPORTS */}

                <button
                  onClick={() =>
                    handleViewChange(
                      "greports"
                    )
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    padding:
                      "8px 10px",
                    marginBottom: 2,
                    borderRadius: 7,
                    border: "none",
                    background:
                      view === "greports"
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                    color:
                      view === "greports"
                        ? "#FFFFFF"
                        : "#AEB8C5",
                    fontSize: 12,
                    fontWeight:
                      view === "greports"
                        ? 600
                        : 500,
                    cursor: "pointer",
                    textAlign:
                      "left",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius:
                        "50%",
                      background:
                        "currentColor",
                      flexShrink: 0,
                    }}
                  />

                  <span>
                    Google Ads Reports
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            ADMIN PROFILE
        ====================================================== */}

        <div
          style={{
            padding: 12,
            borderTop:
              "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 9,
              padding:
                "8px 9px",
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 31,
                height: 31,
                borderRadius:
                  "50%",
                background:
                  "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {(currentUser?.name ||
                "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#00A8FF",
                  whiteSpace:
                    "nowrap",
                  overflow:
                    "hidden",
                  textOverflow:
                    "ellipsis",
                }}
              >
                {currentUser?.name}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: "#7F8B9B",
                }}
              >
                Administrator
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%",
              display: "flex",
              alignItems:
                "center",
              gap: 10,
              padding:
                "9px 12px",
              borderRadius: 7,
              border: "none",
              background:
                "transparent",
              color: "#AEB8C5",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <LogOut size={16} />

            Log out
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main
        className="admin-main"
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: 250,
          padding:
            "28px 32px",
          overflowX: "hidden",
        }}
      >
        {/* ---------------------------------------------------
            DASHBOARD
        ---------------------------------------------------- */}

        {view === "dashboard" && (
          <Dashboard
            leads={leads}
            employees={employees}
            uploadHistory={
              uploadHistory
            }
            onNavigate={
              handleViewChange
            }
          />
        )}

        {/* ---------------------------------------------------
            LEADS & CLIENTS
        ---------------------------------------------------- */}

        {view === "leads" && (
          <>
            <PageHeader
              title="Leads & Clients"
              subtitle={`${leads.length} total records across the team.`}
            />

            <LeadsTable
              leads={leads}
              employees={
                employees
              }
              canReassign
              canDelete
              onUpdateStatus={
                handleUpdateStatus
              }
              onAssign={
                handleAssign
              }
              onUpdatePackage={
                handleUpdatePackage
              }
              onDelete={
                handleDelete
              }
            />
          </>
        )}

        {/* ---------------------------------------------------
            CLOSED LEADS
        ---------------------------------------------------- */}

        {view === "closed-leads" && (
          <ClosedLeads
            leads={leads}
            employees={
              employees
            }
            currentUser={
              currentUser
            }
          />
        )}

        {/* ---------------------------------------------------
            AGENCY REVENUE
        ---------------------------------------------------- */}

        {view === "revenue" && (
          <RevenueDashboard />
        )}

        {/* ---------------------------------------------------
            TEAM PERFORMANCE
        ---------------------------------------------------- */}

        {view === "performance" && (
          <TeamPerformance
            employees={
              employees
            }
            leads={leads}
          />
        )}

        {/* ---------------------------------------------------
            META ADS REPORTS
        ---------------------------------------------------- */}

        {view === "reports" && (
          <MetaAdsReports />
        )}

        {/* ---------------------------------------------------
            GOOGLE ADS REPORTS
        ---------------------------------------------------- */}

        {view === "greports" && (
          <GoogleAdsReports />
        )}

        {/* ---------------------------------------------------
            TIMESHEETS
        ---------------------------------------------------- */}

        {view === "timesheets" && (
          <TimesheetAdmin
            employees={
              employees
            }
          />
        )}

        {/* ---------------------------------------------------
            IMPORT EXCEL
        ---------------------------------------------------- */}

        {view === "upload" && (
          <UploadExcel
            onImported={
              refresh
            }
          />
        )}

        {/* ---------------------------------------------------
            TEAM
        ---------------------------------------------------- */}

        {view === "team" && (
          <TeamManagement
            employees={
              employees
            }
            leads={leads}
            onChanged={
              refresh
            }
          />
        )}
      </main>

      {/* =====================================================
          RESPONSIVE CSS
      ====================================================== */}

      <style>{`
        @media (max-width: 900px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .admin-sidebar-open {
            transform: translateX(0);
          }

          .admin-sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 1050;
          }

          .admin-mobile-header {
            display: flex !important;
          }

          .admin-main {
            width: 100%;
            margin-left: 0 !important;
            padding: 82px 20px 24px !important;
          }
        }

        @media (max-width: 600px) {
          .admin-main {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}