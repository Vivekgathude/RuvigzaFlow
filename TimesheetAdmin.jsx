import React, { useEffect, useMemo, useState } from "react";
import {
  Clock,
  CheckCircle2,
  Circle,
  CalendarDays,
  FileSpreadsheet,
} from "lucide-react";

import {
  C,
  Panel,
  PageHeader,
  StatCard,
  inputStyle,
} from "./ui";

import { getAllTimesheets } from "./timesheetDatabase";
import AdminMonthlyTimesheet from "./AdminMonthlyTimesheet";

const formatTime = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return "—";

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) return `${mins}m`;

  return `${hrs}h ${mins}m`;
};

export default function TimesheetAdmin({ employees }) {
  const [activeTab, setActiveTab] = useState("daily");

  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const loadTimesheets = async () => {
    try {
      setLoading(true);

      const data = await getAllTimesheets();

      setTimesheets(data || []);
    } catch (error) {
      console.error("Timesheet loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimesheets();
  }, []);

  const filtered = useMemo(() => {
    return timesheets.filter((item) => {
      if (
        employeeFilter !== "all" &&
        item.employee_id !== employeeFilter
      ) {
        return false;
      }

      if (dateFilter && item.work_date !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [timesheets, employeeFilter, dateFilter]);

  const today = new Date().toISOString().slice(0, 10);

  const todayRecords = timesheets.filter(
    (item) => item.work_date === today
  );

  const checkedInToday = todayRecords.filter(
    (item) => item.check_in && !item.check_out
  ).length;

  const completedToday = todayRecords.filter(
    (item) => item.check_in && item.check_out
  ).length;

  const totalTodayMinutes = todayRecords.reduce(
    (sum, item) => sum + (item.working_minutes || 0),
    0
  );

  const employeeName = (employeeId) => {
    const employee = employees.find(
      (e) => e.id === employeeId
    );

    return employee ? employee.name : "Unknown employee";
  };

  return (
    <div>
      <PageHeader
        title="Employee Timesheets"
        subtitle="Track employee attendance and monthly working records."
      />

      {/* =========================================
          TABS
      ========================================== */}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 22,
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 8,
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 15px",
            borderRadius: 8,
            border:
              activeTab === "daily"
                ? `1px solid ${C.primary}`
                : `1px solid ${C.border}`,
            background:
              activeTab === "daily"
                ? C.primary
                : C.panel,
            color:
              activeTab === "daily"
                ? "#fff"
                : C.inkSoft,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <CalendarDays size={16} />
          Daily Attendance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("monthly")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 15px",
            borderRadius: 8,
            border:
              activeTab === "monthly"
                ? `1px solid ${C.primary}`
                : `1px solid ${C.border}`,
            background:
              activeTab === "monthly"
                ? C.primary
                : C.panel,
            color:
              activeTab === "monthly"
                ? "#fff"
                : C.inkSoft,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <FileSpreadsheet size={16} />
          Monthly Timesheets
        </button>
      </div>

      {/* =========================================
          MONTHLY
      ========================================== */}

      {activeTab === "monthly" ? (
      <AdminMonthlyTimesheet employees={employees} />
      ) : (
        <>
          {/* =========================================
              DAILY SUMMARY
          ========================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: 24,
            }}
            className="timesheet-admin-stats"
          >
            <StatCard
              label="Checked in now"
              value={checkedInToday}
              accent={C.primary}
            />

            <StatCard
              label="Completed today"
              value={completedToday}
              accent={C.primaryDeep}
            />

            <StatCard
              label="Total hours today"
              value={formatMinutes(totalTodayMinutes)}
              accent={C.accentDeep}
            />
          </div>

          {/* =========================================
              DAILY FILTER + TABLE
          ========================================== */}

          <Panel>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 18,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={employeeFilter}
                onChange={(e) =>
                  setEmployeeFilter(e.target.value)
                }
                style={inputStyle}
              >
                <option value="all">
                  All employees
                </option>

                {employees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value)
                }
                style={inputStyle}
              />

              <button
                type="button"
                onClick={() => {
                  setEmployeeFilter("all");
                  setDateFilter("");
                }}
                style={{
                  border: `1px solid ${C.border}`,
                  background: C.panel,
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: C.inkSoft,
                }}
              >
                Clear filters
              </button>
            </div>

            {loading ? (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: C.inkSoft,
                }}
              >
                Loading timesheets...
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: C.inkSoft,
                }}
              >
                No timesheet records found.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    minWidth: 750,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: C.inkFaint,
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "9px 8px" }}>
                        Employee
                      </th>

                      <th style={{ padding: "9px 8px" }}>
                        Date
                      </th>

                      <th style={{ padding: "9px 8px" }}>
                        Check In
                      </th>

                      <th style={{ padding: "9px 8px" }}>
                        Check Out
                      </th>

                      <th style={{ padding: "9px 8px" }}>
                        Working Time
                      </th>

                      <th style={{ padding: "9px 8px" }}>
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderTop: `1px solid ${C.borderSoft}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 8px",
                            fontWeight: 500,
                          }}
                        >
                          {employeeName(item.employee_id)}
                        </td>

                        <td style={{ padding: "10px 8px" }}>
                          {formatDate(item.work_date)}
                        </td>

                        <td style={{ padding: "10px 8px" }}>
                          {item.check_in ? (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <Clock
                                size={14}
                                color={C.primary}
                              />

                              {formatTime(item.check_in)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td style={{ padding: "10px 8px" }}>
                          {item.check_out
                            ? formatTime(item.check_out)
                            : "—"}
                        </td>

                        <td
                          style={{
                            padding: "10px 8px",
                            fontWeight: 500,
                          }}
                        >
                          {formatMinutes(
                            item.working_minutes
                          )}
                        </td>

                        <td style={{ padding: "10px 8px" }}>
                          {item.status === "Completed" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                color: C.primaryDeep,
                              }}
                            >
                              <CheckCircle2 size={14} />
                              Completed
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                color: C.accentDeep,
                              }}
                            >
                              <Circle size={13} />
                              In Progress
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* =========================================
          RESPONSIVE
      ========================================== */}

      <style>{`
        @media (max-width: 800px) {
          .timesheet-admin-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

