import React, { useMemo, useState } from "react";
import { Search, Trash2, ExternalLink, Image as ImageIcon,
  FileAudio,
  X, } from "lucide-react";
import { supabase } from "./supabase";
import { C, STATUS_COLOR, Panel, EmptyNote, inputStyle } from "./ui";
import { STATUS_OPTIONS } from "./excelUtils";

const EMPLOYEE_STATUS_FLOW = [
  "New",
  "Contacted",
  "Follow Up",
  "Interested",
  "Sent Proposal",
  "Onboarded",
];

const PACKAGE_OPTIONS = [
  {
    name: "Starter Pack",
    amount: 11111,
  },
  {
    name: "Growth Pack",
    amount: 19999,
  },
  {
    name: "Advance Pack",
    amount: 25999,
  },
];

const fmtDate = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LeadsTable({
  leads,
  employees = [],
  canReassign = false,
  canDelete = false,
  onUpdateStatus,
  onUpdatePackage,
  onAssign,
  onDelete,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");

  // =========================================================
  // CUSTOM PACKAGE AMOUNTS
  // =========================================================
  const [customPackageAmounts, setCustomPackageAmounts] = useState({});

  // =========================================================
  // SALES EMPLOYEES ONLY
  //
  // Leads Table is a SALES module.
  // Therefore only Digital Sales Executive employees
  // can be assigned leads.
  // =========================================================
  const salesEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.employmentRoleName === "Digital Sales Executive"
    );
  }, [employees]);


  // =========================================================
// CONTACT EVIDENCE PREVIEW
// =========================================================
const [evidenceModal, setEvidenceModal] = useState(null);
const [evidenceLoadingId, setEvidenceLoadingId] = useState(null);
const [evidenceError, setEvidenceError] = useState("");

