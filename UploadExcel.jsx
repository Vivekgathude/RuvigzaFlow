import React, { useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { C, Panel, PageHeader, Button, inputStyle } from "./ui";
import { parseExcelFile, guessMapping, applyMapping } from "./excelUtils";
import { mergeLeadsFromImport } from "./leadsDatabase";
import { addUploadHistoryRecord } from "./mockDatabase";

const FIELD_LABELS = [
  ["name", "Name (required)"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["source", "Source"],
  ["status", "Status"],
  ["packageTier", "Package"],
];

export default function UploadExcel({ onImported }) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      setError(err.message);
    }
  };

  const runPreview = async () => {
    setBusy(true);
    const mappedRows = applyMapping(rawRows, mapping);
    // dry-run: mergeLeadsFromImport mutates the mock DB directly, so for a true
    // "preview before commit" step against a real backend, add a dedicated
    // POST /api/leads/import/preview endpoint that returns counts WITHOUT
    // writing anything. Here we approximate by just showing the mapped rows.
    setPreview({ mappedRows });
    setBusy(false);
  };

  const confirmImport = async () => {
    setBusy(true);
    try {
      const mappedRows = applyMapping(rawRows, mapping);
      const result = await mergeLeadsFromImport(mappedRows);
      await addUploadHistoryRecord({ fileName, added: result.added, updated: result.updated, skipped: result.skipped, total: result.total });
      onImported();
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFileName("");
    setHeaders([]);
    setRawRows(null);
    setMapping(null);
    setPreview(null);
    setError("");
  };

  return (
    <div>
      <PageHeader title="Import Excel" subtitle="Upload a file — new leads are added, existing ones (matched by phone or email) are updated." />

      {!rawRows && (
        <Panel>
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `1.5px dashed ${C.border}`, borderRadius: 8, padding: "40px 20px", cursor: "pointer", color: C.inkSoft }}>
            <UploadCloud size={26} color={C.primary} />
            <span style={{ fontWeight: 500, color: C.ink }}>Click to choose an Excel or CSV file</span>
            <span style={{ fontSize: 12 }}>.xlsx, .xls, or .csv</span>
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
          </label>
          {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{error}</div>}
        </Panel>
      )}

      {rawRows && !preview && (
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <FileSpreadsheet size={17} color={C.primary} />
            <span style={{ fontWeight: 500 }}>{fileName}</span>
            <span style={{ color: C.inkFaint, fontSize: 13 }}>· {rawRows.length} rows detected</span>
          </div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>Match each column in your file to a CRM field.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {FIELD_LABELS.map(([field, label]) => (
              <div key={field}>
                <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 4 }}>{label}</div>
                <select value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })} style={{ ...inputStyle, width: "100%" }}>
                  <option value="">Don't import</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={runPreview} disabled={!mapping.name || busy}>
              Preview import
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
          {!mapping.name && <div style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>Map a Name column to continue.</div>}
        </Panel>
      )}

      {preview && (
        <Panel>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>
            Ready to import <strong>{preview.mappedRows.length}</strong> rows from <strong>{fileName}</strong>. New phone/email combinations
            will be added; existing ones will be updated.
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${C.borderSoft}`, borderRadius: 6, marginBottom: 16 }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: C.inkFaint, textAlign: "left", position: "sticky", top: 0, background: C.panel }}>
                  <th style={{ padding: "6px 8px" }}>Name</th>
                  <th style={{ padding: "6px 8px" }}>Phone</th>
                  <th style={{ padding: "6px 8px" }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {preview.mappedRows.slice(0, 25).map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                    <td style={{ padding: "6px 8px" }}>{r.name || "—"}</td>
                    <td style={{ padding: "6px 8px" }}>{r.phone || "—"}</td>
                    <td style={{ padding: "6px 8px" }}>{r.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={confirmImport} icon={CheckCircle2} disabled={busy}>
              {busy ? "Saving…" : "Confirm & save"}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
