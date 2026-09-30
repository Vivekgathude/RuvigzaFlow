import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  C,
  EmptyNote,
  Panel,
  StatCard,
  inputStyle,
} from "./ui";

import { supabase } from "./supabase";


/* =========================================================
   CONSTANTS
========================================================= */

const SERVICES = [
  {
    key: "Google Ads",
    label: "Google Ads",
    shortLabel: "Google",
  },
  {
    key: "Meta Ads",
    label: "Meta Ads",
    shortLabel: "Meta",
  },
  {
    key: "Website",
    label: "Website",
    shortLabel: "Website",
  },
];

const SERVICE_KEYS = SERVICES.map((service) => service.key);

const CHART_COLORS = [
  "#1D4E45",
  "#E8A33D",
  "#3E6E93",
];

const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "custom", label: "Custom" },
];


/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0);

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(amount);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();

  // Monday = first day
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function endOfWeek(date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);

  return result;
}

function startOfMonth(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfMonth(date) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );

  result.setHours(23, 59, 59, 999);

  return result;
}

function getPresetDates(preset) {
  const now = new Date();

  if (preset === "today") {
    return {
      from: formatDateInput(now),
      to: formatDateInput(now),
    };
  }

  if (preset === "week") {
    return {
      from: formatDateInput(startOfWeek(now)),
      to: formatDateInput(endOfWeek(now)),
    };
  }

  if (preset === "month") {
    return {
      from: formatDateInput(startOfMonth(now)),
      to: formatDateInput(endOfMonth(now)),
    };
  }

  if (preset === "last_month") {
    const previousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    return {
      from: formatDateInput(startOfMonth(previousMonth)),
      to: formatDateInput(endOfMonth(previousMonth)),
    };
  }

  return {
    from: formatDateInput(startOfMonth(now)),
    to: formatDateInput(now),
  };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatTrendDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function differenceInDays(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  return Math.floor(
    (end.getTime() - start.getTime()) /
      (1000 * 60 * 60 * 24)
  ) + 1;
}

function getPreviousPeriod(from, to) {
  const days = differenceInDays(from, to);

  const currentStart = new Date(`${from}T00:00:00`);
  const previousEnd = new Date(currentStart);

  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);

  return {
    from: formatDateInput(previousStart),
    to: formatDateInput(previousEnd),
  };
}

function percentage(value, total) {
  if (!total) return 0;

  return (Number(value || 0) / Number(total || 0)) * 100;
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const cleaned = String(value).replace(/[₹,\s]/g, "");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeService(value) {
  if (!value) return null;

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "google ads") return "Google Ads";
  if (normalized === "meta ads") return "Meta Ads";
  if (normalized === "website") return "Website";

  return null;
}


/* =========================================================
   CUSTOM TOOLTIP
========================================================= */

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const value = payload[0]?.value || 0;

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0 8px 24px rgba(28,35,33,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.inkFaint,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14,
          fontWeight: 500,
          color: C.ink,
        }}
      >
        {formatCurrency(value)}
      </div>
    </div>
  );
}


/* =========================================================
   DONUT CENTER
========================================================= */

