import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Users,
  BriefcaseBusiness,
  Download,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";

import { C, Panel, inputStyle } from "./ui";
import { getAllMonthlyTimesheets } from "./monthlyTimesheetDatabase";

export default function AdminMonthlyTimesheet({
  employees = [],
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [month, setMonth] = useState(currentMonth);
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  /* =========================================
     LOAD MONTHLY TIMESHEETS
  ========================================== */

  const loadMonthlyTimesheets = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllMonthlyTimesheets(month);

      setRecords(data || []);
    } catch (err) {
      console.error(
        "Monthly timesheet loading error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load monthly timesheets."
      );

      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyTimesheets();
  }, [month]);

  /* =========================================
     EMPLOYEE LIST
     
     IMPORTANT:
     Dropdown uses Team Management employees,
     not only employees having monthly records.
  ========================================== */

  const employeeList = useMemo(() => {
    return [...employees]
      .filter((employee) => employee?.id)
      .sort((a, b) =>
        (a.name || "").localeCompare(
          b.name || ""
        )
      );
  }, [employees]);

  /* =========================================
     FILTER RECORDS
  ========================================== */

  const filteredRecords = useMemo(() => {
    if (employeeFilter === "all") {
      return records;
    }

    return records.filter(
      (record) =>
        record.employee_id === employeeFilter
    );
  }, [records, employeeFilter]);

  /* =========================================
     SELECTED EMPLOYEE
  ========================================== */

  const selectedEmployee = useMemo(() => {
    if (employeeFilter === "all") {
      return null;
    }

    return (
      employeeList.find(
        (employee) =>
          employee.id === employeeFilter
      ) || null
    );
  }, [employeeFilter, employeeList]);

  /* =========================================
     SUMMARY
  ========================================== */

  const summary = useMemo(() => {
    const employeeIds = new Set();

    let totalMinutes = 0;
    let totalLeads = 0;

    filteredRecords.forEach((record) => {
      if (record.employee_id) {
        employeeIds.add(record.employee_id);
      }

      totalMinutes += Number(
        record.working_minutes || 0
      );

      totalLeads += (
        record.monthly_timesheet_leads || []
      ).length;
    });

    return {
      employees: employeeIds.size,
      days: filteredRecords.length,
      minutes: totalMinutes,
      leads: totalLeads,
    };
  }, [filteredRecords]);

  /* =========================================
     FORMAT MINUTES
  ========================================== */

  const formatMinutes = (minutes) => {
    const total = Number(minutes || 0);

    const hours = Math.floor(total / 60);
    const mins = total % 60;

    if (hours === 0) {
      return `${mins}m`;
    }

    if (mins === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
  };

  /* =========================================
     FORMAT DATE
  ========================================== */

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

  /* =========================================
     FORMAT SUBMITTED AT
  ========================================== */

  const formatSubmittedAt = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  /* =========================================
     DOWNLOAD EXCEL
  ========================================== */

  const downloadExcel = () => {
    if (!filteredRecords.length) {
      return;
    }

    try {
      setDownloading(true);

      const detailRows = [];

      filteredRecords.forEach((record) => {
        const employee =
          record.team_members || {};

        const leadMappings =
          record.monthly_timesheet_leads || [];

        const leads = leadMappings
          .map((item) => item.leads)
          .filter(Boolean);

        detailRows.push({
          "Employee Name":
            employee.name || "",
          "Employee Email":
            employee.email || "",
          "Employee Phone":
            employee.phone || "",

          Date:
            record.work_date || "",

          "Working Time":
            formatMinutes(
              record.working_minutes
            ),

          "Working Minutes":
            Number(
              record.working_minutes || 0
            ),

          "Leads Worked":
            leads.length,

          "Lead Names": leads
            .map((lead) => lead.name)
            .filter(Boolean)
            .join(", "),

          "Lead Phones": leads
            .map((lead) => lead.phone)
            .filter(Boolean)
            .join(", "),

          "Lead Status": leads
            .map((lead) => lead.status)
            .filter(Boolean)
            .join(", "),

          Status:
            record.status || "",

          "Submitted At":
            record.submitted_at || "",
        });
      });

      /* =====================================
         EMPLOYEE SUMMARY SHEET
      ====================================== */

      const employeeMap = new Map();

      filteredRecords.forEach((record) => {
        const employeeId =
          record.employee_id;

        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            employee:
              record.team_members || {},
            days: 0,
            minutes: 0,
            leads: 0,
          });
        }

        const item =
          employeeMap.get(employeeId);

        item.days += 1;

        item.minutes += Number(
          record.working_minutes || 0
        );

        item.leads += (
          record.monthly_timesheet_leads ||
          []
        ).length;
      });

      const summaryRows = Array.from(
        employeeMap.values()
      ).map((item) => ({
        "Employee Name":
          item.employee.name || "",

        "Employee Email":
          item.employee.email || "",

        "Days Submitted":
          item.days,

        "Total Working Time":
          formatMinutes(item.minutes),

        "Total Working Minutes":
          item.minutes,

        "Total Leads Worked":
          item.leads,
      }));

      /* =====================================
         CREATE WORKBOOK
      ====================================== */

      const workbook =
        XLSX.utils.book_new();

      const detailSheet =
        XLSX.utils.json_to_sheet(
          detailRows
        );

      const summarySheet =
        XLSX.utils.json_to_sheet(
          summaryRows
        );

      XLSX.utils.book_append_sheet(
        workbook,
        detailSheet,
        "Monthly Timesheet"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Employee Summary"
      );

      /* =====================================
         COLUMN WIDTH
      ====================================== */

      detailSheet["!cols"] = [
        { wch: 22 },
        { wch: 30 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
        { wch: 35 },
        { wch: 25 },
        { wch: 28 },
        { wch: 15 },
        { wch: 25 },
      ];

      summarySheet["!cols"] = [
        { wch: 22 },
        { wch: 30 },
        { wch: 18 },
        { wch: 24 },
        { wch: 25 },
        { wch: 22 },
      ];

      const employeeName =
        selectedEmployee?.name
          ?.replace(/\s+/g, "_")
          .replace(
            /[^a-zA-Z0-9_-]/g,
            ""
          ) || "All_Employees";

      const fileName =
        `RUVIGZA_Monthly_Timesheet_${month}_${employeeName}.xlsx`;

      XLSX.writeFile(
        workbook,
        fileName
      );
    } catch (err) {
      console.error(
        "Excel download error:",
        err
      );

      setError(
        "Unable to download Excel file."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ width: "100%" }}>

      {/* =====================================
          HEADER
      ====================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 15,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: C.ink,
            }}
          >
            Monthly Timesheets
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: C.inkSoft,
            }}
          >
            View employee monthly working
            records and leads worked.
          </div>
        </div>

        <button
          type="button"
          onClick={downloadExcel}
          disabled={
            !filteredRecords.length ||
            downloading
          }
          style={{
            height: 40,
            border: "none",
            borderRadius: 8,
            padding: "0 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: C.primary,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor:
              !filteredRecords.length ||
              downloading
                ? "not-allowed"
                : "pointer",
            opacity:
              !filteredRecords.length ||
              downloading
                ? 0.5
                : 1,
          }}
        >
          <Download size={16} />

          {downloading
            ? "Downloading..."
            : "Download Excel"}
        </button>
      </div>

      {/* =====================================
          FILTER PANEL
      ====================================== */}

      <Panel
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >

          {/* MONTH */}

          <div>
            <label style={labelStyle}>
              Select Month
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 40,
                padding: "0 10px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                background: C.panel,
              }}
            >
              <CalendarDays
                size={16}
                color={C.inkSoft}
              />

              <input
                type="month"
                value={month}
                onChange={(e) =>
                  setMonth(e.target.value)
                }
                style={{
                  border: "none",
                  outline: "none",
                  background:
                    "transparent",
                  color: C.ink,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          {/* EMPLOYEE */}

          <div>
            <label style={labelStyle}>
              Select Employee
            </label>

            <select
              value={employeeFilter}
              onChange={(e) =>
                setEmployeeFilter(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                minWidth: 200,
              }}
            >
              <option value="all">
                All Employees
              </option>

              {employeeList.map(
                (employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* REFRESH */}

          <button
            type="button"
            onClick={loadMonthlyTimesheets}
            disabled={loading}
            style={{
              height: 40,
              padding: "0 13px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.panel,
              color: C.inkSoft,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} />

            Refresh
          </button>
        </div>
      </Panel>

      {/* =====================================
          ERROR
      ====================================== */}

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: "11px 13px",
            borderRadius: 8,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* =====================================
          SUMMARY CARDS
      ====================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
        className="monthly-admin-summary"
      >
        <SummaryCard
          icon={Users}
          label="Employees"
          value={summary.employees}
        />

        <SummaryCard
          icon={CalendarDays}
          label="Days Submitted"
          value={summary.days}
        />

        <SummaryCard
          icon={Clock3}
          label="Total Working Time"
          value={formatMinutes(
            summary.minutes
          )}
        />

        <SummaryCard
          icon={BriefcaseBusiness}
          label="Leads Worked"
          value={summary.leads}
        />
      </div>

      {/* =====================================
          SELECTED EMPLOYEE INFO
      ====================================== */}

      {selectedEmployee && (
        <div
          style={{
            marginBottom: 14,
            fontSize: 14,
            fontWeight: 700,
            color: C.ink,
          }}
        >
          Monthly Timesheet —{" "}
          {selectedEmployee.name}
        </div>
      )}

      {/* =====================================
          LOADING
      ====================================== */}

      {loading ? (
        <Panel>
          <div
            style={{
              padding: 35,
              textAlign: "center",
              color: C.inkSoft,
            }}
          >
            Loading monthly timesheets...
          </div>
        </Panel>
      ) : filteredRecords.length === 0 ? (
        <Panel>
          <div
            style={{
              padding: 45,
              textAlign: "center",
              color: C.inkSoft,
            }}
          >
            <CalendarDays
              size={40}
              style={{
                opacity: 0.45,
                marginBottom: 10,
              }}
            />

            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.ink,
              }}
            >
              No monthly timesheet records
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
              }}
            >
              {selectedEmployee
                ? `${selectedEmployee.name} has no submitted timesheet for ${month}.`
                : `No employee has submitted a timesheet for ${month}.`}
            </div>
          </div>
        </Panel>
      ) : (
        <Panel
          style={{
            padding: 0,
            overflow: "hidden",
          }}
        >

          {/* =================================
              TABLE HEADER
          ================================== */}

          <div
            style={{
              padding: "16px 18px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: C.ink,
              }}
            >
              Monthly Records
            </div>

            <div
              style={{
                fontSize: 12,
                color: C.inkSoft,
              }}
            >
              {filteredRecords.length} day
              {filteredRecords.length !== 1
                ? "s"
                : ""}{" "}
              submitted
            </div>
          </div>

          {/* =================================
              ACTUAL CRM TABLE
          ================================== */}

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 950,
                borderCollapse:
                  "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {!selectedEmployee && (
                    <th
                      style={
                        tableHeadStyle
                      }
                    >
                      Employee
                    </th>
                  )}

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
                    Working Time
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Leads Worked
                  </th>

                  <th
                    style={{
                      ...tableHeadStyle,
                      minWidth: 280,
                    }}
                  >
                    Leads
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
                    Submitted At
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map(
                  (record) => {
                    const employee =
                      record.team_members ||
                      {};

                    const leads =
                      (
                        record.monthly_timesheet_leads ||
                        []
                      )
                        .map(
                          (item) =>
                            item.leads
                        )
                        .filter(Boolean);

                    return (
                      <tr
                        key={
                          record.id
                        }
                        style={{
                          borderTop: `1px solid ${C.borderSoft}`,
                        }}
                      >

                        {/* EMPLOYEE */}

                        {!selectedEmployee && (
                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                color: C.ink,
                              }}
                            >
                              {employee.name ||
                                "Unknown"}
                            </div>

                            {employee.email && (
                              <div
                                style={{
                                  marginTop: 3,
                                  fontSize: 11,
                                  color: C.inkSoft,
                                }}
                              >
                                {
                                  employee.email
                                }
                              </div>
                            )}
                          </td>
                        )}

                        {/* DATE */}

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 6,
                              fontWeight: 700,
                              color: C.ink,
                            }}
                          >
                            <CalendarDays
                              size={14}
                              color={
                                C.primary
                              }
                            />

                            {formatDate(
                              record.work_date
                            )}
                          </div>
                        </td>

                        {/* WORKING TIME */}

                        <td
                          style={{
                            ...tableCellStyle,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 6,
                              fontWeight: 700,
                              color: C.ink,
                            }}
                          >
                            <Clock3
                              size={14}
                              color={
                                C.primary
                              }
                            />

                            {formatMinutes(
                              record.working_minutes
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 11,
                              color: C.inkSoft,
                            }}
                          >
                            {Number(
                              record.working_minutes ||
                                0
                            )}{" "}
                            minutes
                          </div>
                        </td>

                        {/* LEAD COUNT */}

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
                              justifyContent:
                                "center",
                              minWidth: 30,
                              height: 28,
                              padding:
                                "0 9px",
                              borderRadius: 7,
                              background:
                                "#EEF2FF",
                              color:
                                "#3730A3",
                              fontWeight: 800,
                            }}
                          >
                            {
                              leads.length
                            }
                          </span>
                        </td>

                        {/* LEADS */}

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {leads.length ===
                          0 ? (
                            <span
                              style={{
                                color:
                                  C.inkSoft,
                                fontSize: 12,
                              }}
                            >
                              No leads selected
                            </span>
                          ) : (
                            <div
                              style={{
                                display:
                                  "flex",
                                flexDirection:
                                  "column",
                                gap: 7,
                              }}
                            >
                              {leads.map(
                                (
                                  lead
                                ) => (
                                  <div
                                    key={
                                      lead.id
                                    }
                                    style={{
                                      padding:
                                        "7px 9px",
                                      borderRadius:
                                        7,
                                      background:
                                        "#F8FAFC",
                                      border: `1px solid ${C.borderSoft}`,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display:
                                          "flex",
                                        alignItems:
                                          "center",
                                        gap: 6,
                                        fontWeight: 700,
                                        color:
                                          C.ink,
                                      }}
                                    >
                                      <BriefcaseBusiness
                                        size={
                                          13
                                        }
                                      />

                                      {lead.name ||
                                        "Unnamed Lead"}
                                    </div>

                                    <div
                                      style={{
                                        marginTop:
                                          3,
                                        fontSize:
                                          11,
                                        color:
                                          C.inkSoft,
                                      }}
                                    >
                                      {lead.phone ||
                                        "No phone"}

                                      {lead.status && (
                                        <>
                                          {" "}
                                          •{" "}
                                          {
                                            lead.status
                                          }
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </td>

                        {/* STATUS */}

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
                                "5px 9px",
                              borderRadius:
                                999,
                              background:
                                record.status ===
                                "Submitted"
                                  ? "#ECFDF3"
                                  : "#FFF7ED",
                              color:
                                record.status ===
                                "Submitted"
                                  ? "#047857"
                                  : "#C2410C",
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {record.status ===
                              "Submitted" && (
                              <CheckCircle2
                                size={13}
                              />
                            )}

                            {record.status ||
                              "Unknown"}
                          </span>
                        </td>

                        {/* SUBMITTED AT */}

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                C.inkSoft,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {formatSubmittedAt(
                              record.submitted_at
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* =====================================
          RESPONSIVE
      ====================================== */}

      <style>{`
        @media (max-width: 900px) {
          .monthly-admin-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 600px) {
          .monthly-admin-summary {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================
   SUMMARY CARD
========================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: C.panel,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 11,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#EEF2FF",
          color: "#3730A3",
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            color: C.inkSoft,
            marginBottom: 2,
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: C.ink,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* =========================================
   STYLES
========================================= */

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 700,
  color: C.inkSoft,
};

const tableHeadStyle = {
  padding: "11px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 800,
  color: C.inkFaint,
  background: "#F8FAFC",
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  padding: "12px",
  verticalAlign: "top",
  color: C.ink,
  borderBottom: `1px solid ${C.borderSoft}`,
};

