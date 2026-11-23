
import React, { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  UserPlus,
  Plus,
} from "lucide-react";

import {
  C,
  Panel,
  PageHeader,
  Button,
  inputStyle,
} from "./ui";

import {
  parseExcelFile,
  guessMapping,
  applyMapping,
} from "./excelUtils";

import {
  mergeLeadsFromImport,
  createLead,
  getAllLeads,
} from "./leadsDatabase";

import { addUploadHistoryRecord } from "./mockDatabase";

// =====================================================
// EXISTING EXCEL IMPORT FIELDS
// =====================================================
const FIELD_LABELS = [
  ["name", "Name (required)"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["source", "Source"],
  ["status", "Status"],
  ["packageTier", "Package"],
];

// =====================================================
// MANUAL LEAD INITIAL STATE
// Only six fields
// =====================================================
const INITIAL_MANUAL_LEAD = {
  businessName: "",
  category: "",
  address: "",
  contact: "",
  website: "",
  source: "Manual",
};

// =====================================================
// COMMON STYLES
// =====================================================
const fieldStyle = {
  ...inputStyle,
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: C.inkSoft,
  marginBottom: 5,
  fontWeight: 500,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

// =====================================================
// NORMALIZE VALUES FOR DUPLICATE CHECK
// =====================================================
function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeWebsite(website) {
  return String(website || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

// =====================================================
// UPLOAD EXCEL COMPONENT
// =====================================================
export default function UploadExcel({ onImported }) {
  // ---------------------------------------------------
  // EXCEL IMPORT STATE
  // ---------------------------------------------------
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ---------------------------------------------------
  // MANUAL LEAD STATE
  // ---------------------------------------------------
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualLead, setManualLead] = useState({
    ...INITIAL_MANUAL_LEAD,
  });
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [manualBusy, setManualBusy] = useState(false);

  // ===================================================
  // EXCEL FILE HANDLER
  // ===================================================
  const handleFile = async (file) => {
    setError("");
    setPreview(null);

    try {
      const { headers: hdrs, rows } = await parseExcelFile(file);

      setHeaders(hdrs);
      setRawRows(rows);
      setMapping(guessMapping(hdrs));
      setFileName(file.name);
    } catch (err) {
      setError(err.message || "Unable to read the selected file.");
    }
  };

  // ===================================================
  // EXCEL PREVIEW
  // ===================================================
  const runPreview = async () => {
    if (!rawRows || !mapping?.name) {
      setError("Please map the Name column before continuing.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const mappedRows = applyMapping(rawRows, mapping);
      setPreview({ mappedRows });
    } catch (err) {
      setError(err.message || "Unable to generate import preview.");
    } finally {
      setBusy(false);
    }
  };

  // ===================================================
  // CONFIRM EXCEL IMPORT
  // Existing import workflow preserved
  // ===================================================
  const confirmImport = async () => {
    setBusy(true);
    setError("");

    try {
      const mappedRows = applyMapping(rawRows, mapping);
      const result = await mergeLeadsFromImport(mappedRows);

      await addUploadHistoryRecord({
        fileName,
        added: result.added,
        updated: result.updated,
        skipped: result.skipped,
        total: result.total,
      });

      if (onImported) {
        await onImported();
      }

      resetExcel();
    } catch (err) {
      setError(err.message || "Unable to import leads.");
    } finally {
      setBusy(false);
    }
  };

  // ===================================================
  // RESET EXCEL IMPORT
  // ===================================================
  const resetExcel = () => {
    setFileName("");
    setHeaders([]);
    setRawRows(null);
    setMapping(null);
    setPreview(null);
    setError("");
  };

  // ===================================================
  // MANUAL FORM HANDLER
  // ===================================================
  const handleManualChange = (event) => {
    const { name, value } = event.target;

    setManualLead((previous) => ({
      ...previous,
      [name]: value,
    }));

    setManualError("");
    setManualSuccess("");
  };

  // ===================================================
  // RESET MANUAL FORM
  // ===================================================
  const resetManualForm = () => {
    setManualLead({ ...INITIAL_MANUAL_LEAD });
    setManualError("");
    setManualSuccess("");
  };

  // ===================================================
  // ADD MANUAL LEAD
  // ===================================================
  const handleAddManualLead = async (event) => {
    event.preventDefault();

    setManualError("");
    setManualSuccess("");

    const businessName = manualLead.businessName.trim();
    const category = manualLead.category.trim();
    const address = manualLead.address.trim();
    const contact = manualLead.contact.trim();
    const website = manualLead.website.trim();
    const source = manualLead.source.trim() || "Manual";

    if (!businessName) {
      setManualError("Business Name is required.");
      return;
    }

    if (contact && normalizePhone(contact).length < 10) {
      setManualError("Please enter a valid contact number.");
      return;
    }

    if (website) {
      try {
        const url = new URL(
          /^https?:\/\//i.test(website)
            ? website
            : `https://${website}`
        );

        if (!url.hostname.includes(".")) {
          throw new Error("Invalid website");
        }
      } catch {
        setManualError("Please enter a valid website URL.");
        return;
      }
    }

    setManualBusy(true);

    try {
      // -----------------------------------------------
      // Duplicate check against existing CRM leads
      // -----------------------------------------------
      if (contact) {
        const existingLeads = await getAllLeads();
        const normalizedContact = normalizePhone(contact);

        const duplicate = existingLeads.find(
          (lead) =>
            normalizedContact &&
            normalizePhone(lead.phone) === normalizedContact
        );

        if (duplicate) {
          setManualError(
            `This contact number already exists for "${duplicate.businessName || duplicate.name}". Please check the existing lead.`
          );
          return;
        }
      }

      // -----------------------------------------------
      // Create lead using existing database function
      // `name` is populated because CRM requires it.
      // Contact maps to phone; category maps to
      // business_category.
      // -----------------------------------------------
      const payload = {
        name: businessName,
        businessName,
        businessCategory: category,
        address,
        phone: contact,
        website,
        source,
        status: "New",
      };

      await createLead(payload);

      if (onImported) {
        await onImported();
      }

      setManualSuccess("Lead added successfully.");
      setManualLead({ ...INITIAL_MANUAL_LEAD });
    } catch (err) {
      console.error("Manual lead creation error:", err);

      setManualError(
        err.message ||
          "Unable to add lead. Please check your access and try again."
      );
    } finally {
      setManualBusy(false);
    }
  };

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <div>
      <PageHeader
        title="Import Excel"
        subtitle="Import leads from Excel/CSV or add a lead manually."
      />

      {/* =================================================
          MANUAL LEAD SECTION
      ================================================= */}
      <Panel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <UserPlus size={21} color={C.primary} />

            <div>
              <div style={{ fontWeight: 600, color: C.ink }}>
                Add Lead Manually
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: C.inkSoft,
                  marginTop: 3,
                }}
              >
                Add a business lead directly to your CRM.
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              setShowManualForm((previous) => !previous);
              setManualError("");
              setManualSuccess("");
            }}
            variant={showManualForm ? "ghost" : undefined}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={16} />
              {showManualForm ? "Close Form" : "Add New Lead"}
            </span>
          </Button>
        </div>

        {showManualForm && (
          <form
            onSubmit={(event) => event.preventDefault()}
            style={{ marginTop: 22 }}
          >
            <div style={gridStyle}>
              {/* Business Name */}
              <div>
                <label style={labelStyle}>
                  Business Name *
                </label>

                <input
                  name="businessName"
                  value={manualLead.businessName}
                  onChange={handleManualChange}
                  placeholder="Enter business name"
                  style={fieldStyle}
                  maxLength={200}
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>
                  Category
                </label>

                <input
                  name="category"
                  value={manualLead.category}
                  onChange={handleManualChange}
                  placeholder="e.g. Gym, Clinic, Restaurant"
                  style={fieldStyle}
                  maxLength={150}
                />
              </div>

              {/* Contact */}
              <div>
                <label style={labelStyle}>
                  Contact Number
                </label>

                <input
                  name="contact"
                  type="tel"
                  value={manualLead.contact}
                  onChange={handleManualChange}
                  placeholder="Enter contact number"
                  style={fieldStyle}
                  maxLength={20}
                />
              </div>

              {/* Website */}
              <div>
                <label style={labelStyle}>
                  Website
                </label>

                <input
                  name="website"
                  type="text"
                  value={manualLead.website}
                  onChange={handleManualChange}
                  placeholder="https://example.com"
                  style={fieldStyle}
                  maxLength={500}
                />
              </div>

              {/* Source */}
              <div>
                <label style={labelStyle}>
                  Source
                </label>

                <select
                  name="source"
                  value={manualLead.source}
                  onChange={handleManualChange}
                  style={fieldStyle}
                >
                  <option value="Manual">Manual</option>
                  <option value="Offline Visit">Offline Visit</option>
                  <option value="Referral">Referral</option>
                  <option value="Website">Website</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Cold Calling">Cold Calling</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>
                Address
              </label>

              <textarea
                name="address"
                value={manualLead.address}
                onChange={handleManualChange}
                placeholder="Enter business address"
                rows={3}
                maxLength={1000}
                style={{
                  ...fieldStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Feedback */}
            {manualError && (
              <div
                role="alert"
                style={{
                  color: C.danger,
                  fontSize: 13,
                  marginTop: 14,
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${C.danger}`,
                }}
              >
                {manualError}
              </div>
            )}

            {manualSuccess && (
              <div
                role="status"
                style={{
                  color: C.primary,
                  fontSize: 13,
                  marginTop: 14,
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={17} />
                {manualSuccess}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 18,
              }}
            >
              <Button
               onClick={handleAddManualLead}
               disabled={manualBusy}
              >
             {manualBusy ? "Saving Lead..." : "Save Lead"}
            </Button>

              <Button
                type="button"
                variant="ghost"
                disabled={manualBusy}
                onClick={resetManualForm}
              >
                Clear Form
              </Button>
            </div>
          </form>
        )}
      </Panel>

      {/* =================================================
          EXISTING EXCEL IMPORT SECTION
      ================================================= */}
      <div style={{ marginTop: 20 }}>
        {!rawRows && (
          <Panel>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 14,
                color: C.ink,
              }}
            >
              Import Leads from Excel / CSV
            </div>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border: `1.5px dashed ${C.border}`,
                borderRadius: 8,
                padding: "40px 20px",
                cursor: "pointer",
                color: C.inkSoft,
              }}
            >
              <UploadCloud size={26} color={C.primary} />

              <span style={{ fontWeight: 500, color: C.ink }}>
                Click to choose an Excel or CSV file
              </span>

              <span style={{ fontSize: 12 }}>
                .xlsx, .xls, or .csv
              </span>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    handleFile(file);
                  }

                  event.target.value = "";
                }}
              />
            </label>

            {error && (
              <div
                style={{
                  color: C.danger,
                  fontSize: 13,
                  marginTop: 10,
                }}
              >
                {error}
              </div>
            )}
          </Panel>
        )}

        {/* EXCEL COLUMN MAPPING */}
        {rawRows && !preview && (
          <Panel>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <FileSpreadsheet size={17} color={C.primary} />

              <span style={{ fontWeight: 500 }}>
                {fileName}
              </span>

              <span
                style={{
                  color: C.inkFaint,
                  fontSize: 13,
                }}
              >
                · {rawRows.length} rows detected
              </span>
            </div>

            <div
              style={{
                fontSize: 13,
                color: C.inkSoft,
                marginBottom: 10,
              }}
            >
              Match each column in your file to a CRM field.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {FIELD_LABELS.map(([field, label]) => (
                <div key={field}>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.inkFaint,
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>

                  <select
                    value={mapping?.[field] || ""}
                    onChange={(event) =>
                      setMapping((previous) => ({
                        ...previous,
                        [field]: event.target.value,
                      }))
                    }
                    style={fieldStyle}
                  >
                    <option value="">Don't import</option>

                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {error && (
              <div
                style={{
                  color: C.danger,
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Button
                onClick={runPreview}
                disabled={!mapping?.name || busy}
              >
                {busy ? "Preparing..." : "Preview Import"}
              </Button>

              <Button variant="ghost" onClick={resetExcel}>
                Cancel
              </Button>
            </div>

            {!mapping?.name && (
              <div
                style={{
                  fontSize: 12,
                  color: C.danger,
                  marginTop: 8,
                }}
              >
                Map a Name column to continue.
              </div>
            )}
          </Panel>
        )}

        {/* EXCEL IMPORT PREVIEW */}
        {preview && (
          <Panel>
            <div
              style={{
                fontSize: 13,
                color: C.inkSoft,
                marginBottom: 12,
              }}
            >
              Ready to import{" "}
              <strong>{preview.mappedRows.length}</strong> rows from{" "}
              <strong>{fileName}</strong>. Existing leads matched by
              phone or email may be updated.
            </div>

            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                border: `1px solid ${C.borderSoft}`,
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <table
                style={{
                  width: "100%",
                  fontSize: 12,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      color: C.inkFaint,
                      textAlign: "left",
                      position: "sticky",
                      top: 0,
                      background: C.panel,
                    }}
                  >
                    <th style={{ padding: 8 }}>Name</th>
                    <th style={{ padding: 8 }}>Phone</th>
                    <th style={{ padding: 8 }}>Email</th>
                  </tr>
                </thead>

                <tbody>
                  {preview.mappedRows.slice(0, 25).map((row, index) => (
                    <tr
                      key={index}
                      style={{
                        borderTop: `1px solid ${C.borderSoft}`,
                      }}
                    >
                      <td style={{ padding: 8 }}>
                        {row.name || "—"}
                      </td>

                      <td style={{ padding: 8 }}>
                        {row.phone || "—"}
                      </td>

                      <td style={{ padding: 8 }}>
                        {row.email || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.mappedRows.length > 25 && (
              <div
                style={{
                  fontSize: 12,
                  color: C.inkFaint,
                  marginBottom: 12,
                }}
              >
                Showing the first 25 rows in preview.
              </div>
            )}

            {error && (
              <div
                style={{
                  color: C.danger,
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Button
                onClick={confirmImport}
                disabled={busy}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={16} />
                  {busy ? "Saving..." : "Confirm & Save"}
                </span>
              </Button>

              <Button
                variant="ghost"
                onClick={resetExcel}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