function DonutCenter({ total }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.inkFaint,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        }}
      >
        Total Revenue
      </div>

      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 25,
          fontWeight: 500,
          color: C.ink,
        }}
      >
        {formatCompactCurrency(total)}
      </div>
    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function RevenueDashboard() {
  const initialDates = getPresetDates("month");

  const [preset, setPreset] = useState("month");

  const [fromDate, setFromDate] = useState(
    initialDates.from
  );

  const [toDate, setToDate] = useState(
    initialDates.to
  );

  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");


  /* =======================================================
     DATE PRESET
  ======================================================= */

  const handlePresetChange = (nextPreset) => {
    setPreset(nextPreset);

    if (nextPreset === "custom") {
      return;
    }

    const dates = getPresetDates(nextPreset);

    setFromDate(dates.from);
    setToDate(dates.to);
  };


  /* =======================================================
     FETCH DATA
  ======================================================= */

  const fetchRevenueData = useCallback(async () => {
    try {
      setError("");

      const isRefresh = assignments.length > 0;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      /*
       * We intentionally fetch completed assignments first.
       *
       * Revenue attribution is taken from the LEAD:
       *   leads.package_amount
       *   leads.close_service
       *
       * Completion date is taken from:
       *   client_service_assignments.completed_at
       */

      const { data, error: assignmentError } =
  await supabase
    .from("client_service_assignments")
    .select(`
      id,
      lead_id,
      service_type,
      status,
      completed_at,
      created_at,
      leads (
        id,
        name,
        package_amount,
        close_service,
        close_budget,
        closed_at
      )
    `)
    .eq("status", "Completed")
    .not("completed_at", "is", null)
    .not("leads.closed_at", "is", null)
    .not("leads.close_budget", "is", null)
    .not("leads.close_service", "is", null)
    .order("completed_at", { ascending: true });
    
      if (assignmentError) {
        throw assignmentError;
      }

      setAssignments(data || []);
    } catch (err) {
      console.error(
        "Revenue dashboard error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load revenue data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignments.length]);


  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);


  /* =======================================================
     FILTER CURRENT PERIOD
  ======================================================= */

  const filteredAssignments = useMemo(() => {
    if (!fromDate || !toDate) {
      return [];
    }

    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T23:59:59`);

    return assignments.filter((assignment) => {
      if (!assignment.completed_at) {
        return false;
      }

      const completedAt = new Date(
        assignment.completed_at
      );

      return (
        completedAt >= start &&
        completedAt <= end
      );
    });
  }, [
    assignments,
    fromDate,
    toDate,
  ]);


  /* =======================================================
     REVENUE RECORDS
     
     Important:
     Multiple assignments can exist for one lead.
     
     We prevent the same lead's package_amount
     from being counted multiple times in the same period.
  ======================================================= */

  const revenueRecords = useMemo(() => {
    const seenLeadIds = new Set();

    const records = [];

    const sorted = [...filteredAssignments].sort(
      (a, b) =>
        new Date(a.completed_at).getTime() -
        new Date(b.completed_at).getTime()
    );

    for (const assignment of sorted) {
      const lead = assignment.leads;

      if (!lead?.id) {
        continue;
      }

      if (seenLeadIds.has(lead.id)) {
        continue;
      }

      seenLeadIds.add(lead.id);

      const amount = normalizeAmount(
        lead.package_amount
      );

      const service = normalizeService(
        lead.close_service
      );

      records.push({
        assignmentId: assignment.id,
        leadId: lead.id,
        clientName:
          lead.name || "Unnamed Client",
        amount,
        service,
        completedAt:
          assignment.completed_at,
      });
    }

    return records;
  }, [filteredAssignments]);


  /* =======================================================
     KPI DATA
  ======================================================= */

  const totalRevenue = useMemo(() => {
    return revenueRecords.reduce(
      (sum, item) => sum + item.amount,
      0
    );
  }, [revenueRecords]);

  const completedClients = revenueRecords.length;

  const averageRevenue =
    completedClients > 0
      ? totalRevenue / completedClients
      : 0;


  /* =======================================================
     SERVICE BREAKDOWN
  ======================================================= */

  const serviceData = useMemo(() => {
    return SERVICES.map((service, index) => {
      const records = revenueRecords.filter(
        (item) =>
          item.service === service.key
      );

      const revenue = records.reduce(
        (sum, item) => sum + item.amount,
        0
      );

      return {
        key: service.key,
        name: service.label,
        revenue,
        clients: records.length,
        percentage: percentage(
          revenue,
          totalRevenue
        ),
        color:
          CHART_COLORS[index],
      };
    });
  }, [revenueRecords, totalRevenue]);


  const chartData = useMemo(() => {
    return serviceData.filter(
      (item) => item.revenue > 0
    );
  }, [serviceData]);


  /* =======================================================
     DAILY TREND
  ======================================================= */

  const trendData = useMemo(() => {
    if (!fromDate || !toDate) {
      return [];
    }

    const map = new Map();

    const start = new Date(
      `${fromDate}T00:00:00`
    );

    const end = new Date(
      `${toDate}T00:00:00`
    );

    /*
     * Create every date in selected period so that
     * zero-revenue days also appear on graph.
     */

    const cursor = new Date(start);

    while (cursor <= end) {
      const dateString =
        formatDateInput(cursor);

      map.set(dateString, 0);

      cursor.setDate(
        cursor.getDate() + 1
      );
    }

    revenueRecords.forEach((record) => {
      const date = new Date(
        record.completedAt
      );

      const dateString =
        formatDateInput(date);

      map.set(
        dateString,
        (map.get(dateString) || 0) +
          record.amount
      );
    });

    return Array.from(map.entries()).map(
      ([date, revenue]) => ({
        date,
        label: formatTrendDate(date),
        revenue,
      })
    );
  }, [
    revenueRecords,
    fromDate,
    toDate,
  ]);


  /* =======================================================
     HIGHEST REVENUE DAY
  ======================================================= */

  const highestRevenueDay = useMemo(() => {
    if (!trendData.length) {
      return null;
    }

    return trendData.reduce(
      (highest, current) =>
        current.revenue > highest.revenue
          ? current
          : highest,
      trendData[0]
    );
  }, [trendData]);


  /* =======================================================
     TOP SERVICE
  ======================================================= */

  const topService = useMemo(() => {
    if (!serviceData.length) {
      return null;
    }

    const activeServices =
      serviceData.filter(
        (service) => service.revenue > 0
      );

    if (!activeServices.length) {
      return null;
    }

    return activeServices.reduce(
      (highest, current) =>
        current.revenue > highest.revenue
          ? current
          : highest
    );
  }, [serviceData]);


  /* =======================================================
     PREVIOUS PERIOD
  ======================================================= */

  const previousPeriod = useMemo(() => {
    if (!fromDate || !toDate) {
      return {
        from: "",
        to: "",
      };
    }

    return getPreviousPeriod(
      fromDate,
      toDate
    );
  }, [fromDate, toDate]);


  const previousRevenueRecords = useMemo(() => {
    if (
      !previousPeriod.from ||
      !previousPeriod.to
    ) {
      return [];
    }

    const start = new Date(
      `${previousPeriod.from}T00:00:00`
    );

    const end = new Date(
      `${previousPeriod.to}T23:59:59`
    );

    const seenLeadIds = new Set();

    const result = [];

    const sorted = [...assignments]
      .filter((assignment) => {
        if (!assignment.completed_at) {
          return false;
        }

        const completedAt = new Date(
          assignment.completed_at
        );

        return (
          completedAt >= start &&
          completedAt <= end
        );
      })
      .sort(
        (a, b) =>
          new Date(a.completed_at).getTime() -
          new Date(b.completed_at).getTime()
      );

    sorted.forEach((assignment) => {
      const lead = assignment.leads;

      if (!lead?.id) {
        return;
      }

      if (seenLeadIds.has(lead.id)) {
        return;
      }

      seenLeadIds.add(lead.id);

      result.push({
        amount: normalizeAmount(
          lead.package_amount
        ),
      });
    });

    return result;
  }, [
    assignments,
    previousPeriod,
  ]);


  const previousRevenue =
    previousRevenueRecords.reduce(
      (sum, item) => sum + item.amount,
      0
    );


  const revenueChange = useMemo(() => {
    if (!previousRevenue) {
      return null;
    }

    return (
      ((totalRevenue -
        previousRevenue) /
        previousRevenue) *
      100
    );
  }, [
    totalRevenue,
    previousRevenue,
  ]);


  /* =======================================================
     INVALID DATE RANGE
  ======================================================= */

  const invalidDateRange =
    fromDate &&
    toDate &&
    fromDate > toDate;


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        paddingBottom: 30,
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily:
                "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
              color: C.ink,
            }}
          >
            Agency Revenue
          </h1>

          <div
            style={{
              fontSize: 13,
              color: C.inkSoft,
              marginTop: 5,
            }}
          >
            Revenue generated from completed
            client services
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRevenueData}
          disabled={loading || refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 12px",
            borderRadius: 6,
            border:
              `1px solid ${C.border}`,
            background: C.panel,
            color: C.inkSoft,
            fontSize: 12,
            cursor:
              loading || refreshing
                ? "not-allowed"
                : "pointer",
            opacity:
              loading || refreshing
                ? 0.6
                : 1,
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation:
                refreshing
                  ? "spin 1s linear infinite"
                  : "none",
            }}
          />

          Refresh
        </button>
      </div>


      {/* =================================================
          DATE FILTER
      ================================================= */}

      <Panel
        style={{
          marginBottom: 18,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: C.inkSoft,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <CalendarDays size={15} />

            Revenue Period
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {DATE_PRESETS.map(
              (item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    handlePresetChange(
                      item.key
                    )
                  }
                  style={{
                    padding:
                      "7px 11px",
                    borderRadius: 6,
                    border:
                      `1px solid ${
                        preset ===
                        item.key
                          ? C.primary
                          : C.border
                      }`,
                    background:
                      preset ===
                      item.key
                        ? C.primarySoft
                        : C.panel,
                    color:
                      preset ===
                      item.key
                        ? C.primaryDeep
                        : C.inkSoft,
                    fontSize: 12,
                    fontWeight:
                      preset ===
                      item.key
                        ? 600
                        : 400,
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              )
            )}
          </div>

          {preset === "custom" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexWrap: "wrap",
              }}
            >
              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

              <span
                style={{
                  color: C.inkFaint,
                  fontSize: 12,
                }}
              >
                to
              </span>

              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>
          )}

          {preset !== "custom" && (
            <div
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: C.inkFaint,
              }}
            >
              {formatDisplayDate(
                fromDate
              )}{" "}
              —{" "}
              {formatDisplayDate(
                toDate
              )}
            </div>
          )}
        </div>

        {invalidDateRange && (
          <div
            style={{
              marginTop: 10,
              color: C.danger,
              fontSize: 12,
            }}
          >
            Please select a valid date
            range.
          </div>
        )}
      </Panel>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <Panel
          style={{
            marginBottom: 18,
            background: C.dangerSoft,
            borderColor: "#E7C5BB",
          }}
        >
          <div
            style={{
              color: C.danger,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        </Panel>
      )}


      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (
        <Panel>
          <div
            style={{
              padding: 35,
              textAlign: "center",
              color: C.inkFaint,
              fontSize: 13,
            }}
          >
            Loading revenue data...
          </div>
        </Panel>
      ) : (
        <>
          {/* =============================================
              KPI CARDS
          ============================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <StatCard
              label="Total Revenue"
              value={formatCompactCurrency(
                totalRevenue
              )}
              accent={C.primary}
            />

            <StatCard
              label="Completed Clients"
              value={completedClients}
              accent={C.ink}
            />

            <StatCard
              label="Average Revenue / Client"
              value={formatCompactCurrency(
                averageRevenue
              )}
              accent={C.accentDeep}
            />

            <div
              style={{
                background: C.panel,
                border:
                  `1px solid ${C.border}`,
                borderRadius: 8,
                padding:
                  "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: C.inkFaint,
                  marginBottom: 6,
                }}
              >
                Previous Period
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontFamily:
                      "'IBM Plex Mono', monospace",
                    fontSize: 23,
                    fontWeight: 500,
                    color: C.ink,
                  }}
                >
                  {formatCompactCurrency(
                    previousRevenue
                  )}
                </div>

                {revenueChange !==
                  null && (
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 3,
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        revenueChange >=
                        0
                          ? C.primary
                          : C.danger,
                    }}
                  >
                    {revenueChange >=
                    0 ? (
                      <TrendingUp
                        size={13}
                      />
                    ) : (
                      <TrendingDown
                        size={13}
                      />
                    )}

                    {Math.abs(
                      revenueChange
                    ).toFixed(1)}
                    %
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* =============================================
              MAIN REVENUE OVERVIEW
          ============================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
              gap: 18,
              marginBottom: 18,
            }}
          >
            {/* DONUT */}

            <Panel
              title="Revenue Contribution"
              style={{
                minHeight: 390,
              }}
            >
              {totalRevenue > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(280px, 1fr) minmax(210px, 0.8fr)",
                    gap: 20,
                    alignItems: "center",
                    height: 325,
                  }}
                >
                  <div
                    style={{
                      position:
                        "relative",
                      width: "100%",
                      height: 300,
                    }}
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="revenue"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="62%"
                          outerRadius="86%"
                          paddingAngle={3}
                          strokeWidth={0}
                          startAngle={90}
                          endAngle={-270}
                        >
                          {chartData.map(
                            (
                              entry
                            ) => (
                              <Cell
                                key={
                                  entry.key
                                }
                                fill={
                                  entry.color
                                }
                              />
                            )
                          )}
                        </Pie>

                        <Tooltip
                          formatter={(
                            value
                          ) =>
                            formatCurrency(
                              value
                            )
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <DonutCenter
                      total={
                        totalRevenue
                      }
                    />
                  </div>

                  {/* LEGEND */}

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap: 14,
                    }}
                  >
                    {serviceData.map(
                      (
                        service
                      ) => (
                        <div
                          key={
                            service.key
                          }
                          style={{
                            borderBottom:
                              `1px solid ${C.borderSoft}`,
                            paddingBottom:
                              12,
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
                              marginBottom:
                                6,
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 7,
                              }}
                            >
                              <span
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius:
                                    "50%",
                                  background:
                                    service.color,
                                  display:
                                    "inline-block",
                                }}
                              />

                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight:
                                    500,
                                  color:
                                    C.ink,
                                }}
                              >
                                {
                                  service.label
                                }
                              </span>
                            </div>

                            <span
                              style={{
                                fontFamily:
                                  "'IBM Plex Mono', monospace",
                                fontSize: 12,
                                color:
                                  C.inkSoft,
                              }}
                            >
                              {service.percentage.toFixed(
                                1
                              )}
                              %
                            </span>
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "baseline",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                fontFamily:
                                  "'IBM Plex Mono', monospace",
                                fontSize: 16,
                                color:
                                  C.ink,
                              }}
                            >
                              {formatCurrency(
                                service.revenue
                              )}
                            </span>

                            <span
                              style={{
                                fontSize: 11,
                                color:
                                  C.inkFaint,
                              }}
                            >
                              {
                                service.clients
                              }{" "}
                              client
                              {service.clients ===
                              1
                                ? ""
                                : "s"}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: 320,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <EmptyNote
                    text="No completed revenue found for this period."
                  />
                </div>
              )}
            </Panel>


            {/* PERIOD SUMMARY */}

            <Panel
              title="Period Summary"
              style={{
                minHeight: 390,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: 0,
                }}
              >
                <SummaryRow
                  label="Selected Period"
                  value={
                    fromDate &&
                    toDate
                      ? `${formatShortDate(
                          fromDate
                        )} – ${formatShortDate(
                          toDate
                        )}`
                      : "—"
                  }
                />

                <SummaryRow
                  label="Revenue"
                  value={formatCurrency(
                    totalRevenue
                  )}
                  strong
                />

                <SummaryRow
                  label="Completed Clients"
                  value={
                    completedClients
                  }
                />

                <SummaryRow
                  label="Average Deal Value"
                  value={formatCurrency(
                    averageRevenue
                  )}
                />

                <SummaryRow
                  label="Top Service"
                  value={
                    topService
                      ? topService.name
                      : "—"
                  }
                />

                <SummaryRow
                  label="Highest Revenue Day"
                  value={
                    highestRevenueDay &&
                    highestRevenueDay
                      .revenue > 0
                      ? `${highestRevenueDay.label}`
                      : "—"
                  }
                />

                <SummaryRow
                  label="Highest Day Revenue"
                  value={
                    highestRevenueDay &&
                    highestRevenueDay
                      .revenue > 0
                      ? formatCurrency(
                          highestRevenueDay.revenue
                        )
                      : "—"
                  }
                />

                <SummaryRow
                  label="Previous Period"
                  value={formatCurrency(
                    previousRevenue
                  )}
                />
              </div>
            </Panel>
          </div>


          {/* =============================================
              REVENUE TREND
          ============================================= */}

          <Panel
            title="Revenue Trend"
            style={{
              marginBottom: 18,
            }}
          >
            {trendData.some(
              (item) =>
                item.revenue > 0
            ) ? (
              <div
                style={{
                  width: "100%",
                  height: 320,
                  marginTop: 5,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={trendData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 5,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke={
                        C.borderSoft
                      }
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: C.inkFaint,
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke:
                          C.border,
                      }}
                      tickLine={false}
                      minTickGap={25}
                    />

                    <YAxis
                      tick={{
                        fill: C.inkFaint,
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(
                        value
                      ) =>
                        formatCompactCurrency(
                          value
                        )
                      }
                      width={70}
                    />

                    <Tooltip
                      content={
                        <RevenueTooltip />
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={
                        C.primary
                      }
                      fill={
                        C.primarySoft
                      }
                      strokeWidth={2}
                      activeDot={{
                        r: 5,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                style={{
                  height: 260,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <EmptyNote
                  text="Revenue trend will appear when completed revenue is available."
                />
              </div>
            )}
          </Panel>


          {/* =============================================
              SERVICE CARDS
          ============================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {serviceData.map(
              (service) => (
                <Panel
                  key={service.key}
                  style={{
                    position:
                      "relative",
                    overflow:
                      "hidden",
                  }}
                >
                  <div
                    style={{
                      position:
                        "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background:
                        service.color,
                    }}
                  />

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius:
                          "50%",
                        background:
                          service.color,
                      }}
                    />

                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          C.ink,
                      }}
                    >
                      {
                        service.name
                      }
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily:
                        "'IBM Plex Mono', monospace",
                      fontSize: 23,
                      color: C.ink,
                      marginBottom: 8,
                    }}
                  >
                    {formatCurrency(
                      service.revenue
                    )}
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      fontSize: 11,
                      color:
                        C.inkFaint,
                    }}
                  >
                    <span>
                      {
                        service.clients
                      }{" "}
                      completed client
                      {service.clients ===
                      1
                        ? ""
                        : "s"}
                    </span>

                    <span
                      style={{
                        fontFamily:
                          "'IBM Plex Mono', monospace",
                        color:
                          C.inkSoft,
                      }}
                    >
                      {service.percentage.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>
                </Panel>
              )
            )}
          </div>


          {/* =============================================
              EMPTY PERIOD NOTICE
          ============================================= */}

          {totalRevenue === 0 && (
            <Panel
              style={{
                marginTop: 18,
                background:
                  C.bg,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 10,
                }}
              >
                <CheckCircle2
                  size={18}
                  color={
                    C.inkFaint
                  }
                />

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color:
                        C.inkSoft,
                    }}
                  >
                    No completed
                    revenue in this
                    period
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color:
                        C.inkFaint,
                      marginTop: 3,
                    }}
                  >
                    Try selecting a
                    wider date range
                    or another
                    period.
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </>
      )}


      {/* =================================================
          RESPONSIVE STYLE
      ================================================= */}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 900px) {
            .revenue-main-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 700px) {
            .revenue-overview {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}


/* =========================================================
   SUMMARY ROW
========================================================= */

function SummaryRow({
  label,
  value,
  strong = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: 15,
        padding:
          "12px 0",
        borderBottom:
          `1px solid ${C.borderSoft}`,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: C.inkFaint,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontFamily:
            "'IBM Plex Mono', monospace",
          fontSize:
            strong ? 15 : 12,
          fontWeight:
            strong ? 500 : 400,
          color: C.ink,
          textAlign:
            "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}