const handleOpenEvidence = async (lead) => {
  if (!lead.contactEvidencePath) {
    setEvidenceError("Evidence file path उपलब्ध नाही.");
    return;
  }

  setEvidenceLoadingId(lead.id);
  setEvidenceError("");

  try {
    const { data, error } = await supabase.storage
      .from("contact-evidence")
      .createSignedUrl(lead.contactEvidencePath, 300);

    if (error) throw error;

    if (!data?.signedUrl) {
      throw new Error("Evidence URL तयार करता आला नाही.");
    }

    setEvidenceModal({
      url: data.signedUrl,
      name: lead.contactEvidenceName || "Contact evidence",
      type: lead.contactEvidenceType || "",
    });
  } catch (error) {
    console.error("Open contact evidence error:", error);
    setEvidenceError(
      error.message || "Evidence उघडताना समस्या आली."
    );
  } finally {
    setEvidenceLoadingId(null);
  }
};
  // =========================================================
  // FILTERED LEADS
  // =========================================================
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      // -----------------------------
      // STATUS FILTER
      // -----------------------------
      if (statusFilter !== "All" && l.status !== statusFilter) {
        return false;
      }

      // -----------------------------
      // EMPLOYEE FILTER
      // Only Admin sees this filter
      // -----------------------------
      if (
        canReassign &&
        employeeFilter !== "All" &&
        l.assignedEmployeeId !== employeeFilter
      ) {
        return false;
      }

      // -----------------------------
      // SEARCH FILTER
      // -----------------------------
      if (search.trim()) {
        const q = search.trim().toLowerCase();

        const searchableText = [
          l.name,
          l.businessCategory,
          l.address,
          l.phone,
          l.website,
          l.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    leads,
    search,
    statusFilter,
    employeeFilter,
    canReassign,
  ]);

  return (
    <div>
      {/* =====================================================
          SEARCH + FILTER TOOLBAR
      ====================================================== */}
      <div
        className="leads-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        {/* ================= SEARCH ================= */}
        <div
          className="leads-search"
          style={{
            position: "relative",
            flex: "1 1 320px",
            minWidth: 220,
            maxWidth: 420,
          }}
        >
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: C.inkFaint,
              pointerEvents: "none",
            }}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, category, phone, website..."
            style={{
              ...inputStyle,
              paddingLeft: 32,
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ================= EMPLOYEE FILTER ================= */}
        {canReassign && (
          <div
            className="leads-filter"
            style={{
              flex: "0 1 190px",
              minWidth: 170,
            }}
          >
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{
                ...inputStyle,
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              <option value="All">All Employees</option>

              {salesEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ================= STATUS FILTER ================= */}
        <div
          className="leads-filter"
          style={{
            flex: "0 1 180px",
            minWidth: 160,
          }}
        >
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              ...inputStyle,
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            <option value="All">All Status</option>

            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =====================================================
          LEADS TABLE
      ====================================================== */}
      <Panel>
        {filtered.length === 0 ? (
          <EmptyNote
            text={
              leads.length === 0
                ? "No leads assigned yet."
                : "No leads match your filters."
            }
          />
        ) : (
          <div
            style={{
              overflowX: "auto",
              width: "100%",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 1050,
                fontSize: 13,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    color: C.inkFaint,
                    textAlign: "left",
                  }}
                >
                  {[
                    "Name",
                    "Category",
                    "Address",
                    "Contact",
                    "Website",
                    "Source",
                    "Status",
                    "Package",
                    canReassign ? "Assigned to" : null,
                    "Updated",
                    "Evidence",
                    canDelete ? "" : null,
                  ]
                    .filter(Boolean)
                    .map((heading, index) => (
                      <th
                        key={`${heading}-${index}`}
                        style={{
                          padding: "8px",
                          fontWeight: 500,
                          borderBottom: `1px solid ${C.border}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    style={{
                      borderBottom: `1px solid ${C.borderSoft}`,
                    }}
                  >
                    {/* ================= NAME ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.name || "—"}
                    </td>

                    {/* ================= CATEGORY ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        color: C.inkSoft,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.businessCategory || "—"}
                    </td>

                    {/* ================= ADDRESS ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        color: C.inkSoft,
                        minWidth: 180,
                        maxWidth: 280,
                      }}
                    >
                      {l.address || "—"}
                    </td>

                    {/* ================= CONTACT ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        color: C.inkSoft,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.phone || "—"}
                    </td>

                    {/* ================= WEBSITE ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.website ? (
                        <a
                          href={
                            l.website.startsWith("http://") ||
                            l.website.startsWith("https://")
                              ? l.website
                              : `https://${l.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: C.primary,
                            textDecoration: "none",
                            fontSize: 12,
                          }}
                        >
                          Visit
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* ================= SOURCE ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.source || "—"}
                    </td>

                    {/* ================= STATUS ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                      }}
                    >
                      <select
                        value={l.status || "New"}
                        onChange={(e) =>
                          onUpdateStatus(l.id, e.target.value)
                        }
                        style={{
                          border: "none",
                          borderRadius: 5,
                          padding: "3px 8px",
                          fontSize: 12,
                          fontWeight: 500,
                          color:
                            STATUS_COLOR[l.status]?.fg || C.ink,
                          background:
                            STATUS_COLOR[l.status]?.bg ||
                            C.borderSoft,
                          cursor: "pointer",
                        }}
                      >
                        {canReassign ? (
                          /* ADMIN — all statuses available */
                          STATUS_OPTIONS.map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ))
                        ) : (
                          /* EMPLOYEE — only current/future valid statuses */
                          STATUS_OPTIONS.map((status) => {
                            const currentStatus =
                              l.status || "New";

                            const currentIndex =
                              EMPLOYEE_STATUS_FLOW.indexOf(
                                currentStatus
                              );

                            const statusIndex =
                              EMPLOYEE_STATUS_FLOW.indexOf(
                                status
                              );

                            const isTerminalStatus =
                              currentStatus ===
                                "Not Interested" ||
                              currentStatus === "Closed";

                            const isCurrent =
                              status === currentStatus;

                            const isFuture =
                              statusIndex > currentIndex;

                            const isSpecialNextStatus =
                              status === "Not Interested" ||
                              status === "Closed";

                            const isAllowed =
                              isTerminalStatus
                                ? isCurrent
                                : isCurrent ||
                                  isFuture ||
                                  isSpecialNextStatus;

                            return (
                              <option
                                key={status}
                                value={status}
                                disabled={!isAllowed}
                              >
                                {status}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </td>

                    {/* ================= PACKAGE ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        minWidth: 180,
                      }}
                    >
                      <select
                        value={l.packageTier || ""}
                        disabled={
                           l.packageTier === "Custom Package" &&
                           l.packageAmount !== null &&
                           l.packageAmount !== undefined &&
                           l.packageAmount !== ""
                           ? true
                           : !canReassign &&
                           l.status !== "Onboarded"
                           }
                        onChange={(e) => {
                          const value = e.target.value;

                          // -----------------------------
                          // CLEAR PACKAGE
                          // -----------------------------
                          if (!value) {
                            onUpdatePackage(
                              l.id,
                              "",
                              null
                            );
                            return;
                          }

                          // -----------------------------
                          // CUSTOM PACKAGE
                          // -----------------------------
                          if (value === "Custom Package") {
                            onUpdatePackage(
                              l.id,
                              "Custom Package",
                              null
                            );
                            return;
                          }

                          // -----------------------------
                          // STANDARD PACKAGE
                          // -----------------------------
                          const selectedPackage =
                            PACKAGE_OPTIONS.find(
                              (pkg) =>
                                pkg.name === value
                            );

                          onUpdatePackage(
                            l.id,
                            selectedPackage?.name || "",
                            selectedPackage?.amount ?? null
                          );
                        }}
                        style={{
                          ...inputStyle,
                          padding: "4px 6px",
                          fontSize: 12,
                          minWidth: 145,
                          cursor:
                           (
                           l.packageTier === "Custom Package" &&
                           l.packageAmount !== null &&
                           l.packageAmount !== undefined &&
                           l.packageAmount !== ""
                             ) ||
                             (
                            !canReassign &&
                            l.status !== "Onboarded"
                             )
                            ? "not-allowed"
                            : "pointer",
                          opacity:
                            !canReassign &&
                            l.status !== "Onboarded"
                              ? 0.55
                              : 1,
                        }}
                      >
                        {/* DEFAULT */}
                        <option value="">
                          Select Package
                        </option>

                        {/* STANDARD PACKAGES */}
                        {PACKAGE_OPTIONS.map((pkg) => (
                          <option
                            key={pkg.name}
                            value={pkg.name}
                          >
                            {pkg.name} — ₹
                            {pkg.amount.toLocaleString(
                              "en-IN"
                            )}
                          </option>
                        ))}

                        {/* CUSTOM PACKAGE */}
                        <option value="Custom Package">
                          Custom Package
                        </option>
                      </select>

                      {/* ================= CUSTOM AMOUNT ================= */}
                      {/* ================= CUSTOM AMOUNT ================= */}
{l.packageTier === "Custom Package" && (
  <input
    type="number"
    value={
      customPackageAmounts[l.id] ??
      l.packageAmount ??
      ""
    }
    disabled={
      l.packageAmount !== null &&
      l.packageAmount !== undefined &&
      l.packageAmount !== ""
    }
    onChange={(e) =>
      setCustomPackageAmounts((prev) => ({
        ...prev,
        [l.id]: e.target.value,
      }))
    }
    onBlur={() => {
      const amount =
        customPackageAmounts[l.id];

      if (
        amount !== undefined &&
        amount !== "" &&
        Number(amount) > 0
      ) {
        onUpdatePackage(
          l.id,
          "Custom Package",
          Number(amount)
        );

        // Local value clear करून DB मधून आलेली
        // saved value वापरली जाईल.
        setCustomPackageAmounts((prev) => {
          const updated = { ...prev };
          delete updated[l.id];
          return updated;
        });
      }
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    }}
    placeholder="Enter amount"
    min="1"
    style={{
      ...inputStyle,
      marginTop: 5,
      padding: "4px 6px",
      fontSize: 12,
      width: 110,
      boxSizing: "border-box",
      cursor:
        l.packageAmount !== null &&
        l.packageAmount !== undefined &&
        l.packageAmount !== ""
          ? "not-allowed"
          : "text",
      opacity:
        l.packageAmount !== null &&
        l.packageAmount !== undefined &&
        l.packageAmount !== ""
          ? 0.55
          : 1,
    }}
  />
)}
                    </td>

                    {/* ================= ASSIGNED TO ================= */}
                    {canReassign && (
                      <td
                        style={{
                          padding: "9px 8px",
                        }}
                      >
                        <select
                          value={
                            l.assignedEmployeeId || ""
                          }
                          onChange={(e) =>
                            onAssign(
                              l.id,
                              e.target.value
                            )
                          }
                          style={{
                            ...inputStyle,
                            padding: "4px 6px",
                            fontSize: 12,
                            minWidth: 160,
                            cursor: "pointer",
                          }}
                        >
                          <option value="">
                            Unassigned
                          </option>

                          {/* =================================================
                              ONLY DIGITAL SALES EXECUTIVE
                              ================================================= */}
                          {salesEmployees.map(
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
                      </td>
                    )}

                    {/* ================= UPDATED ================= */}
                    <td
                      style={{
                        padding: "9px 8px",
                        color: C.inkFaint,
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDate(l.updatedAt)}
                    </td>

                    {/* ================= EVIDENCE ================= */}
<td
  style={{
    padding: "9px 8px",
    textAlign: "center",
    whiteSpace: "nowrap",
  }}
>
  {l.contactEvidencePath &&
  l.contactEvidenceType?.startsWith("image/") ? (
    <button
      type="button"
      onClick={() => handleOpenEvidence(l)}
      disabled={evidenceLoadingId === l.id}
      title={
        l.contactEvidenceName
          ? `View image: ${l.contactEvidenceName}`
          : "View uploaded image"
      }
      aria-label="View contact evidence image"
      style={{
        border: "none",
        background: "transparent",
        color: C.primary,
        cursor:
          evidenceLoadingId === l.id
            ? "wait"
            : "pointer",
        padding: 5,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ImageIcon size={18} />
    </button>
  ) : l.contactEvidencePath &&
    l.contactEvidenceType?.startsWith("audio/") ? (
    <button
      type="button"
      onClick={() => handleOpenEvidence(l)}
      disabled={evidenceLoadingId === l.id}
      title={
        l.contactEvidenceName
          ? `Play audio: ${l.contactEvidenceName}`
          : "Play call recording"
      }
      aria-label="Play contact evidence audio"
      style={{
        border: "none",
        background: "transparent",
        color: C.primary,
        cursor:
          evidenceLoadingId === l.id
            ? "wait"
            : "pointer",
        padding: 5,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FileAudio size={18} />
    </button>
  ) : (
    <span style={{ color: C.inkFaint }}>—</span>
  )}

  {evidenceLoadingId === l.id && (
    <span
      style={{
        marginLeft: 5,
        fontSize: 11,
        color: C.inkFaint,
      }}
    >
      Loading...
    </span>
  )}
</td>

                    {/* ================= DELETE ================= */}
                    {canDelete && (
                      <td
                        style={{
                          padding: "9px 8px",
                        }}
                      >
                        <button
                          onClick={() => onDelete(l.id)}
                          style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            color: C.inkFaint,
                            padding: 4,
                          }}
                          title="Delete lead"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* =====================================================
    CONTACT EVIDENCE PREVIEW MODAL
===================================================== */}

{evidenceError && (
  <div
    role="alert"
    style={{
      marginTop: 10,
      padding: 10,
      borderRadius: 6,
      color: "#b91c1c",
      background: "#fee2e2",
      fontSize: 13,
    }}
  >
    {evidenceError}

    <button
      type="button"
      onClick={() => setEvidenceError("")}
      style={{
        marginLeft: 10,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "inherit",
      }}
    >
      Dismiss
    </button>
  </div>
)}

{evidenceModal && (
  <div
    onClick={() => setEvidenceModal(null)}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 10000,
      background: "rgba(0, 0, 0, 0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Contact evidence preview"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 650,
        maxHeight: "90vh",
        overflowY: "auto",
        background: C.panel || "#ffffff",
        color: C.ink,
        borderRadius: 12,
        padding: 20,
        boxSizing: "border-box",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            overflowWrap: "anywhere",
          }}
        >
          {evidenceModal.name}
        </div>

        <button
          type="button"
          onClick={() => setEvidenceModal(null)}
          aria-label="Close evidence preview"
          style={{
            border: "none",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            padding: 5,
            flexShrink: 0,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {evidenceModal.type.startsWith("image/") ? (
        <img
          src={evidenceModal.url}
          alt={evidenceModal.name}
          style={{
            display: "block",
            width: "100%",
            maxHeight: "70vh",
            objectFit: "contain",
            borderRadius: 6,
          }}
        />
      ) : evidenceModal.type.startsWith("audio/") ? (
        <div style={{ padding: "16px 0" }}>
          <audio
            controls
            autoPlay
            preload="metadata"
            src={evidenceModal.url}
            style={{ width: "100%" }}
          >
            तुमचा browser audio playback support करत नाही.
          </audio>
        </div>
      ) : (
        <p>या file type साठी preview उपलब्ध नाही.</p>
      )}
    </div>
  </div>
)}


      {/* =====================================================
          RESPONSIVE TOOLBAR
      ====================================================== */}
      <style>{`
        @media (max-width: 700px) {
          .leads-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .leads-search,
          .leads-filter {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
}