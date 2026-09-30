import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileBarChart,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  C,
  PageHeader,
  Panel,
  Button,
  EmptyNote,
  inputStyle,
} from "./ui";

import { supabase } from "./supabase";

const EMPTY_REPORT = {
  client_id: "",
  campaign_name: "",
  campaign_objective: "",
  campaign_status: "Completed",

  report_period_start: "",
  report_period_end: "",
  report_date: new Date().toISOString().split("T")[0],

  total_ad_spend: "",
  impressions: "",
  reach: "",
  frequency: "",
  link_clicks: "",
  ctr: "",
  cpc: "",
  cpm: "",

  total_leads: "",
  qualified_leads: "",
  contacted_leads: "",
  interested_leads: "",
  follow_up_leads: "",
  converted_customers: "",

  cost_per_lead: "",
  cost_per_qualified_lead: "",
  cost_per_customer: "",
  lead_to_customer_rate: "",

  planned_ad_budget: "",
  remaining_budget: "",

  what_worked_well: "",
  what_needs_improvement: "",
  audience_insights: "",
  creative_insights: "",
  lead_quality_insights: "",
  issues_observations: "",

  budget_recommendation: "",
  audience_changes: "",
  creative_changes: "",
  campaign_changes: "",
  retargeting_plan: "",
  landing_page_changes: "",
  lead_follow_up_recommendation: "",

  management_fee: "",
  total_client_billing: "",
};

const EMPTY_LEAD = {
  total_leads: "",
  qualified_leads: "",
  unqualified_leads: "",
  contacted_leads: "",
  interested_leads: "",
  follow_up_leads: "",
  converted_customers: "",
  lead_to_customer_rate: "",
  cost_per_lead: "",
  cost_per_qualified_lead: "",
  cost_per_customer: "",
  lead_quality: "",
  lead_quality_notes: "",
  notes: "",
};

const EMPTY_AD = {
  ad_name: "",
  ad_format: "",
  ad_status: "Active",
  ad_spend: "",
  reach: "",
  impressions: "",
  clicks: "",
  ctr: "",
  cpc: "",
  cpm: "",
  leads: "",
  cost_per_lead: "",
  creative_type: "",
  creative_notes: "",
};

const EMPTY_AUDIENCE = {
  audience_name: "",
  audience_type: "",
  age_group: "",
  gender: "",
  location: "",
  spend: "",
  reach: "",
  impressions: "",
  clicks: "",
  ctr: "",
  cpc: "",
  cpm: "",
  leads: "",
  cost_per_lead: "",
  performance_summary: "",
  notes: "",
};

const EMPTY_PLACEMENT = {
  placement_name: "",
  platform: "Instagram",
  placement_type: "",
  spend: "",
  reach: "",
  impressions: "",
  clicks: "",
  ctr: "",
  cpc: "",
  cpm: "",
  leads: "",
  cost_per_lead: "",
  performance_summary: "",
  notes: "",
};

