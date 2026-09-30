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

/* =========================================================
   EMPTY DATA
========================================================= */

const EMPTY_REPORT = {
  client_assignment_id: "",
  lead_id: "",
  client_name: "",
  business_category: "",

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
  clicks: "",
  ctr: "",
  cpc: "",
  cpm: "",

  leads_results: "",
  cost_per_lead: "",
  landing_page_views: "",
  conversion_rate: "",

  total_leads_generated: "",
  qualified_leads: "",
  unqualified_leads: "",
  contacted_leads: "",
  interested_leads: "",
  follow_up_leads: "",
  converted_customers: "",

  lead_to_customer_rate: "",
  cost_per_qualified_lead: "",
  cost_per_customer: "",

  planned_ad_budget: "",
  actual_ad_spend: "",
  remaining_budget: "",

  management_fee: "",
  total_client_billing: "",

  what_worked_well: "",
  what_needs_improvement: "",
  audience_insights: "",
  creative_insights: "",
  keyword_insights: "",
  lead_quality_insights: "",
  issues_observations: "",

  budget_recommendation: "",
  audience_changes: "",
  keyword_changes: "",
  creative_changes: "",
  campaign_changes: "",
  retargeting_plan: "",
  landing_page_changes: "",
  lead_followup_recommendation: "",

  executive_summary: "",
};

const EMPTY_AD = {
  campaign_name: "",
  ad_group_name: "",
  ad_name: "",
  ad_format: "",
  spend: "",
  impressions: "",
  reach: "",
  clicks: "",
  ctr: "",
  cpc: "",
  cpm: "",
  conversions: "",
  cost_per_conversion: "",
  conversion_rate: "",
};

const EMPTY_KEYWORD = {
  campaign_name: "",
  ad_group_name: "",
  keyword: "",
  match_type: "",
  impressions: "",
  clicks: "",
  ctr: "",
  avg_cpc: "",
  spend: "",
  conversions: "",
  cost_per_conversion: "",
  conversion_rate: "",
};

const EMPTY_LOCATION = {
  location: "",
  impressions: "",
  clicks: "",
  ctr: "",
  spend: "",
  conversions: "",
  cost_per_conversion: "",
  conversion_rate: "",
};

const EMPTY_DEVICE = {
  device: "",
  impressions: "",
  clicks: "",
  ctr: "",
  spend: "",
  conversions: "",
  cost_per_conversion: "",
  conversion_rate: "",
};

const EMPTY_NETWORK = {
  network: "",
  impressions: "",
  clicks: "",
  ctr: "",
  spend: "",
  conversions: "",
  cost_per_conversion: "",
  conversion_rate: "",
};

/* =========================================================
   HELPERS
========================================================= */

