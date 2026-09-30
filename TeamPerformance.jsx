import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Users,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Trophy,
  CalendarDays,
  Target,
  Wallet,
  Percent,
} from "lucide-react";

import { C, Panel, PageHeader } from "./ui";
import { supabase } from "./supabase";

/* -----------------------------------------------------------------------
   DATE HELPERS
------------------------------------------------------------------------ */

function startOfDay(dateString) {
  if (!dateString) return null;

  return new Date(`${dateString}T00:00:00`);
}

function endOfDay(dateString) {
  if (!dateString) return null;

  return new Date(`${dateString}T23:59:59.999`);
}

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function isFutureDate(dateString) {
  if (!dateString) return false;

  return dateString > getTodayString();
}

function isFutureMonth(monthString) {
  if (!monthString) return false;

  return monthString > getCurrentMonthString();
}

/* -----------------------------------------------------------------------
   MONTH HELPERS
------------------------------------------------------------------------ */

function getMonthDateRange(selectedMonth) {
  if (!selectedMonth) {
    return {
      fromDate: null,
      toDate: null,
    };
  }

  const [year, month] = selectedMonth
    .split("-")
    .map(Number);

  if (!year || !month) {
    return {
      fromDate: null,
      toDate: null,
    };
  }

  const fromDate = new Date(
    year,
    month - 1,
    1,
    0,
    0,
    0,
    0
  );

  const toDate = new Date(
    year,
    month,
    0,
    23,
    59,
    59,
    999
  );

  return {
    fromDate,
    toDate,
  };
}

/* -----------------------------------------------------------------------
   SALES EXECUTIVE CHECK

   team_members.employment_role_id = 4
   => Digital Sales Executive
------------------------------------------------------------------------ */

function isSalesExecutive(employee) {
  if (!employee) {
    return false;
  }

  const employmentRoleId =
    employee.employment_role_id ??
    employee.employmentRoleId ??
    employee.employment_roleId;

  return Number(employmentRoleId) === 4;
}

/* -----------------------------------------------------------------------
   CLOSED LEAD CHECK
------------------------------------------------------------------------ */

function isClosedLeadForEmployee(lead, employeeId) {
  if (!lead) {
    return false;
  }

  const closedBy =
    lead.closedBy ??
    lead.closed_by;

  const status = String(
    lead.status ?? ""
  )
    .trim()
    .toLowerCase();

  return (
    String(closedBy ?? "") ===
      String(employeeId ?? "") &&
    status === "closed"
  );
}

/* -----------------------------------------------------------------------
   GET CLOSED DATE
------------------------------------------------------------------------ */

