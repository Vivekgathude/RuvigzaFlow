import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Save,
  Users,
  XCircle,
} from "lucide-react";

import { C, Panel } from "./ui";
import { supabase } from "./supabase";

import {
  getMonthlyTimesheet,
  saveMonthlyTimesheetDay,
} from "./monthlyTimesheetDatabase";

export default function EmployeeMonthlyTimesheet({
  employeeId,
  leads = [],
}) {
  const getCurrentMonth = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [selectedDate, setSelectedDate] =
    useState("");

  const [monthlyData, setMonthlyData] = useState([]);

  const [workingMinutes, setWorkingMinutes] =
    useState(0);

  const [selectedLeadIds, setSelectedLeadIds] =
    useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  /* =====================================================
     MONTH DAYS
  ===================================================== */

  const monthDays = useMemo(() => {
    if (!selectedMonth) return [];

    const [year, month] =
      selectedMonth.split("-").map(Number);

    const totalDays = new Date(
      year,
      month,
      0
    ).getDate();

    return Array.from(
      { length: totalDays },
      (_, index) => {
        const day = index + 1;

        return `${selectedMonth}-${String(day).padStart(
          2,
          "0"
        )}`;
      }
    );
  }, [selectedMonth]);

  /* =====================================================
     DEFAULT DATE
  ===================================================== */

  useEffect(() => {
    if (monthDays.length > 0) {
      setSelectedDate(monthDays[0]);
    }
  }, [monthDays]);

  /* =====================================================
     FETCH MONTHLY DATA
  ===================================================== */

  const loadMonthlyData = async () => {
    if (!employeeId || !selectedMonth) return;

    try {
      setLoading(true);

      const data = await getMonthlyTimesheet(
        employeeId,
        selectedMonth
      );

      setMonthlyData(data || []);
    } catch (error) {
      console.error(
        "Monthly timesheet load error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to load monthly timesheet."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyData();
  }, [employeeId, selectedMonth]);

  /* =====================================================
     LEADS
     Only Closed / Not Interested
  ===================================================== */

  const selectableLeads = useMemo(() => {
  return leads.filter(
    (lead) => lead.status !== "New"
  );
}, [leads]);

  /* =====================================================
     ATTENDANCE FOR SELECTED DATE
  ===================================================== */

  const loadAttendanceForDate = async (date) => {
    if (!employeeId || !date) return;

    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("employee_timesheets")
        .select(
          "check_in, check_out, working_minutes"
        )
        .eq("employee_id", employeeId)
        .eq("work_date", date)
        .maybeSingle();

      if (error) throw error;

      setWorkingMinutes(
        data?.working_minutes || 0
      );

      const existingEntry = monthlyData.find(
        (item) => item.workDate === date
      );

      setSelectedLeadIds(
        existingEntry?.workedLeadIds || []
      );
    } catch (error) {
      console.error(
        "Attendance fetch error:",
        error
      );

      setWorkingMinutes(0);
      setSelectedLeadIds([]);

      setMessage(
        error.message ||
          "Unable to fetch attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadAttendanceForDate(selectedDate);
    }
  }, [selectedDate, monthlyData]);

  /* =====================================================
     DATE SELECT
  ===================================================== */

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  /* =====================================================
     LEAD SELECT
  ===================================================== */

  const toggleLead = (leadId) => {
    setSelectedLeadIds((previous) => {
      if (previous.includes(leadId)) {
        return previous.filter(
          (id) => id !== leadId
        );
      }

      return [...previous, leadId];
    });
  };

  /* =====================================================
     SAVE DAY
  ===================================================== */

  const handleSaveDay = async () => {
    if (!employeeId || !selectedDate) return;

    try {
      setSaving(true);
      setMessage("");

      await saveMonthlyTimesheetDay({
        employeeId,
        workDate: selectedDate,
        workingMinutes,
        leadIds: selectedLeadIds,
      });

      await loadMonthlyData();

      setMessage(
        "Daily timesheet saved successfully."
      );
    } catch (error) {
      console.error(
        "Save monthly timesheet error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to save timesheet."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  const formatMinutes = (minutes) => {
    if (!minutes) return "0h 0m";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours}h ${mins}m`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDayEntry = (date) => {
    return monthlyData.find(
      (item) => item.workDate === date
    );
  };

  const selectedDayEntry =
    getDayEntry(selectedDate);

  const monthlyTotalMinutes = monthlyData.reduce(
    (total, row) =>
      total + Number(row.workingMinutes || 0),
    0
  );

  const submittedDays = monthlyData.length;

  const totalWorkedLeads = monthlyData.reduce(
    (total, row) =>
      total +
      (row.workedLeadIds?.length || 0),
    0
  );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div>
      {/* MONTH HEADER */}

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
            justifyContent: "space-between",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 9,
                background: "#EEF2FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarDays
                size={20}
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
                Monthly Timesheet
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: C.inkSoft,
                  marginTop: 3,
                }}
              >
                Record your daily working hours
                and leads worked.
              </div>
            </div>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value)
            }
            style={{
              padding: "9px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 13,
              color: C.ink,
              background: "#fff",
              cursor: "pointer",
            }}
          />
        </div>
      </Panel>

      {/* MONTH STATS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
        className="monthly-timesheet-stats"
      >
        <MonthlyStat
          icon={Clock}
          label="Total Working Time"
          value={formatMinutes(
            monthlyTotalMinutes
          )}
        />

        <MonthlyStat
          icon={CalendarDays}
          label="Days Submitted"
          value={submittedDays}
        />

        <MonthlyStat
          icon={Users}
          label="Leads Worked"
          value={totalWorkedLeads}
        />
      </div>

      {/* DAILY ENTRY */}

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
            justifyContent: "space-between",
            gap: 15,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Daily Entry
            </div>

            <div
              style={{
                fontSize: 12,
                color: C.inkSoft,
                marginTop: 3,
              }}
            >
              Select a date and record the leads
              you worked on.
            </div>
          </div>

          <input
            type="date"
            value={selectedDate}
            min={monthDays[0]}
            max={monthDays[monthDays.length - 1]}
            onChange={(e) =>
              handleDateChange(e.target.value)
            }
            style={{
              padding: "9px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 13,
              color: C.ink,
              background: "#fff",
            }}
          />
        </div>

        {/* WORKING HOURS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
          className="daily-timesheet-stats"
        >
          <div
            style={{
              padding: 16,
              background: C.borderSoft,
              borderRadius: 9,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: C.inkSoft,
                marginBottom: 6,
              }}
            >
              Working Hours
            </div>

            <div
              style={{
                fontSize: 23,
                fontWeight: 750,
              }}
            >
              {formatMinutes(workingMinutes)}
            </div>

            <div
              style={{
                fontSize: 11,
                color: C.inkSoft,
                marginTop: 5,
              }}
            >
              Auto fetched from check-in /
              check-out
            </div>
          </div>

          <div
            style={{
              padding: 16,
              background:
                selectedDayEntry
                  ? "#ECFDF5"
                  : "#F8FAFC",
              borderRadius: 9,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: C.inkSoft,
                marginBottom: 6,
              }}
            >
              Entry Status
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color:
                  selectedDayEntry
                    ? "#047857"
                    : C.ink,
              }}
            >
              {selectedDayEntry
                ? "Submitted"
                : "Not Submitted"}
            </div>
          </div>
        </div>

        {/* LEAD SELECTION */}

        <div
          style={{
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Users
              size={17}
              color={C.primary}
            />

            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Leads Worked On
            </div>
          </div>

          <div
            style={{
              fontSize: 11,
              color: C.inkSoft,
              marginBottom: 12,
            }}
          >
            Only leads with status{" "}
            <strong>Closed</strong> or{" "}
            <strong>Not Interested</strong> are
            available.
          </div>

          {selectableLeads.length === 0 ? (
            <div
              style={{
                padding: 20,
                border: `1px dashed ${C.border}`,
                borderRadius: 9,
                textAlign: "center",
                color: C.inkSoft,
                fontSize: 12,
              }}
            >
              No Closed or Not Interested leads
              are currently assigned to you.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
              className="monthly-leads-grid"
            >
              {selectableLeads.map((lead) => {
                const selected =
                  selectedLeadIds.includes(
                    lead.id
                  );

                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() =>
                      toggleLead(lead.id)
                    }
                    style={{
                      border: selected
                        ? "1px solid #4F46E5"
                        : `1px solid ${C.border}`,
                      background: selected
                        ? "#EEF2FF"
                        : "#fff",
                      borderRadius: 9,
                      padding: "12px 13px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: selected
                          ? "#4F46E5"
                          : "#F1F5F9",
                      }}
                    >
                      {selected ? (
                        <CheckCircle2
                          size={15}
                          color="#fff"
                        />
                      ) : (
                        <Users
                          size={14}
                          color="#64748B"
                        />
                      )}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.ink,
                          overflow: "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {lead.name ||
                          lead.businessName ||
                          "Unnamed Lead"}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: C.inkSoft,
                          marginTop: 3,
                        }}
                      >
                        {lead.phone || "No phone"}{" "}
                        • {lead.status}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SAVE */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: C.inkSoft,
            }}
          >
            {selectedLeadIds.length} lead
            {selectedLeadIds.length === 1
              ? ""
              : "s"}{" "}
            selected
          </div>

          <button
            onClick={handleSaveDay}
            disabled={saving || loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 17px",
              border: "none",
              borderRadius: 8,
              background: "#0F172A",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                saving || loading
                  ? "not-allowed"
                  : "pointer",
              opacity:
                saving || loading ? 0.6 : 1,
            }}
          >
            <Save size={15} />

            {saving
              ? "Saving..."
              : "Save Day"}
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: 15,
              padding: "10px 12px",
              borderRadius: 7,
              background:
                message.includes("successfully")
                  ? "#ECFDF5"
                  : "#FEF2F2",
              color:
                message.includes("successfully")
                  ? "#047857"
                  : "#B91C1C",
              fontSize: 12,
            }}
          >
            {message}
          </div>
        )}
      </Panel>

      {/* MONTHLY TABLE */}

      <Panel style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
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
              Monthly Summary
            </div>

            <div
              style={{
                fontSize: 11,
                color: C.inkSoft,
                marginTop: 2,
              }}
            >
              Your submitted daily timesheet
              entries
            </div>
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <div
            style={{
              padding: 35,
              textAlign: "center",
              color: C.inkSoft,
              fontSize: 13,
            }}
          >
            No monthly timesheet entries yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeadStyle}>
                    Date
                  </th>

                  <th style={tableHeadStyle}>
                    Working Hours
                  </th>

                  <th style={tableHeadStyle}>
                    Leads Worked
                  </th>

                  <th style={tableHeadStyle}>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {monthlyData.map((row) => (
                  <tr key={row.id}>
                    <td style={tableCellStyle}>
                      {formatDate(row.workDate)}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        fontWeight: 700,
                      }}
                    >
                      {formatMinutes(
                        row.workingMinutes
                      )}
                    </td>

                    <td style={tableCellStyle}>
                      {row.workedLeadIds?.length ||
                        0}
                    </td>

                    <td style={tableCellStyle}>
                      <span
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          gap: 5,
                          padding:
                            "4px 9px",
                          borderRadius: 20,
                          background:
                            "#ECFDF5",
                          color:
                            "#047857",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2
                          size={12}
                        />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* RESPONSIVE */}

      <style>{`
        @media (max-width: 700px) {
          .monthly-timesheet-stats {
            grid-template-columns: 1fr !important;
          }

          .daily-timesheet-stats {
            grid-template-columns: 1fr !important;
          }

          .monthly-leads-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   MONTHLY STAT
========================================================= */

function MonthlyStat({
  icon: Icon,
  label,
  value,
}) {
  return (
    <Panel style={{ padding: 17 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
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
              fontWeight: 750,
              color: C.ink,
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: C.borderSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            size={17}
            color={C.primary}
          />
        </div>
      </div>
    </Panel>
  );
}

/* =========================================================
   TABLE STYLES
========================================================= */

const tableHeadStyle = {
  padding: "12px 18px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: C.inkSoft,
  background: C.borderSoft,
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  padding: "13px 18px",
  fontSize: 12,
  color: C.ink,
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};