function numberValue(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
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

function normalizeRow(row, emptyTemplate) {
  return {
    ...emptyTemplate,
    ...(row || {}),
  };
}

function getClientName(client) {
  if (!client) return "Unknown Client";

  const lead = client.leads || client.lead || client;

  return (
    lead.client_name ||
    lead.name ||
    lead.business_name ||
    lead.company_name ||
    lead.company ||
    lead.clientName ||
    `Client ${lead.id || client.lead_id || client.id || ""}`
  );
}

/* =========================================================
   FORM COMPONENTS
========================================================= */

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <label
        style={{
          fontSize: 12,
          color: C.inkSoft,
          fontWeight: 500,
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color: C.danger,
              marginLeft: 3,
            }}
          >
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <label
        style={{
          fontSize: 12,
          color: C.inkSoft,
          fontWeight: 500,
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color: C.danger,
              marginLeft: 3,
            }}
          >
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
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
        <ChevronUp
          size={17}
          color={C.inkSoft}
        />
      ) : (
        <ChevronDown
          size={17}
          color={C.inkSoft}
        />
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

/* =========================================================
   REPORT FORM
========================================================= */

function ReportForm({
  report,
  setReport,

  ads,
  setAds,

  keywords,
  setKeywords,

  locations,
  setLocations,

  devices,
  setDevices,

  networks,
  setNetworks,

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
    keywords: false,
    locations: false,
    devices: false,
    networks: false,
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

  const updateRow = (
    setter,
    index,
    key,
    value
  ) => {
    setter((prev) =>
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

  const addRow = (setter, template) => {
    setter((prev) => [
      ...prev,
      { ...template },
    ]);
  };

  const removeRow = (setter, index) => {
    setter((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  return (
    <div>
      <PageHeader
        title={
          editing
            ? "Edit Google Ads Report"
            : "Create Google Ads Report"
        }
        subtitle="Enter Google Ads campaign performance data and save the report to the CRM."
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
        {/* =================================================
            1. CLIENT & CAMPAIGN
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="1"
            title="Client & Campaign Information"
            subtitle="Basic information about the Google Ads campaign."
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
                value={report.client_assignment_id}
                onChange={(value) => {
                  const client =
                    clients.find(
                      (item) =>
                        String(item.assignment_id) ===
                        String(value)
                    );

                  updateReport(
                    "client_assignment_id",
                    value
                  );

                  updateReport(
                    "lead_id",
                    client?.lead_id || ""
                  );

                  updateReport(
                    "client_name",
                    client?.name || ""
                  );

                  updateReport(
                    "business_category",
                    client?.business_category || ""
                  );
                }}
                required
                options={[
                  {
                    value: "",
                    label: "Select completed client",
                  },
                  ...clients.map((client) => ({
                    value: String(
                      client.assignment_id
                    ),
                    label: client.name,
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
                placeholder="e.g. Gym Lead Generation Campaign"
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
                    value: "Conversions",
                    label: "Conversions",
                  },
                  {
                    value: "Website Traffic",
                    label: "Website Traffic",
                  },
                  {
                    value: "Search",
                    label: "Search",
                  },
                  {
                    value: "Display",
                    label: "Display",
                  },
                  {
                    value: "Performance Max",
                    label: "Performance Max",
                  },
                  {
                    value: "Other",
                    label: "Other",
                  },
                ]}
              />

              <SelectField
                label="Campaign Status"
                value={
                  report.campaign_status
                }
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

        {/* =================================================
            2. CAMPAIGN PERFORMANCE
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="2"
            title="Campaign Performance"
            subtitle="Overall Google Ads campaign metrics."
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
                value={report.impressions}
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
                value={report.frequency}
                onChange={(value) =>
                  updateReport(
                    "frequency",
                    value
                  )
                }
              />

              <InputField
                label="Clicks"
                type="number"
                value={report.clicks}
                onChange={(value) =>
                  updateReport(
                    "clicks",
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
                label="Google Ads Conversions"
                type="number"
                value={
                  report.leads_results
                }
                onChange={(value) =>
                  updateReport(
                    "leads_results",
                    value
                  )
                }
              />

              <InputField
                label="Cost Per Lead / Conversion (₹)"
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
                label="Landing Page Views"
                type="number"
                value={
                  report.landing_page_views
                }
                onChange={(value) =>
                  updateReport(
                    "landing_page_views",
                    value
                  )
                }
              />

              <InputField
                label="Conversion Rate (%)"
                type="number"
                step="0.01"
                value={
                  report.conversion_rate
                }
                onChange={(value) =>
                  updateReport(
                    "conversion_rate",
                    value
                  )
                }
              />
            </div>
          )}
        </Panel>

        {/* =================================================
            3. LEAD PERFORMANCE
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="3"
            title="Lead Performance"
            subtitle="Lead quality and customer conversion funnel."
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
                label="Total Leads Generated"
                type="number"
                value={
                  report.total_leads_generated
                }
                onChange={(value) =>
                  updateReport(
                    "total_leads_generated",
                    value
                  )
                }
              />

              <InputField
                label="Qualified Leads"
                type="number"
                value={
                  report.qualified_leads
                }
                onChange={(value) =>
                  updateReport(
                    "qualified_leads",
                    value
                  )
                }
              />

              <InputField
                label="Unqualified Leads"
                type="number"
                value={
                  report.unqualified_leads
                }
                onChange={(value) =>
                  updateReport(
                    "unqualified_leads",
                    value
                  )
                }
              />

              <InputField
                label="Contacted Leads"
                type="number"
                value={
                  report.contacted_leads
                }
                onChange={(value) =>
                  updateReport(
                    "contacted_leads",
                    value
                  )
                }
              />

              <InputField
                label="Interested Leads"
                type="number"
                value={
                  report.interested_leads
                }
                onChange={(value) =>
                  updateReport(
                    "interested_leads",
                    value
                  )
                }
              />

              <InputField
                label="Follow-up Leads"
                type="number"
                value={
                  report.follow_up_leads
                }
                onChange={(value) =>
                  updateReport(
                    "follow_up_leads",
                    value
                  )
                }
              />

              <InputField
                label="Converted Customers"
                type="number"
                value={
                  report.converted_customers
                }
                onChange={(value) =>
                  updateReport(
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
                  report.lead_to_customer_rate
                }
                onChange={(value) =>
                  updateReport(
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
                label="Cost Per Qualified Lead (₹)"
                type="number"
                step="0.01"
                value={
                  report.cost_per_qualified_lead
                }
                onChange={(value) =>
                  updateReport(
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
                  report.cost_per_customer
                }
                onChange={(value) =>
                  updateReport(
                    "cost_per_customer",
                    value
                  )
                }
              />
            </div>
          )}
        </Panel>

        {/* =================================================
            4. AD PERFORMANCE
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="4"
            title="Ad Performance"
            subtitle="Campaign, ad group and individual ad performance."
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
                      justifyContent: "space-between",
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
                      Ad {index + 1}
                    </div>

                    {ads.length > 1 && (
                      <RowDeleteButton
                        onClick={() =>
                          removeRow(
                            setAds,
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
                      label="Campaign Name"
                      value={ad.campaign_name}
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "campaign_name",
                          value
                        )
                      }
                      placeholder="Search Campaign"
                    />

                    <InputField
                      label="Ad Group"
                      value={
                        ad.ad_group_name
                      }
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "ad_group_name",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Ad Name"
                      value={ad.ad_name}
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "ad_name",
                          value
                        )
                      }
                      required
                      placeholder="Ad 01"
                    />

                    <SelectField
                      label="Ad Format"
                      value={ad.ad_format}
                      onChange={(value) =>
                        updateRow(
                          setAds,
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
                          value: "Responsive Search Ad",
                          label: "Responsive Search Ad",
                        },
                        {
                          value: "Display",
                          label: "Display",
                        },
                        {
                          value: "Video",
                          label: "Video",
                        },
                        {
                          value: "Performance Max",
                          label: "Performance Max",
                        },
                        {
                          value: "Shopping",
                          label: "Shopping",
                        },
                      ]}
                    />

                    <InputField
                      label="Spend (₹)"
                      type="number"
                      step="0.01"
                      value={ad.spend}
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "spend",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Impressions"
                      type="number"
                      value={
                        ad.impressions
                      }
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "impressions",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Reach"
                      type="number"
                      value={ad.reach}
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "reach",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Clicks"
                      type="number"
                      value={ad.clicks}
                      onChange={(value) =>
                        updateRow(
                          setAds,
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
                        updateRow(
                          setAds,
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
                        updateRow(
                          setAds,
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
                        updateRow(
                          setAds,
                          index,
                          "cpm",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Conversions"
                      type="number"
                      value={
                        ad.conversions
                      }
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "conversions",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Cost Per Conversion (₹)"
                      type="number"
                      step="0.01"
                      value={
                        ad.cost_per_conversion
                      }
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "cost_per_conversion",
                          value
                        )
                      }
                    />

                    <InputField
                      label="Conversion Rate (%)"
                      type="number"
                      step="0.01"
                      value={
                        ad.conversion_rate
                      }
                      onChange={(value) =>
                        updateRow(
                          setAds,
                          index,
                          "conversion_rate",
                          value
                        )
                      }
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={() =>
                  addRow(
                    setAds,
                    EMPTY_AD
                  )
                }
              >
                Add Another Ad
              </Button>
            </div>
          )}
        </Panel>

        {/* =================================================
            5. KEYWORD PERFORMANCE
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="5"
            title="Keyword Performance"
            subtitle="Search keyword and conversion performance."
            open={sections.keywords}
            onToggle={() => toggle("keywords")}
          />

          {sections.keywords && (
            <div style={{ marginTop: 18 }}>
              {keywords.map(
                (keyword, index) => (
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
                        Keyword {index + 1}
                      </div>

                      {keywords.length > 1 && (
                        <RowDeleteButton
                          onClick={() =>
                            removeRow(
                              setKeywords,
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
                        label="Campaign"
                        value={
                          keyword.campaign_name
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "campaign_name",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Ad Group"
                        value={
                          keyword.ad_group_name
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "ad_group_name",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Keyword"
                        value={keyword.keyword}
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "keyword",
                            value
                          )
                        }
                        required
                        placeholder="gym near me"
                      />

                      <SelectField
                        label="Match Type"
                        value={
                          keyword.match_type
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "match_type",
                            value
                          )
                        }
                        options={[
                          {
                            value: "",
                            label: "Select match type",
                          },
                          {
                            value: "Broad",
                            label: "Broad",
                          },
                          {
                            value: "Phrase",
                            label: "Phrase",
                          },
                          {
                            value: "Exact",
                            label: "Exact",
                          },
                        ]}
                      />

                      <InputField
                        label="Impressions"
                        type="number"
                        value={
                          keyword.impressions
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "impressions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Clicks"
                        type="number"
                        value={keyword.clicks}
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
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
                        value={keyword.ctr}
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "ctr",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Average CPC (₹)"
                        type="number"
                        step="0.01"
                        value={
                          keyword.avg_cpc
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "avg_cpc",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Spend (₹)"
                        type="number"
                        step="0.01"
                        value={keyword.spend}
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "spend",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversions"
                        type="number"
                        value={
                          keyword.conversions
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "conversions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Cost / Conversion (₹)"
                        type="number"
                        step="0.01"
                        value={
                          keyword.cost_per_conversion
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "cost_per_conversion",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversion Rate (%)"
                        type="number"
                        step="0.01"
                        value={
                          keyword.conversion_rate
                        }
                        onChange={(value) =>
                          updateRow(
                            setKeywords,
                            index,
                            "conversion_rate",
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                )
              )}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={() =>
                  addRow(
                    setKeywords,
                    EMPTY_KEYWORD
                  )
                }
              >
                Add Another Keyword
              </Button>
            </div>
          )}
        </Panel>

        {/* =================================================
            6. LOCATION PERFORMANCE
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="6"
            title="Location Performance"
            subtitle="Geographic performance of Google Ads campaigns."
            open={sections.locations}
            onToggle={() => toggle("locations")}
          />

          {sections.locations && (
            <div style={{ marginTop: 18 }}>
              {locations.map(
                (location, index) => (
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
                        Location {index + 1}
                      </div>

                      {locations.length > 1 && (
                        <RowDeleteButton
                          onClick={() =>
                            removeRow(
                              setLocations,
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
                        label="Location"
                        value={
                          location.location
                        }
                        onChange={(value) =>
                          updateRow(
                            setLocations,
                            index,
                            "location",
                            value
                          )
                        }
                        required
                        placeholder="Latur"
                      />

                      <InputField
                        label="Impressions"
                        type="number"
                        value={
                          location.impressions
                        }
                        onChange={(value) =>
                          updateRow(
                            setLocations,
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
                          location.clicks
                        }
                        onChange={(value) =>
                          updateRow(
                            setLocations,
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
                        value={location.ctr}
                        onChange={(value) =>
                          updateRow(
                            setLocations,
                            index,
                            "ctr",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Spend (₹)"
                        type="number"
                        step="0.01"
                        value={location.spend}
                        onChange={(value) =>
                          updateRow(
                            setLocations,
                            index,
                            "spend",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversions"
                        type="number"
                        value={
                          location.conversions
                        }
                        onChange={(value) =>
                          updateRow(
                            setLocations,
                            index,
                            "conversions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Cost / Conversion (₹)"
                        type="number"
                        step="0.01"
                        value={
                          location.cost_per_conversion
                        }
                        onChange={(value) =>
                          updateRow(
                            setLocations,
                            index,
                            "cost_per_conversion",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversion Rate (%)"
                        type="number"
                        step="0.01"
                        value={
                          location.conversion_rate
                        }
                        onChange={(value) =>
                          updateRow(
                            setLocations,
                            index,
                            "conversion_rate",
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                )
              )}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={() =>
                  addRow(
                    setLocations,
                    EMPTY_LOCATION
                  )
                }
              >
                Add Another Location
              </Button>
            </div>
          )}
        </Panel>

        {/* =================================================
            7. DEVICE PERFORMANCE
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="7"
            title="Device Performance"
            subtitle="Performance by mobile, desktop and tablet."
            open={sections.devices}
            onToggle={() => toggle("devices")}
          />

          {sections.devices && (
            <div style={{ marginTop: 18 }}>
              {devices.map(
                (device, index) => (
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
                        Device {index + 1}
                      </div>

                      {devices.length > 1 && (
                        <RowDeleteButton
                          onClick={() =>
                            removeRow(
                              setDevices,
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
                      <SelectField
                        label="Device"
                        value={device.device}
                        onChange={(value) =>
                          updateRow(
                            setDevices,
                            index,
                            "device",
                            value
                          )
                        }
                        required
                        options={[
                          {
                            value: "",
                            label: "Select device",
                          },
                          {
                            value: "Mobile",
                            label: "Mobile",
                          },
                          {
                            value: "Desktop",
                            label: "Desktop",
                          },
                          {
                            value: "Tablet",
                            label: "Tablet",
                          },
                          {
                            value: "Other",
                            label: "Other",
                          },
                        ]}
                      />

                      <InputField
                        label="Impressions"
                        type="number"
                        value={
                          device.impressions
                        }
                        onChange={(value) =>
                          updateRow(
                            setDevices,
                            index,
                            "impressions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Clicks"
                        type="number"
                        value={device.clicks}
                        onChange={(value) =>
                          updateRow(
                            setDevices,
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
                        value={device.ctr}
                        onChange={(value) =>
                          updateRow(
                            setDevices,
                            index,
                            "ctr",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Spend (₹)"
                        type="number"
                        step="0.01"
                        value={device.spend}
                        onChange={(value) =>
                          updateRow(
                            setDevices,
                            index,
                            "spend",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversions"
                        type="number"
                        value={
                          device.conversions
                        }
                        onChange={(value) =>
                          updateRow(
                            setDevices,
                            index,
                            "conversions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Cost / Conversion (₹)"
                        type="number"
                        step="0.01"
                        value={
                          device.cost_per_conversion
                        }
                        onChange={(value) =>
                          updateRow(
                            setDevices,
                            index,
                            "cost_per_conversion",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversion Rate (%)"
                        type="number"
                        step="0.01"
                        value={
                          device.conversion_rate
                        }
                        onChange={(value) =>
                          updateRow(
                            setDevices,
                            index,
                            "conversion_rate",
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                )
              )}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={() =>
                  addRow(
                    setDevices,
                    EMPTY_DEVICE
                  )
                }
              >
                Add Another Device
              </Button>
            </div>
          )}
        </Panel>

        {/* =================================================
            8. NETWORK PERFORMANCE
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="8"
            title="Network Performance"
            subtitle="Google Search, Display and partner network performance."
            open={sections.networks}
            onToggle={() => toggle("networks")}
          />

          {sections.networks && (
            <div style={{ marginTop: 18 }}>
              {networks.map(
                (network, index) => (
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
                        Network {index + 1}
                      </div>

                      {networks.length > 1 && (
                        <RowDeleteButton
                          onClick={() =>
                            removeRow(
                              setNetworks,
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
                      <SelectField
                        label="Network"
                        value={network.network}
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
                            index,
                            "network",
                            value
                          )
                        }
                        required
                        options={[
                          {
                            value: "",
                            label: "Select network",
                          },
                          {
                            value: "Google Search",
                            label: "Google Search",
                          },
                          {
                            value: "Search Partners",
                            label: "Search Partners",
                          },
                          {
                            value: "Google Display",
                            label: "Google Display",
                          },
                          {
                            value: "YouTube",
                            label: "YouTube",
                          },
                          {
                            value: "Discover",
                            label: "Discover",
                          },
                          {
                            value: "Other",
                            label: "Other",
                          },
                        ]}
                      />

                      <InputField
                        label="Impressions"
                        type="number"
                        value={
                          network.impressions
                        }
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
                            index,
                            "impressions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Clicks"
                        type="number"
                        value={network.clicks}
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
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
                        value={network.ctr}
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
                            index,
                            "ctr",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Spend (₹)"
                        type="number"
                        step="0.01"
                        value={network.spend}
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
                            index,
                            "spend",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversions"
                        type="number"
                        value={
                          network.conversions
                        }
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
                            index,
                            "conversions",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Cost / Conversion (₹)"
                        type="number"
                        step="0.01"
                        value={
                          network.cost_per_conversion
                        }
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
                            index,
                            "cost_per_conversion",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Conversion Rate (%)"
                        type="number"
                        step="0.01"
                        value={
                          network.conversion_rate
                        }
                        onChange={(value) =>
                          updateRow(
                            setNetworks,
                            index,
                            "conversion_rate",
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                )
              )}

              <Button
                variant="ghost"
                icon={Plus}
                onClick={() =>
                  addRow(
                    setNetworks,
                    EMPTY_NETWORK
                  )
                }
              >
                Add Another Network
              </Button>
            </div>
          )}
        </Panel>

        {/* =================================================
            9. CAMPAIGN ANALYSIS
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="9"
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
                label="Keyword Insights"
                value={
                  report.keyword_insights
                }
                onChange={(value) =>
                  updateReport(
                    "keyword_insights",
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

        {/* =================================================
            10. NEXT PHASE STRATEGY
        ================================================= */}

        <Panel style={{ marginBottom: 14 }}>
          <SectionHeader
            number="10"
            title="Next Phase Strategy"
            subtitle="Recommendations for the next Google Ads campaign phase."
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
                label="Keyword Changes"
                value={
                  report.keyword_changes
                }
                onChange={(value) =>
                  updateReport(
                    "keyword_changes",
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
                    report.lead_followup_recommendation
                  }
                  onChange={(value) =>
                    updateReport(
                      "lead_followup_recommendation",
                      value
                    )
                  }
                />
              </div>
            </div>
          )}
        </Panel>

        {/* =================================================
            11. BUDGET
        ================================================= */}

        <Panel style={{ marginBottom: 18 }}>
          <SectionHeader
            number="11"
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
                  report.actual_ad_spend
                }
                onChange={(value) =>
                  updateReport(
                    "actual_ad_spend",
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

        {/* =================================================
            SAVE
        ================================================= */}

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

/* =========================================================
   REPORT VIEW
========================================================= */

function ReportView({
  report,
  client,
  ads,
  keywords,
  locations,
  devices,
  networks,
  onBack,
  onEdit,
}) {
  const clientName =
    report.client_name ||
    getClientName(client);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="google-report-view">
      <div className="google-report-print-actions">
        <PageHeader
          title="Google Ads Report"
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
        className="google-report-document"
        style={{
          background: "#fff",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* HEADER */}

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
            Google Ads Campaign Report
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

        <div style={{ padding: 22 }}>
          {/* BASIC INFO */}

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

          {/* CAMPAIGN SUMMARY */}

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
                report.clicks
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
              label="Conversions"
              value={displayNumber(
                report.leads_results
              )}
            />

            <MetricBox
              label="CPL / CPA"
              value={money(
                report.cost_per_lead
              )}
            />

            <MetricBox
              label="Landing Page Views"
              value={displayNumber(
                report.landing_page_views
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
              "Unqualified",
              "Contacted",
              "Interested",
              "Follow-up",
              "Converted",
              "Conversion Rate",
            ]}
            rows={[
              [
                displayNumber(
                  report.total_leads_generated
                ),
                displayNumber(
                  report.qualified_leads
                ),
                displayNumber(
                  report.unqualified_leads
                ),
                displayNumber(
                  report.contacted_leads
                ),
                displayNumber(
                  report.interested_leads
                ),
                displayNumber(
                  report.follow_up_leads
                ),
                displayNumber(
                  report.converted_customers
                ),
                `${displayNumber(
                  report.lead_to_customer_rate
                )}%`,
              ],
            ]}
          />

          {/* AD PERFORMANCE */}

          <ReportSectionTitle>
            Ad Performance
          </ReportSectionTitle>

          {ads.length > 0 ? (
            <DataTable
              columns={[
                "Campaign",
                "Ad Group",
                "Ad",
                "Format",
                "Spend",
                "Impressions",
                "Clicks",
                "CTR",
                "Conversions",
                "CPA",
              ]}
              rows={ads.map((ad) => [
                ad.campaign_name || "—",
                ad.ad_group_name || "—",
                ad.ad_name || "—",
                ad.ad_format || "—",
                money(ad.spend),
                displayNumber(
                  ad.impressions
                ),
                displayNumber(ad.clicks),
                `${displayNumber(
                  ad.ctr
                )}%`,
                displayNumber(
                  ad.conversions
                ),
                money(
                  ad.cost_per_conversion
                ),
              ])}
            />
          ) : (
            <EmptyNote text="No ad performance rows added." />
          )}

          {/* KEYWORDS */}

          {keywords.length > 0 && (
            <>
              <ReportSectionTitle>
                Keyword Performance
              </ReportSectionTitle>

              <DataTable
                columns={[
                  "Campaign",
                  "Ad Group",
                  "Keyword",
                  "Match",
                  "Impressions",
                  "Clicks",
                  "CTR",
                  "Avg CPC",
                  "Spend",
                  "Conversions",
                  "CPA",
                ]}
                rows={keywords.map(
                  (keyword) => [
                    keyword.campaign_name ||
                      "—",
                    keyword.ad_group_name ||
                      "—",
                    keyword.keyword ||
                      "—",
                    keyword.match_type ||
                      "—",
                    displayNumber(
                      keyword.impressions
                    ),
                    displayNumber(
                      keyword.clicks
                    ),
                    `${displayNumber(
                      keyword.ctr
                    )}%`,
                    money(
                      keyword.avg_cpc
                    ),
                    money(
                      keyword.spend
                    ),
                    displayNumber(
                      keyword.conversions
                    ),
                    money(
                      keyword.cost_per_conversion
                    ),
                  ]
                )}
              />
            </>
          )}

          {/* LOCATIONS */}

          {locations.length > 0 && (
            <>
              <ReportSectionTitle>
                Location Performance
              </ReportSectionTitle>

              <DataTable
                columns={[
                  "Location",
                  "Impressions",
                  "Clicks",
                  "CTR",
                  "Spend",
                  "Conversions",
                  "CPA",
                ]}
                rows={locations.map(
                  (location) => [
                    location.location ||
                      "—",
                    displayNumber(
                      location.impressions
                    ),
                    displayNumber(
                      location.clicks
                    ),
                    `${displayNumber(
                      location.ctr
                    )}%`,
                    money(location.spend),
                    displayNumber(
                      location.conversions
                    ),
                    money(
                      location.cost_per_conversion
                    ),
                  ]
                )}
              />
            </>
          )}

          {/* DEVICES */}

          {devices.length > 0 && (
            <>
              <ReportSectionTitle>
                Device Performance
              </ReportSectionTitle>

              <DataTable
                columns={[
                  "Device",
                  "Impressions",
                  "Clicks",
                  "CTR",
                  "Spend",
                  "Conversions",
                  "CPA",
                ]}
                rows={devices.map(
                  (device) => [
                    device.device || "—",
                    displayNumber(
                      device.impressions
                    ),
                    displayNumber(
                      device.clicks
                    ),
                    `${displayNumber(
                      device.ctr
                    )}%`,
                    money(device.spend),
                    displayNumber(
                      device.conversions
                    ),
                    money(
                      device.cost_per_conversion
                    ),
                  ]
                )}
              />
            </>
          )}

          {/* NETWORK */}

          {networks.length > 0 && (
            <>
              <ReportSectionTitle>
                Network Performance
              </ReportSectionTitle>

              <DataTable
                columns={[
                  "Network",
                  "Impressions",
                  "Clicks",
                  "CTR",
                  "Spend",
                  "Conversions",
                  "CPA",
                ]}
                rows={networks.map(
                  (network) => [
                    network.network || "—",
                    displayNumber(
                      network.impressions
                    ),
                    displayNumber(
                      network.clicks
                    ),
                    `${displayNumber(
                      network.ctr
                    )}%`,
                    money(network.spend),
                    displayNumber(
                      network.conversions
                    ),
                    money(
                      network.cost_per_conversion
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
              title="Keyword Insights"
              text={
                report.keyword_insights
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
              title="Keyword Changes"
              text={
                report.keyword_changes
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
                report.lead_followup_recommendation
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
                report.actual_ad_spend
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
            RUVIGZA Digital Technologies • Google Ads Campaign Report
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
          .google-report-print-actions {
            display: none !important;
          }

          .admin-main {
            margin-left: 0 !important;
            padding: 0 !important;
          }

          .google-report-document {
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
          .google-report-document {
            border-radius: 7px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   REPORT UI HELPERS
========================================================= */

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
          minWidth: 700,
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

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function GoogleAdsReports() {
  const [mode, setMode] = useState("list");

  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [report, setReport] = useState({
    ...EMPTY_REPORT,
  });

  const [ads, setAds] = useState([
    { ...EMPTY_AD },
  ]);

  const [keywords, setKeywords] =
    useState([
      { ...EMPTY_KEYWORD },
    ]);

  const [locations, setLocations] =
    useState([
      { ...EMPTY_LOCATION },
    ]);

  const [devices, setDevices] =
    useState([
      { ...EMPTY_DEVICE },
    ]);

  const [networks, setNetworks] =
    useState([
      { ...EMPTY_NETWORK },
    ]);

  const [selectedReport, setSelectedReport] =
    useState(null);

  const [selectedAds, setSelectedAds] =
    useState([]);

  const [selectedKeywords, setSelectedKeywords] =
    useState([]);

  const [selectedLocations, setSelectedLocations] =
    useState([]);

  const [selectedDevices, setSelectedDevices] =
    useState([]);

  const [selectedNetworks, setSelectedNetworks] =
    useState([]);

  /* =======================================================
     LOAD COMPLETED GOOGLE ADS CLIENTS
  ======================================================= */

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
          completed_at,
          leads (
            id,
            name,
            business_category,
            phone,
            email,
            website
          )
        `)
        .eq("status", "Completed")
        .eq("service_type", "google_ads")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Completed Google Ads clients fetch error:",
          error
        );

        setClients([]);
        return;
      }

      const completedClients = (
        data || []
      )
        .map((assignment) => ({
          id: assignment.lead_id,
          lead_id: assignment.lead_id,
          assignment_id: assignment.id,
          service_type:
            assignment.service_type,
          status: assignment.status,
          completed_at:
            assignment.completed_at,
          name:
            assignment.leads?.name ||
            "Unknown Client",
          business_category:
            assignment.leads
              ?.business_category || "",
          phone:
            assignment.leads?.phone || "",
          email:
            assignment.leads?.email || "",
          website:
            assignment.leads?.website || "",
        }))
        .filter(
          (client) =>
            client.lead_id &&
            client.assignment_id
        );

      setClients(completedClients);
    } catch (error) {
      console.error(
        "Load completed Google Ads clients error:",
        error
      );

      setClients([]);
    }
  };

  /* =======================================================
     LOAD REPORTS
  ======================================================= */

  const loadReports = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("google_ads_reports")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

        console.log("GOOGLE ADS REPORTS DATA:", data);
        console.log("GOOGLE ADS REPORTS ERROR:", error);

      if (error) {
        console.error(
          "Google Ads reports fetch error:",
          error
        );

        alert(
          `Unable to load Google Ads reports.\n\n${error.message}`
        );

        setReports([]);
        return;
      }

      setReports(data || []);
    } catch (error) {
      console.error(
        "Load Google Ads reports error:",
        error
      );

      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadReports();
  }, []);

  /* =======================================================
     RESET
  ======================================================= */

  const resetForm = () => {
    setReport({
      ...EMPTY_REPORT,
      report_date:
        new Date()
          .toISOString()
          .split("T")[0],
    });

    setAds([
      { ...EMPTY_AD },
    ]);

    setKeywords([
      { ...EMPTY_KEYWORD },
    ]);

    setLocations([
      { ...EMPTY_LOCATION },
    ]);

    setDevices([
      { ...EMPTY_DEVICE },
    ]);

    setNetworks([
      { ...EMPTY_NETWORK },
    ]);
  };

  const startCreate = () => {
    resetForm();

    setSelectedReport(null);

    setSelectedAds([]);
    setSelectedKeywords([]);
    setSelectedLocations([]);
    setSelectedDevices([]);
    setSelectedNetworks([]);

    setMode("create");
  };

  /* =======================================================
     OPEN REPORT
  ======================================================= */

  const openReport = async (reportRow) => {
    setLoading(true);

    try {
      const [
        adsResult,
        keywordsResult,
        locationsResult,
        devicesResult,
        networksResult,
      ] = await Promise.all([
        supabase
          .from("google_ads_ad_performance")
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from(
            "google_ads_keyword_performance"
          )
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from(
            "google_ads_location_performance"
          )
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from(
            "google_ads_device_performance"
          )
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from(
            "google_ads_network_performance"
          )
          .select("*")
          .eq("report_id", reportRow.id)
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (adsResult.error) {
        console.error(
          "Google Ads performance fetch error:",
          adsResult.error
        );
      }

      if (keywordsResult.error) {
        console.error(
          "Google keyword performance fetch error:",
          keywordsResult.error
        );
      }

      if (locationsResult.error) {
        console.error(
          "Google location performance fetch error:",
          locationsResult.error
        );
      }

      if (devicesResult.error) {
        console.error(
          "Google device performance fetch error:",
          devicesResult.error
        );
      }

      if (networksResult.error) {
        console.error(
          "Google network performance fetch error:",
          networksResult.error
        );
      }

      setSelectedReport(reportRow);

      setSelectedAds(
        adsResult.data || []
      );

      setSelectedKeywords(
        keywordsResult.data || []
      );

      setSelectedLocations(
        locationsResult.data || []
      );

      setSelectedDevices(
        devicesResult.data || []
      );

      setSelectedNetworks(
        networksResult.data || []
      );

      setMode("view");
    } catch (error) {
      console.error(
        "Open Google Ads report error:",
        error
      );

      alert(
        "Unable to open Google Ads report."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     EDIT
  ======================================================= */

  const startEdit = () => {
    if (!selectedReport) return;

    setReport({
      ...EMPTY_REPORT,
      ...selectedReport,
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

    setKeywords(
      selectedKeywords.length
        ? selectedKeywords.map((row) =>
            normalizeRow(
              row,
              EMPTY_KEYWORD
            )
          )
        : [{ ...EMPTY_KEYWORD }]
    );

    setLocations(
      selectedLocations.length
        ? selectedLocations.map((row) =>
            normalizeRow(
              row,
              EMPTY_LOCATION
            )
          )
        : [{ ...EMPTY_LOCATION }]
    );

    setDevices(
      selectedDevices.length
        ? selectedDevices.map((row) =>
            normalizeRow(
              row,
              EMPTY_DEVICE
            )
          )
        : [{ ...EMPTY_DEVICE }]
    );

    setNetworks(
      selectedNetworks.length
        ? selectedNetworks.map((row) =>
            normalizeRow(
              row,
              EMPTY_NETWORK
            )
          )
        : [{ ...EMPTY_NETWORK }]
    );

    setMode("edit");
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateReport = () => {
    if (!report.client_assignment_id) {
      alert("Please select a client.");
      return false;
    }

    if (!report.lead_id) {
      alert("Client lead information is missing.");
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
      alert(
        "Please enter a valid ad name."
      );
      return false;
    }

    return true;
  };

  /* =======================================================
     BUILD EXECUTIVE SUMMARY
  ======================================================= */

  const buildExecutiveSummary = () => {
    return [
      `Client: ${report.client_name || "—"}`,
      `From Date: ${
        report.report_period_start || "—"
      }`,
      `To Date: ${
        report.report_period_end || "—"
      }`,
      `Campaign: ${
        report.campaign_name || "—"
      }`,
      `Total Spend: ${money(
        report.total_ad_spend
      )}`,
      `Reach: ${displayNumber(
        report.reach
      )}`,
      `Impressions: ${displayNumber(
        report.impressions
      )}`,
      `Clicks: ${displayNumber(
        report.clicks
      )}`,
      `CTR: ${displayNumber(
        report.ctr
      )}%`,
      `Conversions: ${displayNumber(
        report.leads_results
      )}`,
      `Cost Per Conversion: ${money(
        report.cost_per_lead
      )}`,
      `Total Leads: ${displayNumber(
        report.total_leads_generated
      )}`,
      `Qualified Leads: ${displayNumber(
        report.qualified_leads
      )}`,
      `Lead-to-Customer Rate: ${displayNumber(
        report.lead_to_customer_rate
      )}%`,
    ].join("\n");
  };

  /* =======================================================
     SAVE CHILD ROWS
  ======================================================= */

  const saveAdRows = async (reportId) => {
    const validRows = ads.filter(
      (row) =>
        row.ad_name &&
        String(row.ad_name).trim()
    );

    if (!validRows.length) return;

    const payload = validRows.map(
      (row) => {
        const impressions =
          integerValue(row.impressions);

        const clicks =
          integerValue(row.clicks);

        const spend =
          numberValue(row.spend);

        const conversions =
          integerValue(row.conversions);

        const ctr =
          row.ctr !== ""
            ? numberValue(row.ctr)
            : impressions > 0
            ? (clicks / impressions) * 100
            : 0;

        const cpc =
          row.cpc !== ""
            ? numberValue(row.cpc)
            : clicks > 0
            ? spend / clicks
            : 0;

        const cpm =
          row.cpm !== ""
            ? numberValue(row.cpm)
            : impressions > 0
            ? (spend / impressions) *
              1000
            : 0;

        const costPerConversion =
          row.cost_per_conversion !== ""
            ? numberValue(
                row.cost_per_conversion
              )
            : conversions > 0
            ? spend / conversions
            : 0;

        const conversionRate =
          row.conversion_rate !== ""
            ? numberValue(
                row.conversion_rate
              )
            : clicks > 0
            ? (conversions / clicks) *
              100
            : 0;

        return {
          report_id: reportId,
          campaign_name:
            row.campaign_name ||
            report.campaign_name ||
            null,
          ad_group_name:
            row.ad_group_name || null,
          ad_name:
            String(row.ad_name).trim(),
          ad_format:
            row.ad_format || null,
          spend,
          impressions,
          reach: integerValue(row.reach),
          clicks,
          ctr,
          cpc,
          cpm,
          conversions,
          cost_per_conversion:
            costPerConversion,
          conversion_rate:
            conversionRate,
        };
      }
    );

    const { error } = await supabase
      .from(
        "google_ads_ad_performance"
      )
      .insert(payload);

    if (error) {
      throw new Error(
        `Ad performance save failed: ${error.message}`
      );
    }
  };

  const saveKeywordRows = async (
    reportId
  ) => {
    const validRows =
      keywords.filter(
        (row) =>
          row.keyword &&
          String(row.keyword).trim()
      );

    if (!validRows.length) return;

    const payload = validRows.map(
      (row) => {
        const impressions =
          integerValue(row.impressions);

        const clicks =
          integerValue(row.clicks);

        const spend =
          numberValue(row.spend);

        const conversions =
          integerValue(row.conversions);

        const ctr =
          row.ctr !== ""
            ? numberValue(row.ctr)
            : impressions > 0
            ? (clicks / impressions) * 100
            : 0;

        const avgCpc =
          row.avg_cpc !== ""
            ? numberValue(row.avg_cpc)
            : clicks > 0
            ? spend / clicks
            : 0;

        const costPerConversion =
          row.cost_per_conversion !== ""
            ? numberValue(
                row.cost_per_conversion
              )
            : conversions > 0
            ? spend / conversions
            : 0;

        const conversionRate =
          row.conversion_rate !== ""
            ? numberValue(
                row.conversion_rate
              )
            : clicks > 0
            ? (conversions / clicks) *
              100
            : 0;

        return {
          report_id: reportId,
          campaign_name:
            row.campaign_name ||
            report.campaign_name ||
            null,
          ad_group_name:
            row.ad_group_name || null,
          keyword:
            String(row.keyword).trim(),
          match_type:
            row.match_type || null,
          impressions,
          clicks,
          ctr,
          avg_cpc: avgCpc,
          spend,
          conversions,
          cost_per_conversion:
            costPerConversion,
          conversion_rate:
            conversionRate,
        };
      }
    );

    const { error } = await supabase
      .from(
        "google_ads_keyword_performance"
      )
      .insert(payload);

    if (error) {
      throw new Error(
        `Keyword performance save failed: ${error.message}`
      );
    }
  };

  const saveLocationRows = async (
    reportId
  ) => {
    const validRows =
      locations.filter(
        (row) =>
          row.location &&
          String(row.location).trim()
      );

    if (!validRows.length) return;

    const payload = validRows.map(
      (row) => {
        const impressions =
          integerValue(row.impressions);

        const clicks =
          integerValue(row.clicks);

        const spend =
          numberValue(row.spend);

        const conversions =
          integerValue(row.conversions);

        return {
          report_id: reportId,
          location:
            String(row.location).trim(),
          impressions,
          clicks,
          ctr:
            row.ctr !== ""
              ? numberValue(row.ctr)
              : impressions > 0
              ? (clicks / impressions) *
                100
              : 0,
          spend,
          conversions,
          cost_per_conversion:
            row.cost_per_conversion !== ""
              ? numberValue(
                  row.cost_per_conversion
                )
              : conversions > 0
              ? spend / conversions
              : 0,
          conversion_rate:
            row.conversion_rate !== ""
              ? numberValue(
                  row.conversion_rate
                )
              : clicks > 0
              ? (conversions / clicks) *
                100
              : 0,
        };
      }
    );

    const { error } = await supabase
      .from(
        "google_ads_location_performance"
      )
      .insert(payload);

    if (error) {
      throw new Error(
        `Location performance save failed: ${error.message}`
      );
    }
  };

  const saveDeviceRows = async (
    reportId
  ) => {
    const validRows =
      devices.filter(
        (row) =>
          row.device &&
          String(row.device).trim()
      );

    if (!validRows.length) return;

    const payload = validRows.map(
      (row) => {
        const impressions =
          integerValue(row.impressions);

        const clicks =
          integerValue(row.clicks);

        const spend =
          numberValue(row.spend);

        const conversions =
          integerValue(row.conversions);

        return {
          report_id: reportId,
          device:
            String(row.device).trim(),
          impressions,
          clicks,
          ctr:
            row.ctr !== ""
              ? numberValue(row.ctr)
              : impressions > 0
              ? (clicks / impressions) *
                100
              : 0,
          spend,
          conversions,
          cost_per_conversion:
            row.cost_per_conversion !== ""
              ? numberValue(
                  row.cost_per_conversion
                )
              : conversions > 0
              ? spend / conversions
              : 0,
          conversion_rate:
            row.conversion_rate !== ""
              ? numberValue(
                  row.conversion_rate
                )
              : clicks > 0
              ? (conversions / clicks) *
                100
              : 0,
        };
      }
    );

    const { error } = await supabase
      .from(
        "google_ads_device_performance"
      )
      .insert(payload);

    if (error) {
      throw new Error(
        `Device performance save failed: ${error.message}`
      );
    }
  };

  const saveNetworkRows = async (
    reportId
  ) => {
    const validRows =
      networks.filter(
        (row) =>
          row.network &&
          String(row.network).trim()
      );

    if (!validRows.length) return;

    const payload = validRows.map(
      (row) => {
        const impressions =
          integerValue(row.impressions);

        const clicks =
          integerValue(row.clicks);

        const spend =
          numberValue(row.spend);

        const conversions =
          integerValue(row.conversions);

        return {
          report_id: reportId,
          network:
            String(row.network).trim(),
          impressions,
          clicks,
          ctr:
            row.ctr !== ""
              ? numberValue(row.ctr)
              : impressions > 0
              ? (clicks / impressions) *
                100
              : 0,
          spend,
          conversions,
          cost_per_conversion:
            row.cost_per_conversion !== ""
              ? numberValue(
                  row.cost_per_conversion
                )
              : conversions > 0
              ? spend / conversions
              : 0,
          conversion_rate:
            row.conversion_rate !== ""
              ? numberValue(
                  row.conversion_rate
                )
              : clicks > 0
              ? (conversions / clicks) *
                100
              : 0,
        };
      }
    );

    const { error } = await supabase
      .from(
        "google_ads_network_performance"
      )
      .insert(payload);

    if (error) {
      throw new Error(
        `Network performance save failed: ${error.message}`
      );
    }
  };

  /* =======================================================
     SAVE / UPDATE REPORT
  ======================================================= */

  const saveReport = async (event) => {
    event.preventDefault();

    if (!validateReport()) {
      return;
    }

    setSaving(true);

    try {
      const selectedClient =
        clients.find(
          (client) =>
            String(client.assignment_id) ===
            String(
              report.client_assignment_id
            )
        );

      const reportPayload = {
        client_assignment_id:
          report.client_assignment_id
            ? Number(
                report.client_assignment_id
              )
            : null,

        lead_id:
          report.lead_id ||
          selectedClient?.lead_id ||
          null,

        client_name:
          report.client_name ||
          selectedClient?.name ||
          null,

        business_category:
          report.business_category ||
          selectedClient?.business_category ||
          null,

        campaign_name:
          report.campaign_name.trim(),

        campaign_objective:
          report.campaign_objective ||
          null,

        campaign_status:
          "Completed",

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
          numberValue(report.frequency),

        clicks:
          integerValue(report.clicks),

        ctr:
          numberValue(report.ctr),

        cpc:
          numberValue(report.cpc),

        cpm:
          numberValue(report.cpm),

        leads_results:
          integerValue(
            report.leads_results
          ),

        cost_per_lead:
          numberValue(
            report.cost_per_lead
          ),

        landing_page_views:
          integerValue(
            report.landing_page_views
          ),

        conversion_rate:
          numberValue(
            report.conversion_rate
          ),

        total_leads_generated:
          integerValue(
            report.total_leads_generated
          ),

        qualified_leads:
          integerValue(
            report.qualified_leads
          ),

        unqualified_leads:
          integerValue(
            report.unqualified_leads
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

        lead_to_customer_rate:
          numberValue(
            report.lead_to_customer_rate
          ),

        cost_per_qualified_lead:
          numberValue(
            report.cost_per_qualified_lead
          ),

        cost_per_customer:
          numberValue(
            report.cost_per_customer
          ),

        planned_ad_budget:
          numberValue(
            report.planned_ad_budget
          ),

        actual_ad_spend:
          numberValue(
            report.actual_ad_spend
          ),

        remaining_budget:
          numberValue(
            report.remaining_budget
          ),

        management_fee:
          numberValue(
            report.management_fee
          ),

        total_client_billing:
          numberValue(
            report.total_client_billing
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

        keyword_insights:
          report.keyword_insights ||
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

        keyword_changes:
          report.keyword_changes ||
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

        lead_followup_recommendation:
          report.lead_followup_recommendation ||
          null,

        executive_summary:
          buildExecutiveSummary(),

        updated_at:
          new Date().toISOString(),
      };

      let reportId =
        selectedReport?.id || null;

      /* UPDATE */

      if (
        mode === "edit" &&
        reportId
      ) {
        const { error } =
          await supabase
            .from("google_ads_reports")
            .update(reportPayload)
            .eq("id", reportId);

        if (error) {
          throw error;
        }

        const childTables = [
          "google_ads_ad_performance",
          "google_ads_keyword_performance",
          "google_ads_location_performance",
          "google_ads_device_performance",
          "google_ads_network_performance",
        ];

        await Promise.all(
          childTables.map((table) =>
            supabase
              .from(table)
              .delete()
              .eq(
                "report_id",
                reportId
              )
          )
        );
      } else {
        /* INSERT */

        const { data, error } =
          await supabase
            .from("google_ads_reports")
            .insert(reportPayload)
            .select()
            .single();

        if (error) {
          throw error;
        }

        reportId = data.id;
      }

      if (!reportId) {
        throw new Error(
          "Google Ads report ID was not returned."
        );
      }

      /* CHILD DATA */

      await saveAdRows(reportId);

      await saveKeywordRows(reportId);

      await saveLocationRows(reportId);

      await saveDeviceRows(reportId);

      await saveNetworkRows(reportId);

      alert(
        mode === "edit"
          ? "Google Ads report updated successfully."
          : "Google Ads report saved successfully."
      );

      await loadReports();

      await openReportById(reportId);
    } catch (error) {
      console.error(
        "Save Google Ads report error:",
        error
      );

      alert(
        `Unable to save Google Ads report.\n\n${
          error.message ||
          "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     OPEN SAVED REPORT
  ======================================================= */

  const openReportById = async (
    reportId
  ) => {
    try {
      const { data, error } =
        await supabase
          .from("google_ads_reports")
          .select("*")
          .eq("id", reportId)
          .single();

      if (error) {
        throw error;
      }

      await openReport(data);
    } catch (error) {
      console.error(
        "Open saved Google Ads report error:",
        error
      );

      setMode("list");
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const deleteReport = async (
    reportRow
  ) => {
    const confirmed =
      window.confirm(
        `Delete report "${reportRow.campaign_name}"?\n\nThis will permanently delete the report and its performance data.`
      );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from("google_ads_reports")
          .delete()
          .eq("id", reportRow.id);

      if (error) {
        throw error;
      }

      alert(
        "Google Ads report deleted successfully."
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
        "Delete Google Ads report error:",
        error
      );

      alert(
        `Unable to delete report.\n\n${
          error.message ||
          "Unknown error"
        }`
      );
    }
  };

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredReports = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return reports;
    }

    return reports.filter(
      (row) => {
        return (
          String(
            row.client_name || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            row.campaign_name || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            row.business_category || ""
          )
            .toLowerCase()
            .includes(query)
        );
      }
    );
  }, [reports, search]);

  /* =======================================================
     SELECTED CLIENT
  ======================================================= */

  const selectedClient = useMemo(() => {
    if (!selectedReport) {
      return null;
    }

    return (
      clients.find(
        (client) =>
          String(client.assignment_id) ===
          String(
            selectedReport.client_assignment_id
          )
      ) || null
    );
  }, [
    clients,
    selectedReport,
  ]);

  /* =======================================================
     CREATE / EDIT MODE
  ======================================================= */

  if (
    mode === "create" ||
    mode === "edit"
  ) {
    return (
      <ReportForm
        report={report}
        setReport={setReport}
        ads={ads}
        setAds={setAds}
        keywords={keywords}
        setKeywords={setKeywords}
        locations={locations}
        setLocations={setLocations}
        devices={devices}
        setDevices={setDevices}
        networks={networks}
        setNetworks={setNetworks}
        clients={clients}
        onSave={saveReport}
        onCancel={() =>
          setMode("list")
        }
        saving={saving}
        editing={mode === "edit"}
      />
    );
  }

  /* =======================================================
     VIEW MODE
  ======================================================= */

  if (
    mode === "view" &&
    selectedReport
  ) {
    return (
      <ReportView
        report={selectedReport}
        client={selectedClient}
        ads={selectedAds}
        keywords={selectedKeywords}
        locations={selectedLocations}
        devices={selectedDevices}
        networks={selectedNetworks}
        onBack={() =>
          setMode("list")
        }
        onEdit={startEdit}
      />
    );
  }

  /* =======================================================
     LIST MODE
  ======================================================= */

  return (
    <div>
      <PageHeader
        title="Google Ads Reports"
        subtitle="Create, manage and download Google Ads campaign reports."
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

      {/* REPORTS TABLE */}

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
              Google Ads Reports
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
        ) : filteredReports.length ===
          0 ? (
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
              No Google Ads reports found
            </div>

            <div
              style={{
                fontSize: 12,
                color: C.inkFaint,
                marginBottom: 15,
              }}
            >
              Create your first Google Ads
              campaign report to start
              building report history.
            </div>

            <Button
              icon={Plus}
              onClick={startCreate}
            >
              Create Google Ads Report
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
                minWidth: 850,
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
                  (row) => (
                    <tr
                      key={row.id}
                      style={{
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        openReport(row)
                      }
                    >
                      <td
                        style={{
                          padding:
                            "12px 9px",
                          borderBottom: `1px solid ${C.borderSoft}`,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {row.client_name ||
                          "Unknown Client"}
                      </td>

                      <td
                        style={{
                          padding:
                            "12px 9px",
                          borderBottom: `1px solid ${C.borderSoft}`,
                          fontSize: 12,
                          color: C.inkSoft,
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
                          color: C.inkSoft,
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
                          row.actual_ad_spend ??
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
                          row.total_leads_generated ??
                            row.leads_results
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
                          {row.campaign_status ||
                            "—"}
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
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <style>{`
        @media (max-width: 700px) {
          .google-report-view {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}