function getClosedDate(lead) {
  const value =
    lead.closedAt ??
    lead.closed_at;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/* -----------------------------------------------------------------------
   MONTHLY SALES INCENTIVE
------------------------------------------------------------------------ */

function getMonthlyIncentive(
  leads,
  employeeId,
  selectedMonth
) {
  if (!selectedMonth) {
    return {
      closed: 0,
      incentive: 0,
    };
  }

  const closedLeads = leads.filter(
    (lead) => {
      if (
        !isClosedLeadForEmployee(
          lead,
          employeeId
        )
      ) {
        return false;
      }

      const closedDate =
        getClosedDate(lead);

      if (!closedDate) {
        return false;
      }

      const year =
        closedDate.getFullYear();

      const month = String(
        closedDate.getMonth() + 1
      ).padStart(2, "0");

      return (
        `${year}-${month}` ===
        selectedMonth
      );
    }
  );

  const closed =
    closedLeads.length;

  let incentive = 0;

  if (closed >= 5) {
    incentive = 5000;
  } else if (closed >= 3) {
    incentive = 3000;
  }

  return {
    closed,
    incentive,
  };
}

/* -----------------------------------------------------------------------
   MONTHLY CLOSED
------------------------------------------------------------------------ */

function getMonthlyClosed(
  leads,
  employeeId,
  selectedMonth
) {
  if (!selectedMonth) {
    return 0;
  }

  return leads.filter(
    (lead) => {
      if (
        !isClosedLeadForEmployee(
          lead,
          employeeId
        )
      ) {
        return false;
      }

      const closedDate =
        getClosedDate(lead);

      if (!closedDate) {
        return false;
      }

      const year =
        closedDate.getFullYear();

      const month = String(
        closedDate.getMonth() + 1
      ).padStart(2, "0");

      return (
        `${year}-${month}` ===
        selectedMonth
      );
    }
  ).length;
}

/* -----------------------------------------------------------------------
   COMMISSION REVENUE HELPERS

   Commission salary is calculated from:

   leads.closed_by
   +
   leads.package_amount

   Only valid closed leads are counted.

   Required valid fields:
   - status = Closed
   - closed_by
   - closed_at
   - close_budget
   - close_service
   - package_amount
------------------------------------------------------------------------ */

function hasValidCommissionRevenueData(lead) {
  if (!lead) {
    return false;
  }

  const status = String(
    lead.status ?? ""
  )
    .trim()
    .toLowerCase();

  const closedBy = String(
    lead.closedBy ??
      lead.closed_by ??
      ""
  ).trim();

  const closeBudget = String(
    lead.closeBudget ??
      lead.close_budget ??
      ""
  ).trim();

  const closeService = String(
    lead.closeService ??
      lead.close_service ??
      ""
  ).trim();

  const packageAmountRaw =
    lead.packageAmount ??
    lead.package_amount;

  const packageAmount =
    Number(packageAmountRaw);

  const closedDate =
    getClosedDate(lead);

  return (
    status === "closed" &&
    closedBy !== "" &&
    closeBudget !== "" &&
    closeService !== "" &&
    closedDate !== null &&
    Number.isFinite(packageAmount) &&
    packageAmount > 0
  );
}

/* -----------------------------------------------------------------------
   MONTHLY REVENUE FOR COMMISSION EMPLOYEE
------------------------------------------------------------------------ */

function getMonthlyRevenueForEmployee(
  leads,
  employeeId,
  selectedMonth
) {
  if (!selectedMonth) {
    return 0;
  }

  return leads.reduce(
    (total, lead) => {
      if (
        !hasValidCommissionRevenueData(
          lead
        )
      ) {
        return total;
      }

      const closedBy = String(
        lead.closedBy ??
          lead.closed_by ??
          ""
      ).trim();

      if (
        closedBy !==
        String(employeeId ?? "")
      ) {
        return total;
      }

      const closedDate =
        getClosedDate(lead);

      if (!closedDate) {
        return total;
      }

      const year =
        closedDate.getFullYear();

      const month = String(
        closedDate.getMonth() + 1
      ).padStart(2, "0");

      const leadMonth =
        `${year}-${month}`;

      if (
        leadMonth !==
        selectedMonth
      ) {
        return total;
      }

      const packageAmount =
        Number(
          lead.packageAmount ??
            lead.package_amount
        );

      return total + packageAmount;
    },
    0
  );
}

/* -----------------------------------------------------------------------
   CUSTOM MONTH PICKER
------------------------------------------------------------------------ */

function CustomMonthPicker({
  value,
  onChange,
  disabled = false,
}) {
  const [open, setOpen] =
    useState(false);

  const currentYear =
    new Date().getFullYear();

  const currentMonth =
    new Date().getMonth() + 1;

  const initialYear = value
    ? Number(value.split("-")[0])
    : currentYear;

  const [viewYear, setViewYear] =
    useState(initialYear);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const displayValue = value
    ? (() => {
        const [year, month] =
          value.split("-");

        return `${month}-${year}`;
      })()
    : "";

  const handleMonthSelect =
    (monthIndex) => {
      const month = String(
        monthIndex + 1
      ).padStart(2, "0");

      const selectedValue =
        `${viewYear}-${month}`;

      if (
        isFutureMonth(
          selectedValue
        )
      ) {
        return;
      }

      onChange(selectedValue);
      setOpen(false);
    };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        style={{
          width: "100%",
          height: 40,
          padding: "0 10px 0 34px",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: disabled
            ? C.borderSoft
            : "#fff",
          color: value
            ? C.ink
            : C.inkFaint,
          fontSize: 12,
          textAlign: "left",
          outline: "none",
          cursor: disabled
            ? "not-allowed"
            : "pointer",
          opacity: disabled ? 0.6 : 1,
          position: "relative",
        }}
      >
        {displayValue || "MM-YYYY"}
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 0,
            width: 250,
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 12,
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.12)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setViewYear(
                  (year) => year - 1
                )
              }
              style={{
                border: "none",
                background:
                  "transparent",
                fontSize: 20,
                cursor: "pointer",
                color: C.ink,
                padding: "2px 8px",
              }}
            >
              ‹
            </button>

            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.ink,
              }}
            >
              {viewYear}
            </div>

            <button
              type="button"
              disabled={
                viewYear >= currentYear
              }
              onClick={() => {
                if (
                  viewYear <
                  currentYear
                ) {
                  setViewYear(
                    (year) =>
                      year + 1
                  );
                }
              }}
              style={{
                border: "none",
                background:
                  "transparent",
                fontSize: 20,
                cursor:
                  viewYear >=
                  currentYear
                    ? "not-allowed"
                    : "pointer",
                color:
                  viewYear >=
                  currentYear
                    ? C.inkFaint
                    : C.ink,
                padding: "2px 8px",
                opacity:
                  viewYear >=
                  currentYear
                    ? 0.5
                    : 1,
              }}
            >
              ›
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 6,
            }}
          >
            {months.map(
              (
                monthName,
                index
              ) => {
                const monthValue =
                  `${viewYear}-${String(
                    index + 1
                  ).padStart(2, "0")}`;

                const selected =
                  value ===
                  monthValue;

                const future =
                  viewYear >
                    currentYear ||
                  (viewYear ===
                    currentYear &&
                    index + 1 >
                      currentMonth);

                return (
                  <button
                    key={monthName}
                    type="button"
                    disabled={future}
                    onClick={() =>
                      handleMonthSelect(
                        index
                      )
                    }
                    style={{
                      height: 34,
                      border: "none",
                      borderRadius: 6,
                      background: future
                        ? C.borderSoft
                        : selected
                        ? C.primary
                        : C.bg,
                      color: future
                        ? C.inkFaint
                        : selected
                        ? "#fff"
                        : C.ink,
                      fontSize: 12,
                      fontWeight:
                        selected
                          ? 700
                          : 500,
                      cursor: future
                        ? "not-allowed"
                        : "pointer",
                      opacity: future
                        ? 0.5
                        : 1,
                    }}
                  >
                    {monthName}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------
   HISTORICAL ASSIGNMENT HELPERS
------------------------------------------------------------------------ */

function assignmentOverlapsRange(
  assignment,
  fromDate,
  toDate
) {
  const assignedAt =
    new Date(
      assignment.assigned_at
    );

  if (
    Number.isNaN(
      assignedAt.getTime()
    )
  ) {
    return false;
  }

  const unassignedAt =
    assignment.unassigned_at
      ? new Date(
          assignment.unassigned_at
        )
      : null;

  if (
    toDate &&
    assignedAt > toDate
  ) {
    return false;
  }

  if (
    fromDate &&
    unassignedAt &&
    unassignedAt < fromDate
  ) {
    return false;
  }

  return true;
}

/* -----------------------------------------------------------------------
   EMPLOYEE PERFORMANCE STATISTICS
------------------------------------------------------------------------ */

const getStats = (
  employeeId,
  leads,
  assignmentHistory,
  fromDate,
  toDate
) => {
  const employeeAssignments =
    assignmentHistory.filter(
      (assignment) =>
        String(
          assignment.employee_id
        ) ===
        String(employeeId)
    );

  const assignedLeadIds =
    new Set();

  employeeAssignments.forEach(
    (assignment) => {
      if (
        assignmentOverlapsRange(
          assignment,
          fromDate,
          toDate
        )
      ) {
        assignedLeadIds.add(
          assignment.lead_id
        );
      }
    }
  );

  const assignedLeads =
    leads.filter((lead) =>
      assignedLeadIds.has(
        lead.id
      )
    );

  const assigned =
    assignedLeads.length;

  const closedLeads =
    leads.filter((lead) => {
      if (
        !isClosedLeadForEmployee(
          lead,
          employeeId
        )
      ) {
        return false;
      }

      const closedAt =
        getClosedDate(lead);

      if (!closedAt) {
        return false;
      }

      if (
        fromDate &&
        closedAt < fromDate
      ) {
        return false;
      }

      if (
        toDate &&
        closedAt > toDate
      ) {
        return false;
      }

      return true;
    });

  const closed =
    closedLeads.length;

  const conversionRate =
    assigned > 0
      ? Math.round(
          (closed / assigned) * 100
        )
      : 0;

  return {
    assigned,
    closed,
    conversionRate,
  };
};

/* -----------------------------------------------------------------------
   SERVICE ASSIGNMENT HELPERS
------------------------------------------------------------------------ */

function getServiceEmployeeId(
  assignment
) {
  return (
    assignment?.employee_id ??
    assignment?.assigned_to ??
    assignment?.assigned_employee_id ??
    assignment?.employeeId ??
    assignment?.assignedEmployeeId ??
    assignment?.assigned_employee ??
    assignment?.assignedEmployee ??
    null
  );
}

/* -----------------------------------------------------------------------
   SERVICE ASSIGNED DATE
------------------------------------------------------------------------ */

function getServiceAssignedDate(
  assignment
) {
  const value =
    assignment?.assigned_at ??
    assignment?.assignedAt ??
    assignment?.assigned_date ??
    assignment?.assignedDate ??
    assignment?.created_at ??
    assignment?.createdAt ??
    assignment?.start_date ??
    assignment?.startDate;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/* -----------------------------------------------------------------------
   SERVICE COMPLETED DATE
------------------------------------------------------------------------ */

function getServiceCompletedDate(
  assignment
) {
  const value =
    assignment?.completed_at ??
    assignment?.completedAt ??
    assignment?.completion_date ??
    assignment?.completionDate ??
    assignment?.completed_date ??
    assignment?.completedDate ??
    assignment?.completed_on ??
    assignment?.completedOn ??
    assignment?.completion_at ??
    assignment?.completionAt ??
    assignment?.updated_at ??
    assignment?.updatedAt;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/* -----------------------------------------------------------------------
   SERVICE STATUS CHECK
------------------------------------------------------------------------ */

function isServiceCompleted(
  assignment
) {
  const status = String(
    assignment?.status ??
      assignment?.service_status ??
      assignment?.serviceStatus ??
      ""
  )
    .trim()
    .toLowerCase();

  return (
    status === "completed" ||
    status === "complete" ||
    status === "done"
  );
}

/* -----------------------------------------------------------------------
   SERVICE ASSIGNMENT RANGE
------------------------------------------------------------------------ */

function serviceAssignmentIsInRange(
  assignment,
  fromDate,
  toDate
) {
  const assignedDate =
    getServiceAssignedDate(
      assignment
    );

  if (!assignedDate) {
    return !fromDate && !toDate;
  }

  if (
    toDate &&
    assignedDate > toDate
  ) {
    return false;
  }

  const completedDate =
    getServiceCompletedDate(
      assignment
    );

  if (
    fromDate &&
    completedDate &&
    completedDate < fromDate
  ) {
    return false;
  }

  if (
    fromDate &&
    !completedDate &&
    assignedDate < fromDate
  ) {
    return false;
  }

  return true;
}

/* -----------------------------------------------------------------------
   SERVICE COMPLETED RANGE
------------------------------------------------------------------------ */

function serviceCompletedIsInRange(
  assignment,
  fromDate,
  toDate
) {
  if (
    !isServiceCompleted(
      assignment
    )
  ) {
    return false;
  }

  if (!fromDate && !toDate) {
    return true;
  }

  const completedDate =
    getServiceCompletedDate(
      assignment
    );

  if (!completedDate) {
    return false;
  }

  if (
    fromDate &&
    completedDate < fromDate
  ) {
    return false;
  }

  if (
    toDate &&
    completedDate > toDate
  ) {
    return false;
  }

  return true;
}

/* -----------------------------------------------------------------------
   SERVICE PERFORMANCE STATISTICS
------------------------------------------------------------------------ */

function getServiceStats(
  employeeId,
  serviceAssignments,
  fromDate,
  toDate
) {
  const employeeAssignments =
    serviceAssignments.filter(
      (assignment) =>
        String(
          getServiceEmployeeId(
            assignment
          ) ?? ""
        ) ===
        String(employeeId ?? "")
    );

  const assigned =
    employeeAssignments.filter(
      (assignment) =>
        serviceAssignmentIsInRange(
          assignment,
          fromDate,
          toDate
        )
    ).length;

  const completed =
    employeeAssignments.filter(
      (assignment) =>
        serviceCompletedIsInRange(
          assignment,
          fromDate,
          toDate
        )
    ).length;

  const conversionRate =
    assigned > 0
      ? Math.round(
          (completed / assigned) * 100
        )
      : 0;

  return {
    assigned,
    completed,
    conversionRate,
  };
}

/* -----------------------------------------------------------------------
   SERVICE MONTHLY COMPLETED
------------------------------------------------------------------------ */

function getServiceMonthlyCompleted(
  serviceAssignments,
  employeeId,
  selectedMonth
) {
  if (!selectedMonth) {
    return 0;
  }

  return serviceAssignments.filter(
    (assignment) => {
      if (
        String(
          getServiceEmployeeId(
            assignment
          ) ?? ""
        ) !==
        String(employeeId ?? "")
      ) {
        return false;
      }

      if (
        !isServiceCompleted(
          assignment
        )
      ) {
        return false;
      }

      const completedDate =
        getServiceCompletedDate(
          assignment
        );

      if (!completedDate) {
        return false;
      }

      const year =
        completedDate.getFullYear();

      const month = String(
        completedDate.getMonth() + 1
      ).padStart(2, "0");

      return (
        `${year}-${month}` ===
        selectedMonth
      );
    }
  ).length;
}

/* -----------------------------------------------------------------------
   SERVICE INCENTIVE

   10+ COMPLETED LEADS = ₹2000
------------------------------------------------------------------------ */

function getServiceIncentive(
  serviceAssignments,
  employeeId,
  selectedMonth
) {
  const completed =
    getServiceMonthlyCompleted(
      serviceAssignments,
      employeeId,
      selectedMonth
    );

  let incentive = 0;

  if (completed >= 10) {
    incentive = 2000;
  }

  return {
    completed,
    incentive,
  };
}

/* -----------------------------------------------------------------------
   STAT CARD
------------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          flexShrink: 0,
        }}
      >
        <Icon
          size={15}
          color={C.primary}
        />
      </div>

      <div
        style={{
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: C.inkFaint,
            marginBottom: 2,
            whiteSpace:
              "nowrap",
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.ink,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   TOP PERFORMER CARD
------------------------------------------------------------------------ */

function TopPerformerCard({
  performer,
  mode,
  fromDate,
  toDate,
  incentiveMonth,
  filterError,
  employeeTypeLabel,
  isServicePerformance,
}) {
  if (filterError) {
    return (
      <Panel
        style={{
          marginBottom: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 22,
            textAlign: "center",
            color: "#B91C1C",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {filterError}
        </div>
      </Panel>
    );
  }

  if (
    !incentiveMonth &&
    !fromDate &&
    !toDate
  ) {
    return (
      <Panel
        style={{
          marginBottom: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background:
                  C.primaryDeep,
                color: "#fff",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexShrink: 0,
              }}
            >
              <Trophy size={22} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: C.inkFaint,
                  fontWeight: 600,
                  marginBottom: 4,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.7px",
                }}
              >
                Top Performer
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.inkFaint,
                }}
              >
                Please select
                incentive month
                or date range
                to see top
                performer.
              </div>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  if (!performer) {
    return (
      <Panel
        style={{
          marginBottom: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 25,
            textAlign: "center",
            color: C.inkFaint,
            fontSize: 12,
          }}
        >
          No {employeeTypeLabel}
          performance data
          available for the
          selected period.
        </div>
      </Panel>
    );
  }

  const stats =
    performer.stats;

  const completedCount =
    isServicePerformance
      ? stats.completed
      : stats.closed;

  const metricValue =
    isServicePerformance
      ? `${completedCount} Leads Completed`
      : mode === "closed"
      ? `${stats.closed} Leads Closed`
      : `${stats.conversionRate}% Conversion`;

  let periodText =
    "Selected Period";

  if (incentiveMonth) {
    periodText = new Date(
      `${incentiveMonth}-01T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );
  } else if (
    fromDate ||
    toDate
  ) {
    periodText =
      `${fromDate || "Start"} → ${
        toDate || "Today"
      }`;
  }

  return (
    <Panel
      style={{
        marginBottom: 18,
        overflow: "hidden",
      }}
    >
      <div
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
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background:
                  C.primaryDeep,
                color: "#fff",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexShrink: 0,
              }}
            >
              <Trophy size={22} />
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.inkFaint,
                  fontWeight: 600,
                  marginBottom: 4,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.7px",
                }}
              >
                Top Performer
              </div>

              <div
                style={{
                  fontSize: 19,
                  fontWeight: 750,
                  color: C.ink,
                  whiteSpace:
                    "nowrap",
                  overflow:
                    "hidden",
                  textOverflow:
                    "ellipsis",
                }}
              >
                {performer.name ||
                  "Employee"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: C.inkFaint,
                  marginTop: 3,
                }}
              >
                {isServicePerformance
                  ? "Most Leads Completed"
                  : mode ===
                    "closed"
                  ? "Most Leads Closed"
                  : "Highest Conversion Rate"}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: C.inkFaint,
                  marginTop: 3,
                }}
              >
                {employeeTypeLabel}
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 750,
                color: C.primary,
              }}
            >
              {metricValue}
            </div>

            {incentiveMonth ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    performer
                      .incentive
                      ?.incentive >
                    0
                      ? C.primary
                      : C.inkFaint,
                }}
              >
                Incentive:{" "}
                {performer
                  .incentive
                  ?.incentive >
                0
                  ? `₹${performer.incentive.incentive.toLocaleString(
                      "en-IN"
                    )}`
                  : "Not Qualified"}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: C.inkFaint,
                }}
              >
                Incentive:
                Select an
                incentive month
              </div>
            )}

            <div
              style={{
                fontSize: 11,
                color: C.inkFaint,
                marginTop: 3,
              }}
            >
              Period:{" "}
              {periodText}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* -----------------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------------------ */

export default function TeamPerformance({
  employees = [],
  leads = [],
}) {
  const [
    assignmentHistory,
    setAssignmentHistory,
  ] = useState([]);

  const [
    serviceAssignments,
    setServiceAssignments,
  ] = useState([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    serviceLoading,
    setServiceLoading,
  ] = useState(true);

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const [
    serviceError,
    setServiceError,
  ] = useState("");

  const [
    performanceMode,
    setPerformanceMode,
  ] = useState("closed");

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [
    incentiveMonth,
    setIncentiveMonth,
  ] = useState("");

  const [
    performanceTab,
    setPerformanceTab,
  ] = useState("team");

  const isServicePerformance =
    performanceTab === "service";

  /* -----------------------------------------------------------------------
     LOAD SALES ASSIGNMENT HISTORY
  ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    const loadAssignmentHistory =
      async () => {
        setHistoryLoading(true);
        setHistoryError("");

        const {
          data,
          error,
        } = await supabase
          .from(
            "lead_assignment_history"
          )
          .select(
            "id, lead_id, employee_id, assigned_at, unassigned_at"
          )
          .order(
            "assigned_at",
            {
              ascending: true,
            }
          );

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Assignment history error:",
            error
          );

          setHistoryError(
            "Unable to load assignment history."
          );

          setAssignmentHistory(
            []
          );
        } else {
          setAssignmentHistory(
            data || []
          );
        }

        setHistoryLoading(false);
      };

    loadAssignmentHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -----------------------------------------------------------------------
     LOAD SERVICE ASSIGNMENTS
  ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    const loadServiceAssignments =
      async () => {
        setServiceLoading(true);
        setServiceError("");

        const {
          data,
          error,
        } = await supabase
          .from(
            "client_service_assignments"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Client service assignments error:",
            error
          );

          setServiceError(
            "Unable to load service assignment data."
          );

          setServiceAssignments(
            []
          );
        } else {
          console.log(
            "Service assignments loaded:",
            data || []
          );

          if (data && data.length > 0) {
            console.log(
              "Completed service assignments:",
              data.filter(
                (item) =>
                  isServiceCompleted(
                    item
                  )
              )
            );
          }

          setServiceAssignments(
            data || []
          );
        }

        setServiceLoading(false);
      };

    loadServiceAssignments();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -----------------------------------------------------------------------
     DATE OBJECTS
  ------------------------------------------------------------------------ */

  const fromDateObject =
    useMemo(
      () => startOfDay(fromDate),
      [fromDate]
    );

  const toDateObject =
    useMemo(
      () => endOfDay(toDate),
      [toDate]
    );

  /* -----------------------------------------------------------------------
     MONTH DATE RANGE
  ------------------------------------------------------------------------ */

  const incentiveMonthRange =
    useMemo(
      () =>
        getMonthDateRange(
          incentiveMonth
        ),
      [incentiveMonth]
    );

  /* -----------------------------------------------------------------------
     FILTER STATE
  ------------------------------------------------------------------------ */

  const isDateFilterActive =
    !!fromDate || !!toDate;

  const isMonthFilterActive =
    !!incentiveMonth;

  const futureFromDate =
    isFutureDate(fromDate);

  const futureToDate =
    isFutureDate(toDate);

  const futureIncentiveMonth =
    isFutureMonth(
      incentiveMonth
    );

  const invalidDateRange =
    !!fromDate &&
    !!toDate &&
    fromDate > toDate;

  let filterError = "";

  if (futureIncentiveMonth) {
    filterError =
      "Future incentive month cannot be selected. Please select the current month or a previous month.";
  } else if (futureFromDate) {
    filterError =
      "Future From Date cannot be selected. Please select today or an earlier date.";
  } else if (futureToDate) {
    filterError =
      "Future To Date cannot be selected. Please select today or an earlier date.";
  } else if (invalidDateRange) {
    filterError =
      "From Date cannot be later than To Date.";
  }

  /* -----------------------------------------------------------------------
     ACTIVE PERFORMANCE PERIOD
  ------------------------------------------------------------------------ */

  const activeFromDate =
    isMonthFilterActive
      ? incentiveMonthRange.fromDate
      : fromDateObject;

  const activeToDate =
    isMonthFilterActive
      ? incentiveMonthRange.toDate
      : toDateObject;

  /* -----------------------------------------------------------------------
     SALES PERFORMANCE
  ------------------------------------------------------------------------ */

  const performance =
    useMemo(() => {
      if (
        filterError ||
        historyLoading
      ) {
        return [];
      }

      return employees.map(
        (employee) => {
          const stats =
            getStats(
              employee.id,
              leads,
              assignmentHistory,
              activeFromDate,
              activeToDate
            );

          const monthlyClosed =
            getMonthlyClosed(
              leads,
              employee.id,
              incentiveMonth
            );

          const incentive =
            getMonthlyIncentive(
              leads,
              employee.id,
              incentiveMonth
            );

          return {
            ...employee,
            stats,
            monthlyClosed,
            incentive,
          };
        }
      );
    }, [
      employees,
      leads,
      assignmentHistory,
      activeFromDate,
      activeToDate,
      incentiveMonth,
      filterError,
      historyLoading,
    ]);

  /* -----------------------------------------------------------------------
     SALES EXECUTIVE PERFORMANCE
  ------------------------------------------------------------------------ */

  const salesExecutivePerformance =
    useMemo(() => {
      return performance.filter(
        (employee) =>
          isSalesExecutive(
            employee
          )
      );
    }, [performance]);

  /* -----------------------------------------------------------------------
     SERVICE PERFORMANCE
  ------------------------------------------------------------------------ */

  const servicePerformance =
    useMemo(() => {
      if (
        filterError ||
        serviceLoading
      ) {
        return [];
      }

      return employees
        .filter(
          (employee) =>
            !isSalesExecutive(
              employee
            )
        )
        .map(
          (employee) => {
            const stats =
              getServiceStats(
                employee.id,
                serviceAssignments,
                activeFromDate,
                activeToDate
              );

            const monthlyCompleted =
              getServiceMonthlyCompleted(
                serviceAssignments,
                employee.id,
                incentiveMonth
              );

            const incentive =
              getServiceIncentive(
                serviceAssignments,
                employee.id,
                incentiveMonth
              );

            return {
              ...employee,
              stats,
              monthlyCompleted,
              incentive,
            };
          }
        );
    }, [
      employees,
      serviceAssignments,
      activeFromDate,
      activeToDate,
      incentiveMonth,
      filterError,
      serviceLoading,
    ]);

  /* -----------------------------------------------------------------------
     ACTIVE PERFORMANCE EMPLOYEES
  ------------------------------------------------------------------------ */

  const activePerformanceEmployees =
    isServicePerformance
      ? servicePerformance
      : salesExecutivePerformance;

  /* -----------------------------------------------------------------------
     ACTIVE EMPLOYEE TYPE
  ------------------------------------------------------------------------ */

  const employeeTypeLabel =
    isServicePerformance
      ? "Service Employee"
      : "Sales Executive";

  /* -----------------------------------------------------------------------
     FIND TOP PERFORMER
  ------------------------------------------------------------------------ */

  const topPerformer =
    useMemo(() => {
      if (
        !activePerformanceEmployees.length
      ) {
        return null;
      }

      if (
        !incentiveMonth &&
        !fromDate &&
        !toDate
      ) {
        return null;
      }

      const employeesWithData =
        activePerformanceEmployees.filter(
          (employee) =>
            employee.stats
              .assigned > 0 ||
            (isServicePerformance
              ? employee.stats
                  .completed > 0
              : employee.stats
                  .closed > 0)
        );

      if (
        !employeesWithData.length
      ) {
        return null;
      }

      const sorted = [
        ...employeesWithData,
      ].sort((a, b) => {
        if (isServicePerformance) {
          if (
            b.stats.completed !==
            a.stats.completed
          ) {
            return (
              b.stats.completed -
              a.stats.completed
            );
          }

          return (
            b.stats.conversionRate -
            a.stats.conversionRate
          );
        }

        if (
          performanceMode ===
          "closed"
        ) {
          if (
            b.stats.closed !==
            a.stats.closed
          ) {
            return (
              b.stats.closed -
              a.stats.closed
            );
          }

          return (
            b.stats.conversionRate -
            a.stats.conversionRate
          );
        }

        if (
          b.stats
            .conversionRate !==
          a.stats
            .conversionRate
        ) {
          return (
            b.stats
              .conversionRate -
            a.stats
              .conversionRate
          );
        }

        return (
          b.stats.closed -
          a.stats.closed
        );
      });

      return sorted[0] || null;
    }, [
      activePerformanceEmployees,
      performanceMode,
      incentiveMonth,
      fromDate,
      toDate,
      isServicePerformance,
    ]);

  /* -----------------------------------------------------------------------
     SALARY CALCULATION

     Fixed:
       monthly_salary

     Commission:
       Monthly Revenue × commission_percentage / 100

     Revenue source:
       leads.closed_by
       leads.package_amount

     Revenue period:
       selected Incentive Month
  ------------------------------------------------------------------------ */

  const salaryData =
    useMemo(() => {
      const fixedEmployees = [];
      const commissionEmployees = [];

      employees.forEach(
        (employee) => {
          /*
             Support both camelCase and snake_case
             in case AdminView mapping changes.
          */
          const monthlySalary =
            Number(
              employee.monthlySalary ??
                employee.monthly_salary ??
                0
            );

          const commissionPercentage =
            Number(
              employee.commissionPercentage ??
                employee.commission_percentage ??
                0
            );

          /*
             Fixed Salary Employee
          */
          if (
            monthlySalary > 0 &&
            commissionPercentage <= 0
          ) {
            fixedEmployees.push({
              ...employee,
              monthlySalary,
              salary: monthlySalary,
            });

            return;
          }

          /*
             Commission Based Employee
          */
          if (
            commissionPercentage > 0
          ) {
            const revenue =
              getMonthlyRevenueForEmployee(
                leads,
                employee.id,
                incentiveMonth
              );

            const salary =
              revenue *
              (commissionPercentage /
                100);

            commissionEmployees.push({
              ...employee,
              commissionPercentage,
              revenue,
              salary,
            });
          }
        }
      );

      const totalFixedSalary =
        fixedEmployees.reduce(
          (total, employee) =>
            total +
            employee.salary,
          0
        );

      const totalCommissionRevenue =
        commissionEmployees.reduce(
          (total, employee) =>
            total +
            employee.revenue,
          0
        );

      const totalCommissionSalary =
        commissionEmployees.reduce(
          (total, employee) =>
            total +
            employee.salary,
          0
        );

      const totalSalary =
        totalFixedSalary +
        totalCommissionSalary;

      return {
        fixedEmployees,
        commissionEmployees,
        totalFixedSalary,
        totalCommissionRevenue,
        totalCommissionSalary,
        totalSalary,
      };
    }, [
      employees,
      leads,
      incentiveMonth,
    ]);

  /* -----------------------------------------------------------------------
     FORMAT DATE
  ------------------------------------------------------------------------ */

  const formatSelectedDate = (
    value
  ) => {
    if (!value) {
      return "";
    }

    const date = new Date(
      `${value}T00:00:00`
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* -----------------------------------------------------------------------
     CLEAR FILTERS
  ------------------------------------------------------------------------ */

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setIncentiveMonth("");
    setPerformanceMode(
      "closed"
    );
  };

  /* -----------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------------ */

  return (
    <div>
      <PageHeader
        title="Team Performance"
        subtitle={
          isServicePerformance
            ? "Track Service Employee performance using completed leads and conversion rate."
            : "Track Sales Executive performance using closed leads and conversion rate."
        }
      />

      {/* =====================================================
          PERFORMANCE TABS
      ====================================================== */}

      <Panel
        style={{
          marginBottom: 18,
          padding: 8,
        }}
      >
        <div
          className="performance-tabs"
          style={{
            display: "flex",
            gap: 8,
            width: "100%",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setPerformanceTab(
                "team"
              )
            }
            style={{
              flex: 1,
              height: 40,
              border: `1px solid ${
                performanceTab ===
                "team"
                  ? C.primary
                  : C.border
              }`,
              borderRadius: 8,
              background:
                performanceTab ===
                "team"
                  ? C.primary
                  : "#fff",
              color:
                performanceTab ===
                "team"
                  ? "#fff"
                  : C.ink,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition:
                "all 0.2s ease",
            }}
          >
            Team Performance
          </button>

          <button
            type="button"
            onClick={() =>
              setPerformanceTab(
                "service"
              )
            }
            style={{
              flex: 1,
              height: 40,
              border: `1px solid ${
                performanceTab ===
                "service"
                  ? C.primary
                  : C.border
              }`,
              borderRadius: 8,
              background:
                performanceTab ===
                "service"
                  ? C.primary
                  : "#fff",
              color:
                performanceTab ===
                "service"
                  ? "#fff"
                  : C.ink,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition:
                "all 0.2s ease",
            }}
          >
            Service Performance
          </button>
        </div>
      </Panel>

      {/* =====================================================
          FILTER PANEL
      ====================================================== */}

      <Panel
        style={{
          marginBottom: 18,
          padding: 20,
        }}
      >
        <div
          className="team-performance-filters"
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 1.2fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          {/* PERFORMANCE FILTER */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: C.inkFaint,
                marginBottom: 7,
              }}
            >
              Top Performer By
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <Target
                size={15}
                style={{
                  position:
                    "absolute",
                  left: 11,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: C.primary,
                  pointerEvents:
                    "none",
                }}
              />

              <select
                value={
                  performanceMode
                }
                onChange={(e) =>
                  setPerformanceMode(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  height: 40,
                  padding:
                    "0 12px 0 34px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  background: "#fff",
                  color: C.ink,
                  fontSize: 12,
                  outline: "none",
                  cursor:
                    "pointer",
                }}
              >
                <option value="closed">
                  {isServicePerformance
                    ? "Most Leads Completed"
                    : "Most Leads Closed"}
                </option>

                <option value="conversion">
                  Highest Conversion
                  Rate
                </option>
              </select>
            </div>
          </div>

          {/* INCENTIVE MONTH */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: C.inkFaint,
                marginBottom: 7,
              }}
            >
              Incentive Month
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <CalendarDays
                size={15}
                style={{
                  position:
                    "absolute",
                  left: 11,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: C.primary,
                  pointerEvents:
                    "none",
                  zIndex: 2,
                }}
              />

              <CustomMonthPicker
                value={
                  incentiveMonth
                }
                disabled={
                  isDateFilterActive
                }
                onChange={(value) => {
                  if (
                    isFutureMonth(
                      value
                    )
                  ) {
                    return;
                  }

                  setIncentiveMonth(
                    value
                  );

                  setFromDate("");
                  setToDate("");
                }}
              />
            </div>
          </div>

          {/* FROM DATE */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: C.inkFaint,
                marginBottom: 7,
              }}
            >
              From Date
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <CalendarDays
                size={15}
                style={{
                  position:
                    "absolute",
                  left: 11,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: C.primary,
                  pointerEvents:
                    "none",
                }}
              />

              <input
                type="date"
                value={fromDate}
                max={
                  getTodayString()
                }
                disabled={
                  isMonthFilterActive
                }
                onChange={(e) => {
                  const value =
                    e.target.value;

                  if (
                    isFutureDate(
                      value
                    )
                  ) {
                    return;
                  }

                  setFromDate(value);

                  if (value) {
                    setIncentiveMonth(
                      ""
                    );
                  }
                }}
                style={{
                  width: "100%",
                  height: 40,
                  padding:
                    "0 10px 0 34px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  background:
                    isMonthFilterActive
                      ? C.borderSoft
                      : "#fff",
                  color: C.ink,
                  fontSize: 12,
                  outline: "none",
                  boxSizing:
                    "border-box",
                  cursor:
                    isMonthFilterActive
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isMonthFilterActive
                      ? 0.6
                      : 1,
                }}
              />
            </div>
          </div>

          {/* TO DATE */}

          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: C.inkFaint,
                marginBottom: 7,
              }}
            >
              To Date
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <CalendarDays
                size={15}
                style={{
                  position:
                    "absolute",
                  left: 11,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: C.primary,
                  pointerEvents:
                    "none",
                }}
              />

              <input
                type="date"
                value={toDate}
                max={
                  getTodayString()
                }
                disabled={
                  isMonthFilterActive
                }
                onChange={(e) => {
                  const value =
                    e.target.value;

                  if (
                    isFutureDate(
                      value
                    )
                  ) {
                    return;
                  }

                  setToDate(value);

                  if (value) {
                    setIncentiveMonth(
                      ""
                    );
                  }
                }}
                style={{
                  width: "100%",
                  height: 40,
                  padding:
                    "0 10px 0 34px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  background:
                    isMonthFilterActive
                      ? C.borderSoft
                      : "#fff",
                  color: C.ink,
                  fontSize: 12,
                  outline: "none",
                  boxSizing:
                    "border-box",
                  cursor:
                    isMonthFilterActive
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isMonthFilterActive
                      ? 0.6
                      : 1,
                }}
              />
            </div>
          </div>

          {/* CLEAR */}

          <button
            onClick={
              clearFilters
            }
            style={{
              height: 40,
              padding: "0 15px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              background: "#fff",
              color: C.inkSoft,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace:
                "nowrap",
            }}
          >
            Clear Filters
          </button>
        </div>

        {filterError && (
          <div
            style={{
              marginTop: 10,
              padding:
                "9px 12px",
              borderRadius: 7,
              background:
                "#FEF2F2",
              color: "#B91C1C",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {filterError}
          </div>
        )}

        {!filterError && (
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 7,
              marginTop: 12,
              fontSize: 11,
              color: C.inkFaint,
            }}
          >
            <CalendarDays
              size={13}
            />

            <span>
              Period:{" "}
              <strong
                style={{
                  color: C.ink,
                }}
              >
                {incentiveMonth
                  ? new Date(
                      `${incentiveMonth}-01T00:00:00`
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        month:
                          "long",
                        year:
                          "numeric",
                      }
                    )
                  : fromDate
                  ? `${formatSelectedDate(
                      fromDate
                    )}${
                      toDate
                        ? ` → ${formatSelectedDate(
                            toDate
                          )}`
                        : " → Today"
                    }`
                  : "All Time"}
              </strong>
            </span>
          </div>
        )}
      </Panel>

      {/* =====================================================
          SALES HISTORY LOADING
      ====================================================== */}

      {!isServicePerformance &&
        historyLoading && (
          <Panel
            style={{
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: 22,
                textAlign:
                  "center",
                color: C.inkFaint,
                fontSize: 12,
              }}
            >
              Loading performance
              history...
            </div>
          </Panel>
        )}

      {/* =====================================================
          SERVICE LOADING
      ====================================================== */}

      {isServicePerformance &&
        serviceLoading && (
          <Panel
            style={{
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: 22,
                textAlign:
                  "center",
                color: C.inkFaint,
                fontSize: 12,
              }}
            >
              Loading service
              performance...
            </div>
          </Panel>
        )}

      {/* =====================================================
          SALES HISTORY ERROR
      ====================================================== */}

      {!isServicePerformance &&
        historyError &&
        !historyLoading && (
          <Panel
            style={{
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: 18,
                color: "#B91C1C",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {historyError}
            </div>
          </Panel>
        )}

      {/* =====================================================
          SERVICE ERROR
      ====================================================== */}

      {isServicePerformance &&
        serviceError &&
        !serviceLoading && (
          <Panel
            style={{
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: 18,
                color: "#B91C1C",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {serviceError}
            </div>
          </Panel>
        )}

      {/* =====================================================
          TOP PERFORMER
      ====================================================== */}

      {(
        isServicePerformance
          ? !serviceLoading
          : !historyLoading
      ) && (
        <TopPerformerCard
          performer={
            topPerformer
          }
          mode={
            performanceMode
          }
          fromDate={
            fromDate
          }
          toDate={toDate}
          incentiveMonth={
            incentiveMonth
          }
          filterError={
            filterError
          }
          employeeTypeLabel={
            employeeTypeLabel
          }
          isServicePerformance={
            isServicePerformance
          }
        />
      )}

      {/* =====================================================
          SALARY SECTION
      ====================================================== */}

      <Panel
        style={{
          marginBottom: 18,
          overflow: "hidden",
        }}
      >
        {/* SALARY HEADER */}

        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${C.border}`,
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
              gap: 11,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: C.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wallet
                size={18}
                color={C.primary}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 750,
                  color: C.ink,
                }}
              >
                Employee Salary
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: C.inkFaint,
                  marginTop: 2,
                }}
              >
                {incentiveMonth
                  ? `Salary for ${new Date(
                      `${incentiveMonth}-01T00:00:00`
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        month:
                          "long",
                        year:
                          "numeric",
                      }
                    )}`
                  : "Select an incentive month to calculate salary"}
              </div>
            </div>
          </div>

          {/* TOTAL SALARY */}

          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.inkFaint,
                marginBottom: 3,
              }}
            >
              TOTAL SALARY
            </div>

            <div
              style={{
                fontSize: 21,
                fontWeight: 750,
                color: C.primary,
              }}
            >
              {incentiveMonth
                ? `₹${salaryData.totalSalary.toLocaleString(
                    "en-IN",
                    {
                      maximumFractionDigits: 2,
                    }
                  )}`
                : "—"}
            </div>
          </div>
        </div>

        {/* SALARY CONTENT */}

        <div
          style={{
            padding: 20,
          }}
        >
          {/* =================================================
              FIXED SALARY
          ================================================== */}

          <div
            style={{
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 11,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 750,
                  color: C.ink,
                }}
              >
                Fixed Salary
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.primary,
                }}
              >
                Total: ₹
                {salaryData.totalFixedSalary.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </div>
            </div>

            {salaryData.fixedEmployees
              .length === 0 ? (
              <div
                style={{
                  padding: 15,
                  borderRadius: 8,
                  background: C.bg,
                  color: C.inkFaint,
                  fontSize: 11,
                }}
              >
                No fixed salary employee
                configured.
              </div>
            ) : (
              <div
                className="salary-table"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 9,
                  overflowX: "auto",
                }}
              >
                <div
                  style={{
                    minWidth: 500,
                  }}
                >
                  {/* TABLE HEADER */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(180px, 1fr) 180px",
                      gap: 10,
                      padding:
                        "10px 13px",
                      background:
                        C.bg,
                      borderBottom: `1px solid ${C.border}`,
                      fontSize: 10,
                      fontWeight: 700,
                      color:
                        C.inkFaint,
                    }}
                  >
                    <div>
                      EMPLOYEE
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      MONTHLY SALARY
                    </div>
                  </div>

                  {salaryData.fixedEmployees.map(
                    (employee) => (
                      <div
                        key={
                          employee.id
                        }
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "minmax(180px, 1fr) 180px",
                          gap: 10,
                          padding:
                            "12px 13px",
                          borderBottom: `1px solid ${C.border}`,
                          alignItems:
                            "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight:
                              650,
                            color:
                              C.ink,
                          }}
                        >
                          {employee.name ||
                            "Employee"}
                        </div>

                        <div
                          style={{
                            textAlign:
                              "right",
                            fontSize:
                              13,
                            fontWeight:
                              750,
                            color:
                              C.ink,
                          }}
                        >
                          ₹
                          {employee.salary.toLocaleString(
                            "en-IN",
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              COMMISSION BASED
          ================================================== */}

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 11,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 750,
                  color: C.ink,
                }}
              >
                Commission Based
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 15,
                  flexWrap: "wrap",
                  fontSize: 11,
                  color: C.inkFaint,
                }}
              >
                <span>
                  Revenue:{" "}
                  <strong
                    style={{
                      color: C.ink,
                    }}
                  >
                    ₹
                    {salaryData.totalCommissionRevenue.toLocaleString(
                      "en-IN",
                      {
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </span>

                <span>
                  Commission Salary:{" "}
                  <strong
                    style={{
                      color: C.primary,
                    }}
                  >
                    ₹
                    {salaryData.totalCommissionSalary.toLocaleString(
                      "en-IN",
                      {
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </span>
              </div>
            </div>

            {!incentiveMonth ? (
              <div
                style={{
                  padding: 15,
                  borderRadius: 8,
                  background: C.bg,
                  color: C.inkFaint,
                  fontSize: 11,
                }}
              >
                Please select an Incentive Month
                to calculate commission-based
                salary.
              </div>
            ) : salaryData
                .commissionEmployees
                .length === 0 ? (
              <div
                style={{
                  padding: 15,
                  borderRadius: 8,
                  background: C.bg,
                  color: C.inkFaint,
                  fontSize: 11,
                }}
              >
                No commission-based employee
                configured.
              </div>
            ) : (
              <div
                className="salary-table"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 9,
                  overflowX: "auto",
                }}
              >
                <div
                  style={{
                    minWidth: 650,
                  }}
                >
                  {/* TABLE HEADER */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(150px, 1fr) 150px 100px 150px",
                      gap: 10,
                      padding:
                        "10px 13px",
                      background:
                        C.bg,
                      borderBottom: `1px solid ${C.border}`,
                      fontSize: 10,
                      fontWeight: 700,
                      color:
                        C.inkFaint,
                    }}
                  >
                    <div>
                      EMPLOYEE
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      REVENUE
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      COMMISSION
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      SALARY
                    </div>
                  </div>

                  {salaryData.commissionEmployees.map(
                    (employee) => (
                      <div
                        key={
                          employee.id
                        }
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "minmax(150px, 1fr) 150px 100px 150px",
                          gap: 10,
                          padding:
                            "12px 13px",
                          borderBottom: `1px solid ${C.border}`,
                          alignItems:
                            "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight:
                              650,
                            color:
                              C.ink,
                          }}
                        >
                          {employee.name ||
                            "Employee"}
                        </div>

                        <div
                          style={{
                            textAlign:
                              "right",
                            fontSize:
                              12,
                            fontWeight:
                              650,
                            color:
                              C.ink,
                          }}
                        >
                          ₹
                          {employee.revenue.toLocaleString(
                            "en-IN",
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                        </div>

                        <div
                          style={{
                            textAlign:
                              "right",
                            fontSize:
                              12,
                            fontWeight:
                              700,
                            color:
                              C.primary,
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "flex-end",
                            gap: 3,
                          }}
                        >
                          <Percent
                            size={11}
                          />

                          {
                            employee.commissionPercentage
                          }
                          %
                        </div>

                        <div
                          style={{
                            textAlign:
                              "right",
                            fontSize:
                              13,
                            fontWeight:
                              750,
                            color:
                              C.ink,
                          }}
                        >
                          ₹
                          {employee.salary.toLocaleString(
                            "en-IN",
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SALARY FORMULA */}

          <div
            style={{
              marginTop: 15,
              padding:
                "10px 12px",
              borderRadius: 8,
              background: C.bg,
              fontSize: 10,
              color: C.inkFaint,
            }}
          >
            <strong
              style={{
                color: C.ink,
              }}
            >
              Commission Salary Formula:
            </strong>{" "}
            Monthly Revenue × Commission % ÷ 100
          </div>
        </div>
      </Panel>

      {/* =====================================================
          CONVERSION FORMULA INFO
      ====================================================== */}

      <Panel
        style={{
          marginBottom: 18,
        }}
      >
        <div
          className="conversion-info"
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: C.bg,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              flexShrink: 0,
            }}
          >
            <TrendingUp
              size={18}
              color={
                C.primary
              }
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
              Conversion Rate
            </div>

            <div
              style={{
                fontSize: 12,
                color:
                  C.inkFaint,
                marginTop: 3,
              }}
            >
              {isServicePerformance
                ? "Completed Leads ÷ Assigned Leads × 100"
                : "Closed Leads ÷ Assigned Leads × 100"}
            </div>
          </div>
        </div>
      </Panel>

      {/* =====================================================
          ACTIVE PERFORMANCE EMPLOYEES
      ====================================================== */}

      {filterError ? null : activePerformanceEmployees.length ===
        0 ? (
        <Panel>
          <div
            style={{
              padding: 30,
              textAlign:
                "center",
              color:
                C.inkFaint,
            }}
          >
            {isServicePerformance
              ? "No Service Employee employees found."
              : "No Sales Executive employees found."}
          </div>
        </Panel>
      ) : (
        <div
          className="team-performance-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 16,
          }}
        >
          {activePerformanceEmployees.map(
            (employee) => {
              const s =
                employee.stats;

              const incentive =
                employee.incentive;

              const isTopPerformer =
                topPerformer?.id ===
                employee.id;

              return (
                <Panel
                  key={
                    employee.id
                  }
                  style={{
                    position:
                      "relative",
                    border:
                      isTopPerformer
                        ? `1px solid ${C.primary}`
                        : undefined,
                  }}
                >
                  {isTopPerformer && (
                    <div
                      style={{
                        position:
                          "absolute",
                        top: 0,
                        right: 0,
                        padding:
                          "5px 10px",
                        borderRadius:
                          "0 8px 0 8px",
                        background:
                          C.primary,
                        color:
                          "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      TOP PERFORMER
                    </div>
                  )}

                  {/* EMPLOYEE HEADER */}

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      marginBottom:
                        18,
                      paddingRight:
                        isTopPerformer
                          ? 85
                          : 0,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 11,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius:
                            "50%",
                          background:
                            C.primaryDeep,
                          color:
                            "#fff",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontSize: 15,
                          fontWeight:
                            700,
                          flexShrink: 0,
                        }}
                      >
                        {(
                          employee.name ||
                          "E"
                        )
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
                            fontSize: 15,
                            fontWeight:
                              700,
                            color:
                              C.ink,
                            whiteSpace:
                              "nowrap",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                          }}
                        >
                          {employee.name ||
                            "Employee"}
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color:
                              C.inkFaint,
                            marginTop:
                              2,
                          }}
                        >
                          {isServicePerformance
                            ? "Service Employee"
                            : "Sales Executive"}
                        </div>
                      </div>
                    </div>

                    {/* CONVERSION RATE */}

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 6,
                        background:
                          C.bg,
                        borderRadius:
                          8,
                        padding:
                          "7px 9px",
                        flexShrink: 0,
                      }}
                    >
                      <TrendingUp
                        size={14}
                        color={
                          C.primary
                        }
                      />

                      <span
                        style={{
                          fontSize: 13,
                          fontWeight:
                            700,
                          color:
                            C.primary,
                        }}
                      >
                        {
                          s.conversionRate
                        }
                        %
                      </span>

                      <span
                        style={{
                          fontSize: 10,
                          color:
                            C.inkFaint,
                        }}
                      >
                        Conversion
                      </span>
                    </div>
                  </div>

                  {/* MAIN STATS */}

                  <div
                    className="team-performance-stats"
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <StatCard
                      icon={Users}
                      label="Assigned Leads"
                      value={
                        s.assigned
                      }
                    />

                    <StatCard
                      icon={
                        CheckCircle2
                      }
                      label={
                        isServicePerformance
                          ? "Completed Leads"
                          : "Closed"
                      }
                      value={
                        isServicePerformance
                          ? s.completed
                          : s.closed
                      }
                    />

                    <StatCard
                      icon={
                        UserCheck
                      }
                      label="Conversion Rate"
                      value={`${s.conversionRate}%`}
                    />

                    <StatCard
                      icon={
                        Target
                      }
                      label="Monthly Incentive"
                      value={
                        incentive.incentive >
                        0
                          ? `₹${incentive.incentive.toLocaleString(
                              "en-IN"
                            )}`
                          : "Not Qualified"
                      }
                    />
                  </div>

                  {/* CONVERSION BAR */}

                  <div
                    style={{
                      marginTop: 18,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        marginBottom:
                          6,
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          color:
                            C.inkFaint,
                        }}
                      >
                        {isServicePerformance
                          ? "Completed / Assigned"
                          : "Closed / Assigned"}
                      </span>

                      <span
                        style={{
                          color:
                            C.ink,
                          fontWeight:
                            600,
                        }}
                      >
                        {isServicePerformance
                          ? s.completed
                          : s.closed}{" "}
                        /{" "}
                        {
                          s.assigned
                        }
                      </span>
                    </div>

                    <div
                      style={{
                        height: 7,
                        background:
                          C.borderSoft,
                        borderRadius:
                          20,
                        overflow:
                          "hidden",
                      }}
                    >
                      <div
                        style={{
                          height:
                            "100%",
                          width: `${Math.min(
                            s.conversionRate,
                            100
                          )}%`,
                          background:
                            C.primary,
                          borderRadius:
                            20,
                          transition:
                            "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* SERVICE INCENTIVE INFORMATION */}

                  {isServicePerformance && (
                    <div
                      style={{
                        marginTop: 14,
                        padding:
                          "9px 11px",
                        borderRadius: 7,
                        background:
                          C.bg,
                        fontSize: 10,
                        color:
                          C.inkFaint,
                      }}
                    >
                      Service Incentive:
                      10+ Completed Leads
                      = ₹2,000
                    </div>
                  )}
                </Panel>
              );
            }
          )}
        </div>
      )}

      {/* =====================================================
          RESPONSIVE
      ====================================================== */}

      <style>{`
        @media (max-width: 900px) {
          .team-performance-filters {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .team-performance-grid {
            grid-template-columns: 1fr !important;
          }

          .team-performance-filters {
            grid-template-columns: 1fr !important;
          }

          .conversion-info {
            align-items: flex-start !important;
          }

          .performance-tabs {
            flex-direction: column !important;
          }
        }

        @media (max-width: 430px) {
          .team-performance-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}