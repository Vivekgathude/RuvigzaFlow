import React, { useMemo } from "react";
import {
  Users,
  UserPlus,
  CheckCircle2,
  TrendingUp,
  UploadCloud,
  ArrowUpRight,
  PhoneCall,
  UserCheck,
  Clock3,
  XCircle,
  Target,
} from "lucide-react";

import {
  C,
  Panel,
  PageHeader,
  EmptyNote,
} from "./ui";

const fmtDate = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Dashboard({
  leads = [],
  employees = [],
  uploadHistory = [],
  onNavigate,
}) {
  const stats = useMemo(() => {
    const total = leads.length;

    const newLeads = leads.filter(
      (l) => l.status === "New"
    ).length;

    const contacted = leads.filter(
      (l) => l.status === "Contacted"
    ).length;

    const interested = leads.filter(
      (l) => l.status === "Interested"
    ).length;

    const followUp = leads.filter(
      (l) => l.status === "Follow Up"
    ).length;

    const sentProposal = leads.filter(
      (l) => l.status === "Sent Proposal"
    ).length;

    const onboarded = leads.filter(
      (l) => l.status === "Onboarded"
    ).length;

    const notInterested = leads.filter(
      (l) => l.status === "Not Interested"
    ).length;

    const closed = leads.filter(
      (l) => l.status === "Closed"
    ).length;

    // Converted = Closed Leads
    const converted = closed;

    // Conversion = Closed Leads / Total Leads
    const rate = total
      ? Math.round((closed / total) * 100)
      : 0;

    const bySource = {};

    leads.forEach((lead) => {
      const source = lead.source || "Other";

      bySource[source] =
        (bySource[source] || 0) + 1;
    });

    const byEmployee = {};

    leads.forEach((lead) => {
      const employee = employees.find(
        (emp) => emp.id === lead.assignedEmployeeId
      );

      const name = employee
        ? employee.name
        : "Unassigned";

      byEmployee[name] =
        (byEmployee[name] || 0) + 1;
    });

    return {
      total,
      newLeads,
      contacted,
      interested,
      followUp,
      sentProposal,
      onboarded,
      notInterested,
      closed,
      converted,
      rate,
      bySource,
      byEmployee,
    };
  }, [leads, employees]);

  return (
    <div className="crm-dashboard">
      {/* -------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------- */}

      <div className="dashboard-header">
        <PageHeader
          title="Dashboard"
          subtitle="Overview across your sales and marketing team."
        />

        <div className="live-crm">
          <span className="live-dot" />
          Live CRM
        </div>
      </div>

      {/* -------------------------------- */}
      {/* STAT CARDS */}
      {/* -------------------------------- */}

      <div className="stats-grid">
        <DashboardStat
          icon={Users}
          label="Total leads"
          value={stats.total}
          description="All CRM records"
          accent={C.primaryDeep}
          onClick={() => onNavigate?.("leads")}
        />

        <DashboardStat
          icon={UserPlus}
          label="New leads"
          value={stats.newLeads}
          description="Waiting to be worked"
          accent={C.accentDeep}
        />

        <DashboardStat
          icon={CheckCircle2}
          label="Converted"
          value={stats.converted}
          description="Successfully converted"
          accent={C.primary}
        />

        <DashboardStat
          icon={TrendingUp}
          label="Conversion rate"
          value={`${stats.rate}%`}
          description="Converted / total leads"
          accent={C.primaryDeep}
        />
      </div>

      {/* -------------------------------- */}
      {/* PIPELINE */}
      {/* -------------------------------- */}

      <Panel
        style={{
          marginBottom: 16,
          padding: 20,
        }}
      >
        <SectionHeader
          icon={Target}
          title="Lead Pipeline"
          subtitle="Current distribution of all leads"
          right={`${stats.total} total`}
        />

        <div className="pipeline-grid">
          <PipelineItem
            icon={UserPlus}
            label="New"
            value={stats.newLeads}
          />

          <PipelineItem
            icon={PhoneCall}
            label="Contacted"
            value={stats.contacted}
          />

          <PipelineItem
            icon={Clock3}
            label="Follow Up"
            value={stats.followUp}
          />

          <PipelineItem
            icon={UserCheck}
            label="Interested"
            value={stats.interested}
          />

          <PipelineItem
            icon={CheckCircle2}
            label="Converted"
            value={stats.converted}
          />

          <PipelineItem
            icon={XCircle}
            label="Closed"
            value={stats.closed}
          />
        </div>
      </Panel>

      {/* -------------------------------- */}
      {/* SOURCE + TEAM */}
      {/* -------------------------------- */}

      <div className="two-column-grid">
        <Panel
          title="Leads by source"
          style={{
            padding: 20,
          }}
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
          title="Leads by team member"
          style={{
            padding: 20,
          }}
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

      {/* -------------------------------- */}
      {/* RECENT IMPORTS */}
      {/* -------------------------------- */}

      <Panel
  style={{
    marginTop: 16,
    padding: 20,
  }}
>
  <div
    onClick={() => onNavigate?.("upload")}
    style={{
      cursor: "pointer",
    }}
  >
 
        <SectionHeader
          icon={UploadCloud}
          title="Recent imports"
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
                {uploadHistory
                  .slice(0, 8)
                  .map((history) => (
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

      {/* -------------------------------- */}
      {/* RESPONSIVE CSS */}
      {/* -------------------------------- */}

      <style>
        {`
          .crm-dashboard {
            width: 100%;
            box-sizing: border-box;
          }

          /* HEADER */

          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 24px;
          }

          .live-crm {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 8px 11px;
            border-radius: 8px;
            background: #FFFFFF;
            border: 1px solid ${C.border};
            font-size: 11px;
            color: ${C.inkSoft};
            white-space: nowrap;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }

          .live-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: ${C.primary};
            display: inline-block;
            box-shadow: 0 0 0 3px ${C.primary}18;
          }

          /* STAT CARDS */

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 18px;
          }

          /* PIPELINE */

          .pipeline-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 9px;
          }

          /* TWO COLUMNS */

          .two-column-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          /* IMPORT TABLE */

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

          /* TABLET */

          @media (max-width: 1100px) {
            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .pipeline-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          /* SMALL TABLET / LARGE MOBILE */

          @media (max-width: 760px) {
            .dashboard-header {
              align-items: flex-start;
              margin-bottom: 20px;
            }

            .live-crm {
              padding: 7px 9px;
            }

            .two-column-grid {
              grid-template-columns: 1fr;
            }

            .pipeline-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          /* MOBILE */

          @media (max-width: 560px) {
            .dashboard-header {
              flex-direction: column;
              gap: 8px;
            }

            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .pipeline-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
            }

            .live-crm {
              align-self: flex-start;
            }
          }

          /* VERY SMALL MOBILE */

          @media (max-width: 390px) {
            .stats-grid {
              grid-template-columns: 1fr;
            }

            .pipeline-grid {
              grid-template-columns: 1fr 1fr;
            }
          }

          /* CLICKABLE DASHBOARD STAT */

          .dashboard-stat-clickable {
            cursor: pointer;
          }

          .dashboard-stat-clickable:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 16px rgba(0,0,0,0.07);
          }
        `}
      </style>
    </div>
  );
}


/* -------------------------------- */
/* SECTION HEADER                   */
/* -------------------------------- */

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
      <div
        style={{
          minWidth: 0,
        }}
      >
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


/* -------------------------------- */
/* DASHBOARD STAT CARD              */
/* -------------------------------- */

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
      style={{
        background: "#FFFFFF",
        border: `1px solid ${C.border}`,
        borderRadius: 11,
        padding: "17px 18px",
        minHeight: 112,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        transition:
          "transform 0.18s ease, box-shadow 0.18s ease",
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
          fontSize: 27,
          fontWeight: 700,
          marginTop: 12,
          color: C.ink,
          position: "relative",
          zIndex: 1,
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
        }}
      >
        {description}
      </div>
    </div>
  );
}


/* -------------------------------- */
/* PIPELINE ITEM                    */
/* -------------------------------- */

function PipelineItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      style={{
        padding: "13px 12px",
        borderRadius: 9,
        background: "#F7F9F8",
        border: `1px solid ${C.borderSoft}`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        <Icon
          size={13}
          color={C.inkFaint}
          style={{
            flexShrink: 0,
          }}
        />

        <div
          style={{
            fontSize: 11,
            color: C.inkFaint,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          marginTop: 7,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: C.ink,
        }}
      >
        {value}
      </div>
    </div>
  );
}


/* -------------------------------- */
/* BAR LIST                         */
/* -------------------------------- */

function BarList({
  data,
  total,
  color,
}) {
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
          <div
            key={label}
            style={{
              marginBottom: 15,
            }}
          >
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