function numberValue(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integerValue(value) {
  return Math.round(numberValue(value));
}

function money(value) {
  return `₹${numberValue(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function displayNumber(value) {
  return numberValue(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getClientName(client) {
  if (!client) return "Unknown Client";

  return (
    client.client_name ||
    client.name ||
    client.business_name ||
    client.company_name ||
    client.company ||
    client.clientName ||
    `Client ${client.id || ""}`
  );
}

function normalizeRow(row, emptyTemplate) {
  return {
    ...emptyTemplate,
    ...(row || {}),
  };
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  step,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          color: C.inkSoft,
          fontWeight: 500,
        }}
      >
        {label}
        {required && (
          <span style={{ color: C.danger, marginLeft: 3 }}>
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        style={{
          ...inputStyle,
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          color: C.inkSoft,
          fontWeight: 500,
        }}
      >
        {label}
        {required && (
          <span style={{ color: C.danger, marginLeft: 3 }}>
            *
          </span>
        )}
      </label>

      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 4,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          color: C.inkSoft,
          fontWeight: 500,
        }}
      >
        {label}
      </label>

      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...inputStyle,
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          lineHeight: 1.5,
        }}
      />
    </div>
  );
}

function SectionHeader({
  number,
  title,
  subtitle,
  open,
  onToggle,
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: C.primarySoft,
          color: C.primaryDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {number}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: C.ink,
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              fontSize: 11,
              color: C.inkFaint,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {open ? (
        <ChevronUp size={17} color={C.inkSoft} />
      ) : (
        <ChevronDown size={17} color={C.inkSoft} />
      )}
    </button>
  );
}

function RowDeleteButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Remove row"
      style={{
        width: 31,
        height: 31,
        borderRadius: 6,
        border: `1px solid ${C.border}`,
        background: C.panel,
        color: C.danger,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}

function ReportForm({
  report,
  setReport,
  lead,
  setLead,
  ads,
  setAds,
  audiences,
  setAudiences,
  placements,
  setPlacements,
  clients,
  onSave,
  onCancel,
  saving,
  editing,
}) {
  const [sections, setSections] = useState({
    client: true,
    metrics: true,
    leads: true,
    ads: true,
    audience: false,
    placements: false,
    analysis: true,
    strategy: true,
    budget: true,
  });

  const toggle = (key) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const updateReport = (key, value) => {
    setReport((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateLead = (key, value) => {
    setLead((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateAd = (index, key, value) => {
    setAds((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      )
    );
  };

  const updateAudience = (index, key, value) => {
    setAudiences((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      )
    );
  };

  const updatePlacement = (index, key, value) => {
    setPlacements((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      )
    );
  };

  const addAd = () => {
    setAds((prev) => [
      ...prev,
      { ...EMPTY_AD },
    ]);
  };

  const addAudience = () => {
    setAudiences((prev) => [
      ...prev,
      { ...EMPTY_AUDIENCE },
    ]);
  };

  const addPlacement = () => {
    setPlacements((prev) => [
      ...prev,
      { ...EMPTY_PLACEMENT },
    ]);
  };

  const removeAd = (index) => {
    setAds((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const removeAudience = (index) => {
    setAudiences((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const removePlacement = (index) => {
    setPlacements((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  return (
    <div>
      <PageHeader
        title={
          editing
            ? "Edit Meta Ads Report"
            : "Create Meta Ads Report"
        }
        subtitle="Enter campaign performance data and save the report to the CRM."
      >
        <Button
          variant="ghost"
          icon={ArrowLeft}
          onClick={onCancel}
        >
          Back to Reports
        </Button>
      </PageHeader>

      <form onSubmit={onSave}>
        {/* 1. CLIENT & CAMPAIGN */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="1"
            title="Client & Campaign Information"
            subtitle="Basic information about the Meta Ads campaign."
            open={sections.client}
            onToggle={() => toggle("client")}
          />

          {sections.client && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 14,
              }}
            >
              <SelectField
                label="Client"
                value={report.client_id}
                onChange={(value) =>
                  updateReport(
                    "client_id",
                    value
                  )
                }
                required
                options={[
                  {
                    value: "",
                    label: "Select client",
                  },
                  ...clients.map((client) => ({
                    value: String(client.id),
                    label: getClientName(client),
                  })),
                ]}
              />

              <InputField
                label="Campaign Name"
                value={report.campaign_name}
                onChange={(value) =>
                  updateReport(
                    "campaign_name",
                    value
                  )
                }
                required
                placeholder="e.g. Latur Gym Lead Campaign"
              />

              <SelectField
                label="Campaign Objective"
                value={
                  report.campaign_objective
                }
                onChange={(value) =>
                  updateReport(
                    "campaign_objective",
                    value
                  )
                }
                options={[
                  {
                    value: "",
                    label: "Select objective",
                  },
                  {
                    value: "Leads",
                    label: "Leads",
                  },
                  {
                    value: "Sales",
                    label: "Sales",
                  },
                  {
                    value: "Traffic",
                    label: "Traffic",
                  },
                  {
                    value: "Engagement",
                    label: "Engagement",
                  },
                  {
                    value: "Awareness",
                    label: "Awareness",
                  },
                  {
                    value: "Conversions",
                    label: "Conversions",
                  },
                  {
                    value: "Messages",
                    label: "Messages",
                  },
                  {
                    value: "Other",
                    label: "Other",
                  },
                ]}
              />

              <SelectField
                label="Campaign Status"
                value={report.campaign_status}
                onChange={(value) =>
                  updateReport(
                    "campaign_status",
                    value
                  )
                }
                options={[
                  {
                    value: "Completed",
                    label: "Completed",
                  },
                  
                ]}
              />

              <InputField
                label="Report Period Start"
                type="date"
                value={
                  report.report_period_start
                }
                onChange={(value) =>
                  updateReport(
                    "report_period_start",
                    value
                  )
                }
                required
              />

              <InputField
                label="Report Period End"
                type="date"
                value={
                  report.report_period_end
                }
                onChange={(value) =>
                  updateReport(
                    "report_period_end",
                    value
                  )
                }
                required
              />

              <InputField
                label="Report Date"
                type="date"
                value={report.report_date}
                onChange={(value) =>
                  updateReport(
                    "report_date",
                    value
                  )
                }
              />
            </div>
          )}
        </Panel>

        {/* 2. CAMPAIGN METRICS */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="2"
            title="Campaign Performance"
            subtitle="Overall Meta Ads campaign metrics."
            open={sections.metrics}
            onToggle={() => toggle("metrics")}
          />

          {sections.metrics && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
              }}
            >
              <InputField
                label="Total Ad Spend"
                type="number"
                step="0.01"
                value={
                  report.total_ad_spend
                }
                onChange={(value) =>
                  updateReport(
                    "total_ad_spend",
                    value
                  )
                }
              />

              <InputField
                label="Impressions"
                type="number"
                value={
                  report.impressions
                }
                onChange={(value) =>
                  updateReport(
                    "impressions",
                    value
                  )
                }
              />

              <InputField
                label="Reach"
                type="number"
                value={report.reach}
                onChange={(value) =>
                  updateReport(
                    "reach",
                    value
                  )
                }
              />

              <InputField
                label="Frequency"
                type="number"
                step="0.01"
                value={
                  report.frequency
                }
                onChange={(value) =>
                  updateReport(
                    "frequency",
                    value
                  )
                }
              />

              <InputField
                label="Link Clicks"
                type="number"
                value={
                  report.link_clicks
                }
                onChange={(value) =>
                  updateReport(
                    "link_clicks",
                    value
                  )
                }
              />

              <InputField
                label="CTR (%)"
                type="number"
                step="0.01"
                value={report.ctr}
                onChange={(value) =>
                  updateReport(
                    "ctr",
                    value
                  )
                }
              />

              <InputField
                label="CPC (₹)"
                type="number"
                step="0.01"
                value={report.cpc}
                onChange={(value) =>
                  updateReport(
                    "cpc",
                    value
                  )
                }
              />

              <InputField
                label="CPM (₹)"
                type="number"
                step="0.01"
                value={report.cpm}
                onChange={(value) =>
                  updateReport(
                    "cpm",
                    value
                  )
                }
              />

              <InputField
                label="Total Leads"
                type="number"
                value={report.total_leads}
                onChange={(value) =>
                  updateReport(
                    "total_leads",
                    value
                  )
                }
              />

              <InputField
                label="Cost Per Lead (₹)"
                type="number"
                step="0.01"
                value={
                  report.cost_per_lead
                }
                onChange={(value) =>
                  updateReport(
                    "cost_per_lead",
                    value
                  )
                }
              />

              <InputField
                label="Planned Ad Budget"
                type="number"
                step="0.01"
                value={
                  report.planned_ad_budget
                }
                onChange={(value) =>
                  updateReport(
                    "planned_ad_budget",
                    value
                  )
                }
              />

              <InputField
                label="Remaining Budget"
                type="number"
                step="0.01"
                value={
                  report.remaining_budget
                }
                onChange={(value) =>
                  updateReport(
                    "remaining_budget",
                    value
                  )
                }
              />
            </div>
          )}
        </Panel>

        {/* 3. LEAD PERFORMANCE */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="3"
            title="Lead Performance"
            subtitle="Lead quality and conversion funnel."
            open={sections.leads}
            onToggle={() => toggle("leads")}
          />

          {sections.leads && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
              }}
            >
              <InputField
                label="Total Leads"
                type="number"
                value={lead.total_leads}
                onChange={(value) =>
                  updateLead(
                    "total_leads",
                    value
                  )
                }
              />

              <InputField
                label="Qualified Leads"
                type="number"
                value={
                  lead.qualified_leads
                }
                onChange={(value) =>
                  updateLead(
                    "qualified_leads",
                    value
                  )
                }
              />

              <InputField
                label="Unqualified Leads"
                type="number"
                value={
                  lead.unqualified_leads
                }
                onChange={(value) =>
                  updateLead(
                    "unqualified_leads",
                    value
                  )
                }
              />

              <InputField
                label="Contacted Leads"
                type="number"
                value={
                  lead.contacted_leads
                }
                onChange={(value) =>
                  updateLead(
                    "contacted_leads",
                    value
                  )
                }
              />

              <InputField
                label="Interested Leads"
                type="number"
                value={
                  lead.interested_leads
                }
                onChange={(value) =>
                  updateLead(
                    "interested_leads",
                    value
                  )
                }
              />

              <InputField
                label="Follow-up Leads"
                type="number"
                value={
                  lead.follow_up_leads
                }
                onChange={(value) =>
                  updateLead(
                    "follow_up_leads",
                    value
                  )
                }
              />

              <InputField
                label="Converted Customers"
                type="number"
                value={
                  lead.converted_customers
                }
                onChange={(value) =>
                  updateLead(
                    "converted_customers",
                    value
                  )
                }
              />

              <InputField
                label="Lead to Customer Rate (%)"
                type="number"
                step="0.01"
                value={
                  lead.lead_to_customer_rate
                }
                onChange={(value) =>
                  updateLead(
                    "lead_to_customer_rate",
                    value
                  )
                }
              />

              <InputField
                label="Cost Per Lead (₹)"
                type="number"
                step="0.01"
                value={
                  lead.cost_per_lead
                }
                onChange={(value) =>
                  updateLead(
                    "cost_per_lead",
                    value
                  )
                }
              />

              <InputField
                label="Cost Per Qualified Lead (₹)"
                type="number"
                step="0.01"
                value={
                  lead.cost_per_qualified_lead
                }
                onChange={(value) =>
                  updateLead(
                    "cost_per_qualified_lead",
                    value
                  )
                }
              />

              <InputField
                label="Cost Per Customer (₹)"
                type="number"
                step="0.01"
                value={
                  lead.cost_per_customer
                }
                onChange={(value) =>
                  updateLead(
                    "cost_per_customer",
                    value
                  )
                }
              />

              <SelectField
                label="Lead Quality"
                value={lead.lead_quality}
                onChange={(value) =>
                  updateLead(
                    "lead_quality",
                    value
                  )
                }
                options={[
                  {
                    value: "",
                    label: "Select quality",
                  },
                  {
                    value: "Excellent",
                    label: "Excellent",
                  },
                  {
                    value: "Good",
                    label: "Good",
                  },
                  {
                    value: "Average",
                    label: "Average",
                  },
                  {
                    value: "Poor",
                    label: "Poor",
                  },
                ]}
              />

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <TextAreaField
                  label="Lead Quality Notes"
                  value={
                    lead.lead_quality_notes
                  }
                  onChange={(value) =>
                    updateLead(
                      "lead_quality_notes",
                      value
                    )
                  }
                  placeholder="Explain lead quality, common issues, qualification observations..."
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <TextAreaField
                  label="Lead Performance Notes"
                  value={lead.notes}
                  onChange={(value) =>
                    updateLead(
                      "notes",
                      value
                    )
                  }
                />
              </div>
            </div>
          )}
        </Panel>

        {/* 4. AD PERFORMANCE */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="4"
            title="Ad / Creative Performance"
            subtitle="Add individual Meta Ads and compare their performance."
            open={sections.ads}
            onToggle={() => toggle("ads")}
          />

          {sections.ads && (
            <div style={{ marginTop: 18 }}>
              {ads.map((ad, index) => (
                <div
                  key={index}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 12,
                    background: C.bg,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Ad / Creative {index + 1}
                    </div>

                    {ads.length > 1 && (
                      <RowDeleteButton
                        onClick={() =>
                          removeAd(index)
                        }
                      />
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <InputField
                      label="Ad Name"
                      value={ad.ad_name}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "ad_name",
                          value
                        )
                      }
                      required
                      placeholder="Creative 01"
                    />

                    <SelectField
                      label="Ad Format"
                      value={ad.ad_format}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "ad_format",
                          value
                        )
                      }
                      options={[
                        {
                          value: "",
                          label: "Select format",
                        },
                        {
                          value: "Image",
                          label: "Image",
                        },
                        {
                          value: "Video",
                          label: "Video",
                        },
                        {
                          value: "Reel",
                          label: "Reel",
                        },
                        {
                          value: "Carousel",
                          label: "Carousel",
                        },
                        {
                          value: "Story",
                          label: "Story",
                        },
                      ]}
                    />

                    <SelectField
                      label="Ad Status"
                      value={ad.ad_status}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "ad_status",
                          value
                        )
                      }
                      options={[
                        {
                          value: "Active",
                          label: "Active",
                        },
                        {
                          value: "Paused",
                          label: "Paused",
                        },
                        {
                          value: "Completed",
                          label: "Completed",
                        },
                      ]}
                    />

                    <InputField
                      label="Spend (₹)"
                      type="number"
                      step="0.01"
                      value={ad.ad_spend}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "ad_spend",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Reach"
                      type="number"
                      value={ad.reach}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "reach",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Impressions"
                      type="number"
                      value={ad.impressions}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "impressions",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Clicks"
                      type="number"
                      value={ad.clicks}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "clicks",
                          value
                        )
                      }
                    />

                    <InputField
                      label="CTR (%)"
                      type="number"
                      step="0.01"
                      value={ad.ctr}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "ctr",
                          value
                        )
                      }
                    />

                    <InputField
                      label="CPC (₹)"
                      type="number"
                      step="0.01"
                      value={ad.cpc}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "cpc",
                          value
                        )
                      }
                    />

                    <InputField
                      label="CPM (₹)"
                      type="number"
                      step="0.01"
                      value={ad.cpm}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "cpm",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Leads"
                      type="number"
                      value={ad.leads}
                      onChange={(value) =>
                        updateAd(
                          index,
                          "leads",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Cost Per Lead (₹)"
                      type="number"
                      step="0.01"
                      value={
                        ad.cost_per_lead
                      }
                      onChange={(value) =>
                        updateAd(
                          index,
                          "cost_per_lead",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Creative Type"
                      value={
                        ad.creative_type
                      }
                      onChange={(value) =>
                        updateAd(
                          index,
                          "creative_type",
                          value
                        )
                      }
                      placeholder="UGC / Product / Offer"
                    />

                    <div
                      style={{
                        gridColumn: "1 / -1",
                      }}
                    >
                      <TextAreaField
                        label="Creative Notes"
                        value={
                          ad.creative_notes
                        }
                        onChange={(value) =>
                          updateAd(
                            index,
                            "creative_notes",
                            value
                          )
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={addAd}
              >
                Add Another Ad
              </Button>
            </div>
          )}
        </Panel>

        {/* 5. AUDIENCE */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="5"
            title="Audience Performance"
            subtitle="Age, gender, location and audience-type performance."
            open={sections.audience}
            onToggle={() => toggle("audience")}
          />

          {sections.audience && (
            <div style={{ marginTop: 18 }}>
              {audiences.map(
                (audience, index) => (
                  <div
                    key={index}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 14,
                      marginBottom: 12,
                      background: C.bg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Audience {index + 1}
                      </div>

                      {audiences.length > 1 && (
                        <RowDeleteButton
                          onClick={() =>
                            removeAudience(
                              index
                            )
                          }
                        />
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <InputField
                        label="Audience Name"
                        value={
                          audience.audience_name
                        }
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "audience_name",
                            value
                          )
                        }
                        placeholder="Latur Gym Interest"
                      />

                      <SelectField
                        label="Audience Type"
                        value={
                          audience.audience_type
                        }
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "audience_type",
                            value
                          )
                        }
                        options={[
                          {
                            value: "",
                            label: "Select type",
                          },
                          {
                            value: "Broad",
                            label: "Broad",
                          },
                          {
                            value: "Interest",
                            label: "Interest",
                          },
                          {
                            value: "Lookalike",
                            label: "Lookalike",
                          },
                          {
                            value: "Retargeting",
                            label: "Retargeting",
                          },
                          {
                            value: "Custom",
                            label: "Custom",
                          },
                        ]}
                      />

                      <InputField
                        label="Age Group"
                        value={
                          audience.age_group
                        }
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "age_group",
                            value
                          )
                        }
                        placeholder="18-24"
                      />

                      <SelectField
                        label="Gender"
                        value={
                          audience.gender
                        }
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "gender",
                            value
                          )
                        }
                        options={[
                          {
                            value: "",
                            label: "Select gender",
                          },
                          {
                            value: "All",
                            label: "All",
                          },
                          {
                            value: "Male",
                            label: "Male",
                          },
                          {
                            value: "Female",
                            label: "Female",
                          },
                        ]}
                      />

                      <InputField
                        label="Location"
                        value={
                          audience.location
                        }
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "location",
                            value
                          )
                        }
                        placeholder="Latur"
                      />

                      <InputField
                        label="Spend (₹)"
                        type="number"
                        step="0.01"
                        value={audience.spend}
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "spend",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Reach"
                        type="number"
                        value={audience.reach}
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "reach",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Impressions"
                        type="number"
                        value={
                          audience.impressions
                        }
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "impressions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Clicks"
                        type="number"
                        value={audience.clicks}
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "clicks",
                            value
                          )
                        }
                      />

                      <InputField
                        label="CTR (%)"
                        type="number"
                        step="0.01"
                        value={audience.ctr}
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "ctr",
                            value
                          )
                        }
                      />

                      <InputField
                        label="CPC (₹)"
                        type="number"
                        step="0.01"
                        value={audience.cpc}
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "cpc",
                            value
                          )
                        }
                      />

                      <InputField
                        label="CPM (₹)"
                        type="number"
                        step="0.01"
                        value={audience.cpm}
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "cpm",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Leads"
                        type="number"
                        value={audience.leads}
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "leads",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Cost Per Lead (₹)"
                        type="number"
                        step="0.01"
                        value={
                          audience.cost_per_lead
                        }
                        onChange={(value) =>
                          updateAudience(
                            index,
                            "cost_per_lead",
                            value
                          )
                        }
                      />

                      <div
                        style={{
                          gridColumn: "1 / -1",
                        }}
                      >
                        <TextAreaField
                          label="Performance Summary"
                          value={
                            audience.performance_summary
                          }
                          onChange={(value) =>
                            updateAudience(
                              index,
                              "performance_summary",
                              value
                            )
                          }
                          rows={3}
                        />
                      </div>

                      <div
                        style={{
                          gridColumn: "1 / -1",
                        }}
                      >
                        <TextAreaField
                          label="Notes"
                          value={audience.notes}
                          onChange={(value) =>
                            updateAudience(
                              index,
                              "notes",
                              value
                            )
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )
              )}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={addAudience}
              >
                Add Another Audience
              </Button>
            </div>
          )}
        </Panel>

        {/* 6. PLACEMENT */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="6"
            title="Placement Performance"
            subtitle="Facebook and Instagram placement-level performance."
            open={sections.placements}
            onToggle={() =>
              toggle("placements")
            }
          />

          {sections.placements && (
            <div style={{ marginTop: 18 }}>
              {placements.map(
                (placement, index) => (
                  <div
                    key={index}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 14,
                      marginBottom: 12,
                      background: C.bg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Placement {index + 1}
                      </div>

                      {placements.length > 1 && (
                        <RowDeleteButton
                          onClick={() =>
                            removePlacement(
                              index
                            )
                          }
                        />
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <InputField
                        label="Placement Name"
                        value={
                          placement.placement_name
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "placement_name",
                            value
                          )
                        }
                        required
                        placeholder="Instagram Reels"
                      />

                      <SelectField
                        label="Platform"
                        value={
                          placement.platform
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "platform",
                            value
                          )
                        }
                        options={[
                          {
                            value: "Instagram",
                            label: "Instagram",
                          },
                          {
                            value: "Facebook",
                            label: "Facebook",
                          },
                          {
                            value: "Messenger",
                            label: "Messenger",
                          },
                          {
                            value:
                              "Audience Network",
                            label:
                              "Audience Network",
                          },
                        ]}
                      />

                      <InputField
                        label="Placement Type"
                        value={
                          placement.placement_type
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "placement_type",
                            value
                          )
                        }
                        placeholder="Feed / Reels / Stories"
                      />

                      <InputField
                        label="Spend (₹)"
                        type="number"
                        step="0.01"
                        value={
                          placement.spend
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "spend",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Reach"
                        type="number"
                        value={
                          placement.reach
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "reach",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Impressions"
                        type="number"
                        value={
                          placement.impressions
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "impressions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Clicks"
                        type="number"
                        value={
                          placement.clicks
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "clicks",
                            value
                          )
                        }
                      />

                      <InputField
                        label="CTR (%)"
                        type="number"
                        step="0.01"
                        value={
                          placement.ctr
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "ctr",
                            value
                          )
                        }
                      />

                      <InputField
                        label="CPC (₹)"
                        type="number"
                        step="0.01"
                        value={
                          placement.cpc
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "cpc",
                            value
                          )
                        }
                      />

                      <InputField
                        label="CPM (₹)"
                        type="number"
                        step="0.01"
                        value={
                          placement.cpm
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "cpm",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Leads"
                        type="number"
                        value={
                          placement.leads
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "leads",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Cost Per Lead (₹)"
                        type="number"
                        step="0.01"
                        value={
                          placement.cost_per_lead
                        }
                        onChange={(value) =>
                          updatePlacement(
                            index,
                            "cost_per_lead",
                            value
                          )
                        }
                      />

                      <div
                        style={{
                          gridColumn: "1 / -1",
                        }}
                      >
                        <TextAreaField
                          label="Performance Summary"
                          value={
                            placement.performance_summary
                          }
                          onChange={(value) =>
                            updatePlacement(
                              index,
                              "performance_summary",
                              value
                            )
                          }
                          rows={3}
                        />
                      </div>

                      <div
                        style={{
                          gridColumn: "1 / -1",
                        }}
                      >
                        <TextAreaField
                          label="Notes"
                          value={
                            placement.notes
                          }
                          onChange={(value) =>
                            updatePlacement(
                              index,
                              "notes",
                              value
                            )
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )
              )}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={addPlacement}
              >
                Add Another Placement
              </Button>
            </div>
          )}
        </Panel>

        {/* 7. ANALYSIS */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="7"
            title="Campaign Analysis"
            subtitle="Manual professional observations prepared by RUVIGZA."
            open={sections.analysis}
            onToggle={() => toggle("analysis")}
          />

          {sections.analysis && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              <TextAreaField
                label="What Worked Well"
                value={
                  report.what_worked_well
                }
                onChange={(value) =>
                  updateReport(
                    "what_worked_well",
                    value
                  )
                }
                placeholder="Mention successful creatives, audiences, placements, offers, etc."
              />

              <TextAreaField
                label="What Needs Improvement"
                value={
                  report.what_needs_improvement
                }
                onChange={(value) =>
                  updateReport(
                    "what_needs_improvement",
                    value
                  )
                }
              />

              <TextAreaField
                label="Audience Insights"
                value={
                  report.audience_insights
                }
                onChange={(value) =>
                  updateReport(
                    "audience_insights",
                    value
                  )
                }
              />

              <TextAreaField
                label="Creative Insights"
                value={
                  report.creative_insights
                }
                onChange={(value) =>
                  updateReport(
                    "creative_insights",
                    value
                  )
                }
              />

              <TextAreaField
                label="Lead Quality Insights"
                value={
                  report.lead_quality_insights
                }
                onChange={(value) =>
                  updateReport(
                    "lead_quality_insights",
                    value
                  )
                }
              />

              <TextAreaField
                label="Issues / Observations"
                value={
                  report.issues_observations
                }
                onChange={(value) =>
                  updateReport(
                    "issues_observations",
                    value
                  )
                }
              />
            </div>
          )}
        </Panel>

        {/* 8. NEXT PHASE STRATEGY */}
        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="8"
            title="Next Phase Strategy"
            subtitle="Recommendations for the next campaign phase."
            open={sections.strategy}
            onToggle={() => toggle("strategy")}
          />

          {sections.strategy && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              <TextAreaField
                label="Budget Recommendation"
                value={
                  report.budget_recommendation
                }
                onChange={(value) =>
                  updateReport(
                    "budget_recommendation",
                    value
                  )
                }
              />

              <TextAreaField
                label="Audience Changes"
                value={
                  report.audience_changes
                }
                onChange={(value) =>
                  updateReport(
                    "audience_changes",
                    value
                  )
                }
              />

              <TextAreaField
                label="Creative Changes"
                value={
                  report.creative_changes
                }
                onChange={(value) =>
                  updateReport(
                    "creative_changes",
                    value
                  )
                }
              />

              <TextAreaField
                label="Campaign Changes"
                value={
                  report.campaign_changes
                }
                onChange={(value) =>
                  updateReport(
                    "campaign_changes",
                    value
                  )
                }
              />

              <TextAreaField
                label="Retargeting Plan"
                value={
                  report.retargeting_plan
                }
                onChange={(value) =>
                  updateReport(
                    "retargeting_plan",
                    value
                  )
                }
              />

              <TextAreaField
                label="Landing Page Changes"
                value={
                  report.landing_page_changes
                }
                onChange={(value) =>
                  updateReport(
                    "landing_page_changes",
                    value
                  )
                }
              />

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <TextAreaField
                  label="Lead Follow-up Recommendation"
                  value={
                    report.lead_follow_up_recommendation
                  }
                  onChange={(value) =>
                    updateReport(
                      "lead_follow_up_recommendation",
                      value
                    )
                  }
                />
              </div>
            </div>
          )}
        </Panel>

        {/* 9. BUDGET */}
        <Panel style={{ marginBottom: 18 }}>
          <SectionHeader
            number="9"
            title="Budget & Billing Summary"
            subtitle="Keep advertising spend and RUVIGZA management fee separate."
            open={sections.budget}
            onToggle={() => toggle("budget")}
          />

          {sections.budget && (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <InputField
                label="Planned Ad Budget"
                type="number"
                step="0.01"
                value={
                  report.planned_ad_budget
                }
                onChange={(value) =>
                  updateReport(
                    "planned_ad_budget",
                    value
                  )
                }
              />

              <InputField
                label="Actual Ad Spend"
                type="number"
                step="0.01"
                value={
                  report.total_ad_spend
                }
                onChange={(value) =>
                  updateReport(
                    "total_ad_spend",
                    value
                  )
                }
              />

              <InputField
                label="Remaining Budget"
                type="number"
                step="0.01"
                value={
                  report.remaining_budget
                }
                onChange={(value) =>
                  updateReport(
                    "remaining_budget",
                    value
                  )
                }
              />

              <InputField
                label="RUVIGZA Management Fee"
                type="number"
                step="0.01"
                value={
                  report.management_fee
                }
                onChange={(value) =>
                  updateReport(
                    "management_fee",
                    value
                  )
                }
              />

              <InputField
                label="Total Client Billing"
                type="number"
                step="0.01"
                value={
                  report.total_client_billing
                }
                onChange={(value) =>
                  updateReport(
                    "total_client_billing",
                    value
                  )
                }
              />
            </div>
          )}
        </Panel>

        {/* SAVE ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            paddingBottom: 30,
          }}
        >
          <Button
            variant="ghost"
            icon={X}
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            icon={Save}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editing
              ? "Update Report"
              : "Save Report"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ReportView({
  report,
  client,
  lead,
  ads,
  audiences,
  placements,
  onBack,
  onEdit,
}) {
  const clientName = getClientName(client);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="meta-report-view">
      <div className="meta-report-print-actions">
        <PageHeader
          title="Meta Ads Report"
          subtitle={`${clientName} • ${report.campaign_name}`}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={onBack}
            >
              Back
            </Button>

            <Button
              variant="ghost"
              icon={Edit3}
              onClick={onEdit}
            >
              Edit
            </Button>

            <Button
              icon={Download}
              onClick={handlePrint}
            >
              Download / Print PDF
            </Button>
          </div>
        </PageHeader>
      </div>

      <div
        className="meta-report-document"
        style={{
          background: "#fff",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* REPORT HEADER */}
        <div
          style={{
            padding: "26px 28px",
            background: C.primaryDeep,
            color: "#fff",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              opacity: 0.75,
              fontWeight: 600,
            }}
          >
            RUVIGZA DIGITAL TECHNOLOGIES
          </div>

          <div
            style={{
              fontFamily:
                "'Space Grotesk', sans-serif",
              fontSize: 25,
              fontWeight: 600,
              marginTop: 8,
            }}
          >
            Meta Ads Campaign Report
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              opacity: 0.9,
            }}
          >
            {clientName}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              opacity: 0.7,
            }}
          >
            {report.campaign_name}
          </div>
        </div>

        {/* BASIC INFO */}
        <div style={{ padding: 22 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <InfoBox
              label="Campaign Objective"
              value={
                report.campaign_objective ||
                "—"
              }
            />

            <InfoBox
              label="Campaign Status"
              value={
                report.campaign_status ||
                "—"
              }
            />

            <InfoBox
              label="Report Period"
              value={`${report.report_period_start || "—"} → ${
                report.report_period_end || "—"
              }`}
            />

            <InfoBox
              label="Report Date"
              value={
                report.report_date || "—"
              }
            />
          </div>

          {/* EXECUTIVE METRICS */}
          <ReportSectionTitle>
            Campaign Summary
          </ReportSectionTitle>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            <MetricBox
              label="Ad Spend"
              value={money(
                report.total_ad_spend
              )}
            />

            <MetricBox
              label="Reach"
              value={displayNumber(
                report.reach
              )}
            />

            <MetricBox
              label="Impressions"
              value={displayNumber(
                report.impressions
              )}
            />

            <MetricBox
              label="Clicks"
              value={displayNumber(
                report.link_clicks
              )}
            />

            <MetricBox
              label="CTR"
              value={`${displayNumber(
                report.ctr
              )}%`}
            />

            <MetricBox
              label="CPC"
              value={money(report.cpc)}
            />

            <MetricBox
              label="CPM"
              value={money(report.cpm)}
            />

            <MetricBox
              label="Leads"
              value={displayNumber(
                report.total_leads
              )}
            />

            <MetricBox
              label="CPL"
              value={money(
                report.cost_per_lead
              )}
            />

            <MetricBox
              label="Customers"
              value={displayNumber(
                report.converted_customers
              )}
            />
          </div>

          {/* LEAD FUNNEL */}
          <ReportSectionTitle>
            Lead Funnel
          </ReportSectionTitle>

          <DataTable
            columns={[
              "Total Leads",
              "Qualified",
              "Contacted",
              "Interested",
              "Follow-up",
              "Converted",
              "Conversion Rate",
            ]}
            rows={[
              [
                displayNumber(
                  lead?.total_leads
                ),
                displayNumber(
                  lead?.qualified_leads
                ),
                displayNumber(
                  lead?.contacted_leads
                ),
                displayNumber(
                  lead?.interested_leads
                ),
                displayNumber(
                  lead?.follow_up_leads
                ),
                displayNumber(
                  lead?.converted_customers
                ),
                `${displayNumber(
                  lead?.lead_to_customer_rate
                )}%`,
              ],
            ]}
          />

          {lead?.lead_quality && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: C.inkSoft,
              }}
            >
              <strong>Lead Quality:</strong>{" "}
              {lead.lead_quality}
            </div>
          )}

          {lead?.lead_quality_notes && (
            <ReportText
              title="Lead Quality Notes"
              text={
                lead.lead_quality_notes
              }
            />
          )}

          {/* ADS */}
          <ReportSectionTitle>
            Ad / Creative Performance
          </ReportSectionTitle>

          {ads.length > 0 ? (
            <DataTable
              columns={[
                "Ad",
                "Format",
                "Spend",
                "Reach",
                "Impressions",
                "Clicks",
                "CTR",
                "Leads",
                "CPL",
              ]}
              rows={ads.map((ad) => [
                ad.ad_name || "—",
                ad.ad_format || "—",
                money(ad.ad_spend),
                displayNumber(ad.reach),
                displayNumber(
                  ad.impressions
                ),
                displayNumber(ad.clicks),
                `${displayNumber(ad.ctr)}%`,
                displayNumber(ad.leads),
                money(ad.cost_per_lead),
              ])}
            />
          ) : (
            <EmptyNote text="No ad performance rows added." />
          )}

          {/* AUDIENCE */}
          {audiences.length > 0 && (
            <>
              <ReportSectionTitle>
                Audience Performance
              </ReportSectionTitle>

              <DataTable
                columns={[
                  "Audience",
                  "Type",
                  "Age",
                  "Gender",
                  "Location",
                  "Spend",
                  "Leads",
                  "CPL",
                ]}
                rows={audiences.map(
                  (audience) => [
                    audience.audience_name ||
                      "—",
                    audience.audience_type ||
                      "—",
                    audience.age_group ||
                      "—",
                    audience.gender ||
                      "—",
                    audience.location ||
                      "—",
                    money(audience.spend),
                    displayNumber(
                      audience.leads
                    ),
                    money(
                      audience.cost_per_lead
                    ),
                  ]
                )}
              />
            </>
          )}

          {/* PLACEMENTS */}
          {placements.length > 0 && (
            <>
              <ReportSectionTitle>
                Placement Performance
              </ReportSectionTitle>

              <DataTable
                columns={[
                  "Placement",
                  "Platform",
                  "Spend",
                  "Reach",
                  "Impressions",
                  "Clicks",
                  "CTR",
                  "Leads",
                  "CPL",
                ]}
                rows={placements.map(
                  (placement) => [
                    placement.placement_name ||
                      "—",
                    placement.platform ||
                      "—",
                    money(placement.spend),
                    displayNumber(
                      placement.reach
                    ),
                    displayNumber(
                      placement.impressions
                    ),
                    displayNumber(
                      placement.clicks
                    ),
                    `${displayNumber(
                      placement.ctr
                    )}%`,
                    displayNumber(
                      placement.leads
                    ),
                    money(
                      placement.cost_per_lead
                    ),
                  ]
                )}
              />
            </>
          )}

          {/* ANALYSIS */}
          <ReportSectionTitle>
            Campaign Analysis
          </ReportSectionTitle>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            <ReportText
              title="What Worked Well"
              text={
                report.what_worked_well
              }
            />

            <ReportText
              title="What Needs Improvement"
              text={
                report.what_needs_improvement
              }
            />

            <ReportText
              title="Audience Insights"
              text={
                report.audience_insights
              }
            />

            <ReportText
              title="Creative Insights"
              text={
                report.creative_insights
              }
            />

            <ReportText
              title="Lead Quality Insights"
              text={
                report.lead_quality_insights
              }
            />

            <ReportText
              title="Issues / Observations"
              text={
                report.issues_observations
              }
            />
          </div>

          {/* STRATEGY */}
          <ReportSectionTitle>
            Next Phase Strategy
          </ReportSectionTitle>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            <ReportText
              title="Budget Recommendation"
              text={
                report.budget_recommendation
              }
            />

            <ReportText
              title="Audience Changes"
              text={
                report.audience_changes
              }
            />

            <ReportText
              title="Creative Changes"
              text={
                report.creative_changes
              }
            />

            <ReportText
              title="Campaign Changes"
              text={
                report.campaign_changes
              }
            />

            <ReportText
              title="Retargeting Plan"
              text={
                report.retargeting_plan
              }
            />

            <ReportText
              title="Landing Page Changes"
              text={
                report.landing_page_changes
              }
            />

            <ReportText
              title="Lead Follow-up Recommendation"
              text={
                report.lead_follow_up_recommendation
              }
            />
          </div>

          {/* BUDGET */}
          <ReportSectionTitle>
            Budget & Billing
          </ReportSectionTitle>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
            }}
          >
            <MetricBox
              label="Planned Ad Budget"
              value={money(
                report.planned_ad_budget
              )}
            />

            <MetricBox
              label="Actual Ad Spend"
              value={money(
                report.total_ad_spend
              )}
            />

            <MetricBox
              label="Remaining Budget"
              value={money(
                report.remaining_budget
              )}
            />

            <MetricBox
              label="RUVIGZA Management Fee"
              value={money(
                report.management_fee
              )}
            />

            <MetricBox
              label="Total Client Billing"
              value={money(
                report.total_client_billing
              )}
            />
          </div>

          <div
            style={{
              marginTop: 28,
              paddingTop: 15,
              borderTop: `1px solid ${C.border}`,
              fontSize: 10,
              color: C.inkFaint,
              textAlign: "center",
            }}
          >
            RUVIGZA Digital Technologies • Meta Ads Campaign Report
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          .admin-sidebar,
          .admin-mobile-header,
          .meta-report-print-actions {
            display: none !important;
          }

          .admin-main {
            margin-left: 0 !important;
            padding: 0 !important;
          }

          .meta-report-document {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }

        @media (max-width: 700px) {
          .meta-report-document {
            border-radius: 7px !important;
          }
        }
      `}</style>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.borderSoft}`,
        borderRadius: 7,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.inkFaint,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.ink,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 7,
        padding: 13,
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.inkFaint,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily:
            "'IBM Plex Mono', monospace",
          fontSize: 16,
          fontWeight: 500,
          color: C.primaryDeep,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ReportSectionTitle({ children }) {
  return (
    <div
      style={{
        marginTop: 24,
        marginBottom: 10,
        paddingBottom: 7,
        borderBottom: `1px solid ${C.border}`,
        fontSize: 14,
        fontWeight: 600,
        color: C.primaryDeep,
      }}
    >
      {children}
    </div>
  );
}

function ReportText({ title, text }) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.borderSoft}`,
        borderRadius: 7,
        padding: 13,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.ink,
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          color: C.inkSoft,
          whiteSpace: "pre-wrap",
        }}
      >
        {text || "—"}
      </div>
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${C.border}`,
        borderRadius: 7,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 11,
          minWidth: 650,
        }}
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                style={{
                  padding: "9px 10px",
                  background: C.bg,
                  borderBottom: `1px solid ${C.border}`,
                  textAlign: "left",
                  fontWeight: 600,
                  color: C.inkSoft,
                  whiteSpace: "nowrap",
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    padding: "9px 10px",
                    borderBottom:
                      rowIndex === rows.length - 1
                        ? "none"
                        : `1px solid ${C.borderSoft}`,
                    color: C.ink,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MetaAdsReports() {
  const [mode, setMode] = useState("list");

  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [report, setReport] = useState({
    ...EMPTY_REPORT,
  });

  const [lead, setLead] = useState({
    ...EMPTY_LEAD,
  });

  const [ads, setAds] = useState([
    { ...EMPTY_AD },
  ]);

  const [audiences, setAudiences] =
    useState([
      { ...EMPTY_AUDIENCE },
    ]);

  const [placements, setPlacements] =
    useState([
      { ...EMPTY_PLACEMENT },
    ]);

  const [selectedReport, setSelectedReport] =
    useState(null);

  const [selectedLead, setSelectedLead] =
    useState(null);

  const [selectedAds, setSelectedAds] =
    useState([]);

  const [selectedAudiences, setSelectedAudiences] =
    useState([]);

  const [selectedPlacements, setSelectedPlacements] =
    useState([]);

 const loadClients = async () => {
  try {
    const { data, error } = await supabase
      .from("client_service_assignments")
      .select(`
        id,
        lead_id,
        service_type,
        status,
        created_at,
        leads (
          id,
          name
        )
      `)
      .eq("status", "Completed")
      .eq("service_type", "meta_ads")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Completed Meta Ads clients fetch error:",
        error
      );

      setClients([]);
      return;
    }

    const completedClients = (data || [])
      .map((assignment) => ({
        id: assignment.lead_id,
        name: assignment.leads?.name || "Unknown Client",
        assignment_id: assignment.id,
        service_type: assignment.service_type,
        status: assignment.status,
      }))
      .filter((client) => client.id);

    setClients(completedClients);
  } catch (error) {
    console.error(
      "Load completed Meta Ads clients error:",
      error
    );

    setClients([]);
  }
};
  const loadReports = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("meta_ads_reports")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Meta reports fetch error:",
          error
        );

        alert(
          `Unable to load Meta Ads reports.\n\n${error.message}`
        );

        setReports([]);
        return;
      }

      setReports(data || []);
    } catch (error) {
      console.error(
        "Load reports error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadReports();
  }, []);

  const resetForm = () => {
    setReport({
      ...EMPTY_REPORT,
      report_date:
        new Date()
          .toISOString()
          .split("T")[0],
    });

    setLead({
      ...EMPTY_LEAD,
    });

    setAds([
      {
        ...EMPTY_AD,
      },
    ]);

    setAudiences([
      {
        ...EMPTY_AUDIENCE,
      },
    ]);

    setPlacements([
      {
        ...EMPTY_PLACEMENT,
      },
    ]);
  };

  const startCreate = () => {
    resetForm();
    setSelectedReport(null);
    setMode("create");
  };

  const openReport = async (reportRow) => {
    setLoading(true);

    try {
      const [
        leadResult,
        adsResult,
        audienceResult,
        placementResult,
      ] = await Promise.all([
        supabase
          .from("meta_ads_lead_performance")
          .select("*")
          .eq("report_id", reportRow.id)
          .maybeSingle(),

        supabase
          .from("meta_ads_ad_performance")
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("meta_ads_audience_performance")
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("meta_ads_placement_performance")
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (leadResult.error) {
        console.error(
          "Lead report fetch error:",
          leadResult.error
        );
      }

      if (adsResult.error) {
        console.error(
          "Ad performance fetch error:",
          adsResult.error
        );
      }

      if (audienceResult.error) {
        console.error(
          "Audience performance fetch error:",
          audienceResult.error
        );
      }

      if (placementResult.error) {
        console.error(
          "Placement performance fetch error:",
          placementResult.error
        );
      }

      setSelectedReport(reportRow);

      setSelectedLead(
        leadResult.data || {
          ...EMPTY_LEAD,
        }
      );

      setSelectedAds(
        adsResult.data || []
      );

      setSelectedAudiences(
        audienceResult.data || []
      );

      setSelectedPlacements(
        placementResult.data || []
      );

      setMode("view");
    } catch (error) {
      console.error(
        "Open report error:",
        error
      );

      alert(
        "Unable to open report."
      );
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!selectedReport) return;

    setReport({
      ...EMPTY_REPORT,
      ...selectedReport,
    });

    setLead({
      ...EMPTY_LEAD,
      ...(selectedLead || {}),
    });

    setAds(
      selectedAds.length
        ? selectedAds.map((row) =>
            normalizeRow(
              row,
              EMPTY_AD
            )
          )
        : [{ ...EMPTY_AD }]
    );

    setAudiences(
      selectedAudiences.length
        ? selectedAudiences.map((row) =>
            normalizeRow(
              row,
              EMPTY_AUDIENCE
            )
          )
        : [{ ...EMPTY_AUDIENCE }]
    );

    setPlacements(
      selectedPlacements.length
        ? selectedPlacements.map((row) =>
            normalizeRow(
              row,
              EMPTY_PLACEMENT
            )
          )
        : [{ ...EMPTY_PLACEMENT }]
    );

    setMode("edit");
  };

  const validateReport = () => {
    if (!report.client_id) {
      alert("Please select a client.");
      return false;
    }

    if (!report.campaign_name.trim()) {
      alert("Please enter campaign name.");
      return false;
    }

    if (!report.report_period_start) {
      alert(
        "Please select report period start."
      );
      return false;
    }

    if (!report.report_period_end) {
      alert(
        "Please select report period end."
      );
      return false;
    }

    if (
      report.report_period_end <
      report.report_period_start
    ) {
      alert(
        "Report period end cannot be before start date."
      );
      return false;
    }

    const invalidAd = ads.find(
      (ad) =>
        ad.ad_name &&
        String(ad.ad_name).trim() === ""
    );

    if (invalidAd) {
      alert("Please enter a valid ad name.");
      return false;
    }

    return true;
  };

  const saveReport = async (event) => {
    event.preventDefault();

    if (!validateReport()) {
      return;
    }

    setSaving(true);

    try {
      const reportPayload = {
        client_id:
          report.client_id || null,

        campaign_name:
          report.campaign_name.trim(),

        campaign_objective:
          report.campaign_objective ||
          null,

        campaign_status:
          report.campaign_status ||
          null,

        report_period_start:
          report.report_period_start,

        report_period_end:
          report.report_period_end,

        report_date:
          report.report_date || null,

        total_ad_spend:
          numberValue(
            report.total_ad_spend
          ),

        impressions:
          integerValue(
            report.impressions
          ),

        reach:
          integerValue(report.reach),

        frequency:
          numberValue(
            report.frequency
          ),

        link_clicks:
          integerValue(
            report.link_clicks
          ),

        ctr: numberValue(report.ctr),

        cpc: numberValue(report.cpc),

        cpm: numberValue(report.cpm),

        total_leads:
          integerValue(
            report.total_leads
          ),

        qualified_leads:
          integerValue(
            report.qualified_leads
          ),

        contacted_leads:
          integerValue(
            report.contacted_leads
          ),

        interested_leads:
          integerValue(
            report.interested_leads
          ),

        follow_up_leads:
          integerValue(
            report.follow_up_leads
          ),

        converted_customers:
          integerValue(
            report.converted_customers
          ),

        cost_per_lead:
          numberValue(
            report.cost_per_lead
          ),

        cost_per_qualified_lead:
          numberValue(
            report.cost_per_qualified_lead
          ),

        cost_per_customer:
          numberValue(
            report.cost_per_customer
          ),

        lead_to_customer_rate:
          numberValue(
            report.lead_to_customer_rate
          ),

        planned_ad_budget:
          numberValue(
            report.planned_ad_budget
          ),

        remaining_budget:
          numberValue(
            report.remaining_budget
          ),

        what_worked_well:
          report.what_worked_well ||
          null,

        what_needs_improvement:
          report.what_needs_improvement ||
          null,

        audience_insights:
          report.audience_insights ||
          null,

        creative_insights:
          report.creative_insights ||
          null,

        lead_quality_insights:
          report.lead_quality_insights ||
          null,

        issues_observations:
          report.issues_observations ||
          null,

        budget_recommendation:
          report.budget_recommendation ||
          null,

        audience_changes:
          report.audience_changes ||
          null,

        creative_changes:
          report.creative_changes ||
          null,

        campaign_changes:
          report.campaign_changes ||
          null,

        retargeting_plan:
          report.retargeting_plan ||
          null,

        landing_page_changes:
          report.landing_page_changes ||
          null,

        lead_follow_up_recommendation:
          report.lead_follow_up_recommendation ||
          null,

        management_fee:
          numberValue(
            report.management_fee
          ),

        total_client_billing:
          numberValue(
            report.total_client_billing
          ),

        updated_at: new Date().toISOString(),
      };

      let reportId =
        selectedReport?.id || null;

      if (mode === "edit" && reportId) {
        const { error } = await supabase
          .from("meta_ads_reports")
          .update(reportPayload)
          .eq("id", reportId);

        if (error) {
          throw error;
        }

        await Promise.all([
          supabase
            .from(
              "meta_ads_lead_performance"
            )
            .delete()
            .eq(
              "report_id",
              reportId
            ),

          supabase
            .from(
              "meta_ads_ad_performance"
            )
            .delete()
            .eq(
              "report_id",
              reportId
            ),

          supabase
            .from(
              "meta_ads_audience_performance"
            )
            .delete()
            .eq(
              "report_id",
              reportId
            ),

          supabase
            .from(
              "meta_ads_placement_performance"
            )
            .delete()
            .eq(
              "report_id",
              reportId
            ),
        ]);
      } else {
        const { data, error } =
          await supabase
            .from("meta_ads_reports")
            .insert(reportPayload)
            .select()
            .single();

        if (error) {
          throw error;
        }

        reportId = data.id;
      }

      /* ---------------------------
         LEAD PERFORMANCE
      --------------------------- */

      const leadPayload = {
        report_id: reportId,

        total_leads:
          integerValue(
            lead.total_leads
          ),

        qualified_leads:
          integerValue(
            lead.qualified_leads
          ),

        unqualified_leads:
          integerValue(
            lead.unqualified_leads
          ),

        contacted_leads:
          integerValue(
            lead.contacted_leads
          ),

        interested_leads:
          integerValue(
            lead.interested_leads
          ),

        follow_up_leads:
          integerValue(
            lead.follow_up_leads
          ),

        converted_customers:
          integerValue(
            lead.converted_customers
          ),

        lead_to_customer_rate:
          numberValue(
            lead.lead_to_customer_rate
          ),

        cost_per_lead:
          numberValue(
            lead.cost_per_lead
          ),

        cost_per_qualified_lead:
          numberValue(
            lead.cost_per_qualified_lead
          ),

        cost_per_customer:
          numberValue(
            lead.cost_per_customer
          ),

        lead_quality:
          lead.lead_quality || null,

        lead_quality_notes:
          lead.lead_quality_notes ||
          null,

        notes: lead.notes || null,

        updated_at:
          new Date().toISOString(),
      };

      const {
        error: leadError,
      } = await supabase
        .from(
          "meta_ads_lead_performance"
        )
        .insert(leadPayload);

      if (leadError) {
        throw leadError;
      }

      /* ---------------------------
         AD PERFORMANCE
      --------------------------- */

      const validAds = ads.filter(
        (ad) =>
          ad.ad_name &&
          String(ad.ad_name).trim()
      );

      if (validAds.length > 0) {
        const adPayloads =
          validAds.map((ad) => ({
            report_id: reportId,

            ad_name:
              String(
                ad.ad_name
              ).trim(),

            ad_format:
              ad.ad_format || null,

            ad_status:
              ad.ad_status || null,

            ad_spend:
              numberValue(
                ad.ad_spend
              ),

            reach:
              integerValue(ad.reach),

            impressions:
              integerValue(
                ad.impressions
              ),

            clicks:
              integerValue(ad.clicks),

            ctr:
              numberValue(ad.ctr),

            cpc:
              numberValue(ad.cpc),

            cpm:
              numberValue(ad.cpm),

            leads:
              integerValue(ad.leads),

            cost_per_lead:
              numberValue(
                ad.cost_per_lead
              ),

            creative_type:
              ad.creative_type ||
              null,

            creative_notes:
              ad.creative_notes ||
              null,

            updated_at:
              new Date().toISOString(),
          }));

        const {
          error: adError,
        } = await supabase
          .from(
            "meta_ads_ad_performance"
          )
          .insert(adPayloads);

        if (adError) {
          throw adError;
        }
      }

      /* ---------------------------
         AUDIENCE PERFORMANCE
      --------------------------- */

      const validAudiences =
        audiences.filter(
          (audience) =>
            audience.audience_name ||
            audience.location ||
            audience.age_group
        );

      if (validAudiences.length > 0) {
        const audiencePayloads =
          validAudiences.map(
            (audience) => ({
              report_id: reportId,

              audience_name:
                audience.audience_name ||
                null,

              audience_type:
                audience.audience_type ||
                null,

              age_group:
                audience.age_group ||
                null,

              gender:
                audience.gender ||
                null,

              location:
                audience.location ||
                null,

              spend:
                numberValue(
                  audience.spend
                ),

              reach:
                integerValue(
                  audience.reach
                ),

              impressions:
                integerValue(
                  audience.impressions
                ),

              clicks:
                integerValue(
                  audience.clicks
                ),

              ctr:
                numberValue(
                  audience.ctr
                ),

              cpc:
                numberValue(
                  audience.cpc
                ),

              cpm:
                numberValue(
                  audience.cpm
                ),

              leads:
                integerValue(
                  audience.leads
                ),

              cost_per_lead:
                numberValue(
                  audience.cost_per_lead
                ),

              performance_summary:
                audience.performance_summary ||
                null,

              notes:
                audience.notes ||
                null,

              updated_at:
                new Date().toISOString(),
            })
          );

        const {
          error: audienceError,
        } = await supabase
          .from(
            "meta_ads_audience_performance"
          )
          .insert(
            audiencePayloads
          );

        if (audienceError) {
          throw audienceError;
        }
      }

      /* ---------------------------
         PLACEMENT PERFORMANCE
      --------------------------- */

      const validPlacements =
        placements.filter(
          (placement) =>
            placement.placement_name
        );

      if (validPlacements.length > 0) {
        const placementPayloads =
          validPlacements.map(
            (placement) => ({
              report_id: reportId,

              placement_name:
                placement.placement_name,

              platform:
                placement.platform ||
                null,

              placement_type:
                placement.placement_type ||
                null,

              spend:
                numberValue(
                  placement.spend
                ),

              reach:
                integerValue(
                  placement.reach
                ),

              impressions:
                integerValue(
                  placement.impressions
                ),

              clicks:
                integerValue(
                  placement.clicks
                ),

              ctr:
                numberValue(
                  placement.ctr
                ),

              cpc:
                numberValue(
                  placement.cpc
                ),

              cpm:
                numberValue(
                  placement.cpm
                ),

              leads:
                integerValue(
                  placement.leads
                ),

              cost_per_lead:
                numberValue(
                  placement.cost_per_lead
                ),

              performance_summary:
                placement.performance_summary ||
                null,

              notes:
                placement.notes ||
                null,

              updated_at:
                new Date().toISOString(),
            })
          );

        const {
          error: placementError,
        } = await supabase
          .from(
            "meta_ads_placement_performance"
          )
          .insert(
            placementPayloads
          );

        if (placementError) {
          throw placementError;
        }
      }

      alert(
        mode === "edit"
          ? "Meta Ads report updated successfully."
          : "Meta Ads report saved successfully."
      );

      await loadReports();

      await openReportById(reportId);
    } catch (error) {
      console.error(
        "Save Meta Ads report error:",
        error
      );

      alert(
        `Unable to save Meta Ads report.\n\n${error.message || "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  };

  const openReportById = async (reportId) => {
    try {
      const { data, error } =
        await supabase
          .from("meta_ads_reports")
          .select("*")
          .eq("id", reportId)
          .single();

      if (error) {
        throw error;
      }

      await openReport(data);
    } catch (error) {
      console.error(
        "Open saved report error:",
        error
      );

      setMode("list");
    }
  };

  const deleteReport = async (reportRow) => {
    const confirmed =
      window.confirm(
        `Delete report "${reportRow.campaign_name}"?\n\nThis will permanently delete the report and its performance data.`
      );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("meta_ads_reports")
        .delete()
        .eq("id", reportRow.id);

      if (error) {
        throw error;
      }

      alert(
        "Meta Ads report deleted successfully."
      );

      if (
        selectedReport?.id ===
        reportRow.id
      ) {
        setMode("list");
        setSelectedReport(null);
      }

      await loadReports();
    } catch (error) {
      console.error(
        "Delete report error:",
        error
      );

      alert(
        `Unable to delete report.\n\n${error.message || "Unknown error"}`
      );
    }
  };

  const filteredReports = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return reports;
    }

    return reports.filter(
      (row) => {
        const client =
          clients.find(
            (item) =>
              String(item.id) ===
              String(row.client_id)
          );

        const clientName =
          getClientName(client);

        return (
          clientName
            .toLowerCase()
            .includes(query) ||
          String(
            row.campaign_name || ""
          )
            .toLowerCase()
            .includes(query)
        );
      }
    );
  }, [reports, clients, search]);

  const selectedClient = useMemo(() => {
    if (!selectedReport) return null;

    return (
      clients.find(
        (client) =>
          String(client.id) ===
          String(
            selectedReport.client_id
          )
      ) || null
    );
  }, [clients, selectedReport]);

  if (mode === "create" || mode === "edit") {
    return (
      <ReportForm
        report={report}
        setReport={setReport}
        lead={lead}
        setLead={setLead}
        ads={ads}
        setAds={setAds}
        audiences={audiences}
        setAudiences={setAudiences}
        placements={placements}
        setPlacements={setPlacements}
        clients={clients}
        onSave={saveReport}
        onCancel={() => setMode("list")}
        saving={saving}
        editing={mode === "edit"}
      />
    );
  }

  if (mode === "view" && selectedReport) {
    return (
      <ReportView
        report={selectedReport}
        client={selectedClient}
        lead={selectedLead}
        ads={selectedAds}
        audiences={selectedAudiences}
        placements={selectedPlacements}
        onBack={() => setMode("list")}
        onEdit={startEdit}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Meta Ads Reports"
        subtitle="Create, manage and download Meta Ads campaign reports."
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={() => {
              loadClients();
              loadReports();
            }}
          >
            Refresh
          </Button>

          <Button
            icon={Plus}
            onClick={startCreate}
          >
            Create Report
          </Button>
        </div>
      </PageHeader>

      {/* SEARCH */}
      <Panel style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
              minWidth: 230,
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: 10,
                color: C.inkFaint,
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search client or campaign..."
              style={{
                ...inputStyle,
                width: "100%",
                paddingLeft: 32,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </Panel>

      {/* REPORTS */}
      <Panel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 15,
          }}
        >
          <FileBarChart
            size={18}
            color={C.primary}
          />

          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Meta Ads Reports
            </div>

            <div
              style={{
                fontSize: 11,
                color: C.inkFaint,
                marginTop: 2,
              }}
            >
              {reports.length} saved report
              {reports.length === 1
                ? ""
                : "s"}
            </div>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: C.inkFaint,
              fontSize: 13,
            }}
          >
            Loading reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div
            style={{
              border: `1px dashed ${C.border}`,
              borderRadius: 8,
              padding: 35,
              textAlign: "center",
            }}
          >
            <BarChart3
              size={30}
              color={C.inkFaint}
              style={{
                marginBottom: 8,
              }}
            />

            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              No Meta Ads reports found
            </div>

            <div
              style={{
                fontSize: 12,
                color: C.inkFaint,
                marginBottom: 15,
              }}
            >
              Create your first campaign
              report to start building report
              history.
            </div>

            <Button
              icon={Plus}
              onClick={startCreate}
            >
              Create Meta Ads Report
            </Button>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: 780,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Client",
                    "Campaign",
                    "Period",
                    "Spend",
                    "Leads",
                    "Status",
                    "Created",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding:
                          "10px 9px",
                        borderBottom: `1px solid ${C.border}`,
                        textAlign:
                          "left",
                        fontSize: 11,
                        color:
                          C.inkFaint,
                        fontWeight: 600,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredReports.map(
                  (row) => {
                    const client =
                      clients.find(
                        (item) =>
                          String(
                            item.id
                          ) ===
                          String(
                            row.client_id
                          )
                      );

                    return (
                      <tr
                        key={row.id}
                        style={{
                          cursor:
                            "pointer",
                        }}
                        onClick={() =>
                          openReport(
                            row
                          )
                        }
                      >
                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                            fontSize: 12,
                            fontWeight:
                              600,
                          }}
                        >
                          {getClientName(
                            client
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                            fontSize: 12,
                            color:
                              C.inkSoft,
                          }}
                        >
                          {
                            row.campaign_name
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                            fontSize: 11,
                            color:
                              C.inkSoft,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            row.report_period_start
                          }{" "}
                          →{" "}
                          {
                            row.report_period_end
                          }
                        </td>

                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                            fontFamily:
                              "'IBM Plex Mono', monospace",
                            fontSize: 11,
                          }}
                        >
                          {money(
                            row.total_ad_spend
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                            fontFamily:
                              "'IBM Plex Mono', monospace",
                            fontSize: 11,
                          }}
                        >
                          {displayNumber(
                            row.total_leads
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-flex",
                              padding:
                                "4px 8px",
                              borderRadius:
                                20,
                              background:
                                C.primarySoft,
                              color:
                                C.primaryDeep,
                              fontWeight:
                                600,
                            }}
                          >
                            {
                              row.campaign_status ||
                              "—"
                            }
                          </span>
                        </td>

                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                            fontSize: 11,
                            color:
                              C.inkFaint,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {row.created_at
                            ? new Date(
                                row.created_at
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>

                        <td
                          style={{
                            padding:
                              "12px 9px",
                            borderBottom: `1px solid ${C.borderSoft}`,
                          }}
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              gap: 5,
                            }}
                          >
                            <button
                              type="button"
                              title="View"
                              onClick={() =>
                                openReport(
                                  row
                                )
                              }
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius:
                                  6,
                                border: `1px solid ${C.border}`,
                                background:
                                  "#fff",
                                cursor:
                                  "pointer",
                                color:
                                  C.primary,
                              }}
                            >
                              <FileBarChart
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              title="Delete"
                              onClick={() =>
                                deleteReport(
                                  row
                                )
                              }
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius:
                                  6,
                                border: `1px solid ${C.border}`,
                                background:
                                  "#fff",
                                cursor:
                                  "pointer",
                                color:
                                  C.danger,
                              }}
                            >
                              <Trash2
                                size={14}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <style>{`
        @media (max-width: 700px) {
          .meta-report-view {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}