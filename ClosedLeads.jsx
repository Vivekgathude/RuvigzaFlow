import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileText,
  RefreshCw,
  X,
  Pencil,
  Save,
} from "lucide-react";

import {
  C,
  Panel,
  EmptyNote,
  inputStyle,
} from "./ui";

import { supabase } from "./supabase";


const SERVICE_OPTIONS = [
  {
    value: "google_ads",
    label: "Google Ads",
    roleName: "Google Ads Manager",
  },

  {
    value: "meta_ads",
    label: "Meta Ads",
    roleName: "Meta Ads Manager",
  },
];


export default function ClosedLeads({
  leads = [],
  employees = [],
  currentUser,
  onChanged,
}) {
  const [roles, setRoles] =
    useState([]);

  const [
    assignments,
    setAssignments,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    selectedLead,
    setSelectedLead,
  ] = useState(null);

  const [
    closeNoteLead,
    setCloseNoteLead,
  ] = useState(null);

  const [
    editingCloseNote,
    setEditingCloseNote,
  ] = useState(false);

  const [
    closeNoteForm,
    setCloseNoteForm,
  ] = useState({
    requirement: "",
    service: "",
    budget: "",
    budgetType: "daily",
    fromDate: "",
    toDate: "",
    remark: "",
  });

  const [
    savingCloseNote,
    setSavingCloseNote,
  ] = useState(false);

  const [
    closeNoteError,
    setCloseNoteError,
  ] = useState("");

  const [
    serviceType,
    setServiceType,
  ] = useState("");

  const [
    managerId,
    setManagerId,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    updatingStatusId,
    setUpdatingStatusId,
  ] = useState(null);


  /* =======================================================
     LOAD ROLES
  ======================================================= */

  useEffect(() => {
    const loadRoles =
      async () => {
        const {
          data,
          error,
        } = await supabase
          .from("roles")
          .select(
            "id, name"
          )
          .eq(
            "is_active",
            true
          );

        if (error) {
          console.error(
            "Roles load error:",
            error
          );

          return;
        }

        setRoles(
          data || []
        );
      };

    loadRoles();
  }, []);


  /* =======================================================
     LOAD ASSIGNMENTS
  ======================================================= */

  const loadAssignments =
    async () => {
      try {
        setLoading(true);

        const {
          data,
          error,
        } = await supabase
          .from(
            "client_service_assignments"
          )
          .select(`
            id,
            lead_id,
            service_type,
            assigned_to,
            assigned_by,
            status,
            assigned_at,
            requirement_note
          `)
          .order(
            "assigned_at",
            {
              ascending: false,
            }
          );

        if (error) {
          throw error;
        }

        const rows =
          data || [];

        if (
          rows.length === 0
        ) {
          setAssignments([]);
          return;
        }

        const leadIds =
          rows.map(
            (row) =>
              row.lead_id
          );

        const managerIds =
          rows
            .map(
              (row) =>
                row.assigned_to
            )
            .filter(Boolean);

        const [
          leadsResult,
          managersResult,
        ] =
          await Promise.all([
            supabase
              .from("leads")
              .select("*")
              .in(
                "id",
                leadIds
              ),

            managerIds.length > 0
              ? supabase
                  .from(
                    "team_members"
                  )
                  .select(
                    "id, name, email, employment_role_id"
                  )
                  .in(
                    "id",
                    managerIds
                  )
              : Promise.resolve({
                  data: [],
                  error: null,
                }),
          ]);

        if (
          leadsResult.error
        ) {
          throw leadsResult.error;
        }

        if (
          managersResult.error
        ) {
          throw managersResult.error;
        }

        const leadMap =
          new Map(
            (
              leadsResult.data ||
              []
            ).map(
              (lead) => [
                lead.id,
                lead,
              ]
            )
          );

        const managerMap =
          new Map(
            (
              managersResult.data ||
              []
            ).map(
              (manager) => [
                manager.id,
                manager,
              ]
            )
          );

        const combined =
          rows.map(
            (assignment) => ({
              ...assignment,

              lead:
                leadMap.get(
                  assignment.lead_id
                ) || null,

              manager:
                managerMap.get(
                  assignment.assigned_to
                ) || null,
            })
          );

        setAssignments(
          combined
        );
      } catch (error) {
        console.error(
          "Assignments load error:",
          error
        );

        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    loadAssignments();
  }, []);


  /* =======================================================
     ROLE-SPECIFIC MANAGERS
  ======================================================= */

  const googleAdsManagers =
    useMemo(() => {
      const role =
        roles.find(
          (item) =>
            item.name ===
            "Google Ads Manager"
        );

      if (!role) {
        return [];
      }

      return (
        employees || []
      ).filter(
        (employee) =>
          employee.isActive !==
            false &&
          Number(
            employee.employmentRoleId
          ) ===
            Number(
              role.id
            )
      );
    }, [
      roles,
      employees,
    ]);


  const metaAdsManagers =
    useMemo(() => {
      const role =
        roles.find(
          (item) =>
            item.name ===
            "Meta Ads Manager"
        );

      if (!role) {
        return [];
      }

      return (
        employees || []
      ).filter(
        (employee) =>
          employee.isActive !==
            false &&
          Number(
            employee.employmentRoleId
          ) ===
            Number(
              role.id
            )
      );
    }, [
      roles,
      employees,
    ]);


  const availableManagers =
    useMemo(() => {
      if (
        serviceType ===
        "google_ads"
      ) {
        return googleAdsManagers;
      }

      if (
        serviceType ===
        "meta_ads"
      ) {
        return metaAdsManagers;
      }

      return [];
    }, [
      serviceType,
      googleAdsManagers,
      metaAdsManagers,
    ]);


  /* =======================================================
     OPEN ASSIGNMENT
  ======================================================= */

  const openAssignment =
    (lead) => {
      setSelectedLead(
        lead
      );

      setServiceType(
        ""
      );

      setManagerId(
        ""
      );
    };


  const closeAssignment =
    () => {
      setSelectedLead(
        null
      );

      setServiceType(
        ""
      );

      setManagerId(
        ""
      );
    };


  /* =======================================================
     OPEN CLOSE NOTE
  ======================================================= */

  const openCloseNote =
    (lead) => {
      setCloseNoteLead(
        lead
      );

      setEditingCloseNote(
        false
      );

      setCloseNoteError(
        ""
      );

      setCloseNoteForm({
        requirement:
          lead.closeRequirement ||
          "",
        service:
          lead.closeService ||
          "",
        budget:
          lead.closeBudget ??
          "",
        budgetType:
          lead.closeBudgetType ||
          "daily",
        fromDate:
          lead.closeFromDate ||
          "",
        toDate:
          lead.closeToDate ||
          "",
        remark:
          lead.closeRemark ||
          "",
      });
    };


  const closeCloseNote =
    () => {
      setCloseNoteLead(
        null
      );

      setEditingCloseNote(
        false
      );

      setCloseNoteError(
        ""
      );
    };


  /* =======================================================
     EDIT CLOSE NOTE
  ======================================================= */

  const startEditingCloseNote =
    () => {
      if (!closeNoteLead) {
        return;
      }

      setCloseNoteForm({
        requirement:
          closeNoteLead.closeRequirement ||
          "",
        service:
          closeNoteLead.closeService ||
          "",
        budget:
          closeNoteLead.closeBudget ??
          "",
        budgetType:
          closeNoteLead.closeBudgetType ||
          "daily",
        fromDate:
          closeNoteLead.closeFromDate ||
          "",
        toDate:
          closeNoteLead.closeToDate ||
          "",
        remark:
          closeNoteLead.closeRemark ||
          "",
      });

      setCloseNoteError(
        ""
      );

      setEditingCloseNote(
        true
      );
    };


  const cancelEditingCloseNote =
    () => {
      if (!closeNoteLead) {
        return;
      }

      setCloseNoteForm({
        requirement:
          closeNoteLead.closeRequirement ||
          "",
        service:
          closeNoteLead.closeService ||
          "",
        budget:
          closeNoteLead.closeBudget ??
          "",
        budgetType:
          closeNoteLead.closeBudgetType ||
          "daily",
        fromDate:
          closeNoteLead.closeFromDate ||
          "",
        toDate:
          closeNoteLead.closeToDate ||
          "",
        remark:
          closeNoteLead.closeRemark ||
          "",
      });

      setCloseNoteError(
        ""
      );

      setEditingCloseNote(
        false
      );
    };


  /* =======================================================
     SAVE ADMIN-EDITED CLOSE NOTE
  ======================================================= */

  const handleSaveCloseNote =
    async () => {
      if (!closeNoteLead) {
        return;
      }

      const requirement =
        String(
          closeNoteForm.requirement ||
            ""
        ).trim();

      const service =
        String(
          closeNoteForm.service ||
            ""
        ).trim();

      const budgetValue =
        closeNoteForm.budget;

      const budget =
        Number(
          budgetValue
        );

      const budgetType =
        closeNoteForm.budgetType;

      const fromDate =
        closeNoteForm.fromDate;

      const toDate =
        closeNoteForm.toDate;

      const remark =
        String(
          closeNoteForm.remark ||
            ""
        ).trim();

      if (!requirement) {
        setCloseNoteError(
          "Requirement is required."
        );
        return;
      }

      if (!service) {
        setCloseNoteError(
          "Service is required."
        );
        return;
      }

      if (
        budgetValue ===
          "" ||
        budgetValue ===
          null ||
        budgetValue ===
          undefined ||
        !Number.isFinite(
          budget
        ) ||
        budget <= 0
      ) {
        setCloseNoteError(
          "Please enter a valid budget greater than 0."
        );
        return;
      }

      if (!budgetType) {
        setCloseNoteError(
          "Budget type is required."
        );
        return;
      }

      if (!fromDate) {
        setCloseNoteError(
          "From Date is required."
        );
        return;
      }

      if (!toDate) {
        setCloseNoteError(
          "To Date is required."
        );
        return;
      }

      if (
        toDate <
        fromDate
      ) {
        setCloseNoteError(
          "To Date cannot be earlier than From Date."
        );
        return;
      }

      try {
        setSavingCloseNote(
          true
        );

        setCloseNoteError(
          ""
        );

        const {
          data,
          error,
        } = await supabase
          .from("leads")
          .update({
            close_requirement:
              requirement,

            close_service:
              service,

            close_budget:
              budget,

            close_budget_type:
              budgetType,

            close_from_date:
              fromDate,

            close_to_date:
              toDate,

            close_remark:
              remark || null,
          })
          .eq(
            "id",
            closeNoteLead.id
          )
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Close Note was not updated."
          );
        }

        /*
         * Update the modal immediately
         * with the latest saved data.
         */
        const updatedLead = {
          ...closeNoteLead,

          closeRequirement:
            data.close_requirement ||
            "",

          closeService:
            data.close_service ||
            "",

          closeBudget:
            data.close_budget ??
            "",

          closeBudgetType:
            data.close_budget_type ||
            "daily",

          closeFromDate:
            data.close_from_date ||
            "",

          closeToDate:
            data.close_to_date ||
            "",

          closeRemark:
            data.close_remark ||
            "",
        };

        setCloseNoteLead(
          updatedLead
        );

        setEditingCloseNote(
          false
        );

        /*
         * IMPORTANT:
         * If this client was already assigned to a service
         * manager, update the requirement_note there too.
         *
         * This keeps the final Admin-edited requirement
         * synchronized with My Clients.
         */
        const existingAssignments =
          assignments.filter(
            (assignment) =>
              assignment.lead_id ===
              closeNoteLead.id
          );

        if (
          existingAssignments.length >
          0
        ) {
          const requirementNote =
          
            data.close_requirement ||
            null;

          const {
            error:
              assignmentUpdateError,
          } = await supabase
            .from(
              "client_service_assignments"
            )
            .update({
              requirement_note:
                requirementNote,
            })
            .eq(
              "lead_id",
              closeNoteLead.id
            );

          if (
            assignmentUpdateError
          ) {
            throw assignmentUpdateError;
          }
        }

        /*
         * Refresh assignments so the Admin page
         * immediately reflects the latest requirement note.
         */
        await loadAssignments();

        if (onChanged) {
          await onChanged();
        }
      } catch (error) {
        console.error(
          "Close Note save error:",
          error
        );

        setCloseNoteError(
          error.message ||
            "Unable to save Close Note."
        );
      } finally {
        setSavingCloseNote(
          false
        );
      }
    };


  /* =======================================================
     CREATE SERVICE ASSIGNMENT
  ======================================================= */

  const handleAssign =
    async () => {
      if (
        !selectedLead ||
        !serviceType ||
        !managerId ||
        !currentUser?.id
      ) {
        return;
      }

      try {
        setSaving(true);

        /*
         * The requirement note comes from the final
         * Admin-saved Close Note.
         */
        const requirementNote =
          selectedLead.closeRequirement ||
          null;

        const {
          error,
        } = await supabase
          .from(
            "client_service_assignments"
          )
          .insert({
            lead_id:
              selectedLead.id,

            service_type:
              serviceType,

            assigned_to:
              managerId,

            assigned_by:
              currentUser.id,

            status:
              "Assigned",

            requirement_note:
              requirementNote,
          });

        if (error) {
          throw error;
        }

        closeAssignment();

        await loadAssignments();

        if (onChanged) {
          await onChanged();
        }
      } catch (error) {
        console.error(
          "Service assignment error:",
          error
        );

        alert(
          error.message ||
            "Unable to assign service."
        );
      } finally {
        setSaving(false);
      }
    };


  /* =======================================================
     ADMIN STATUS UPDATE
  ======================================================= */

  const handleStatusChange =
    async (
      assignmentId,
      status
    ) => {
      try {
        setUpdatingStatusId(
          assignmentId
        );

        const {
          data,
          error,
        } = await supabase
          .from(
            "client_service_assignments"
          )
          .update({
            status,
          })
          .eq(
            "id",
            assignmentId
          )
          .select(`
            id,
            lead_id,
            service_type,
            assigned_to,
            assigned_by,
            status,
            assigned_at,
            requirement_note
          `)
          .single();

        if (error) {
          throw error;
        }

        setAssignments(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                assignmentId
                  ? {
                      ...item,
                      ...data,
                    }
                  : item
            )
        );

        if (onChanged) {
          await onChanged();
        }
      } catch (error) {
        console.error(
          "Admin service status update error:",
          error
        );

        alert(
          error.message ||
            "Unable to update service status."
        );
      } finally {
        setUpdatingStatusId(
          null
        );
      }
    };


  /* =======================================================
     CLOSED LEADS
  ======================================================= */

  const closedLeads =
  (leads || []).filter(
    (lead) =>
      lead.status === "Closed" ||
      lead.closedAt ||
      lead.closed_at
  );


  return (
    <div>
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          marginBottom:
            18,

          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 750,
            }}
          >
            Closed Leads
          </div>

          <div
            style={{
              fontSize: 12,
              color: C.inkSoft,
              marginTop: 4,
            }}
          >
            Sales-completed leads and their service assignments.
          </div>
        </div>

        <button
          onClick={
            loadAssignments
          }
          disabled={
            loading
          }
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap: 6,

            padding:
              "8px 12px",

            border:
              `1px solid ${C.border}`,

            borderRadius:
              7,

            background:
              "#fff",

            cursor:
              "pointer",

            fontSize:
              12,

            fontWeight:
              600,
          }}
        >
          <RefreshCw
            size={14}
          />

          Refresh
        </button>
      </div>


      {/* ===================================================
          SERVICE ASSIGNMENTS
      =================================================== */}

      <Panel
        style={{
          overflow:
            "hidden",

          marginBottom:
            20,
        }}
      >
        <div
          style={{
            padding:
              "18px 20px",

            borderBottom:
              `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Service Assignments
          </div>

          <div
            style={{
              fontSize: 11,
              color: C.inkSoft,
              marginTop: 3,
            }}
          >
            Current service status of Google Ads and Meta Ads clients.
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: C.inkSoft,
            }}
          >
            Loading service assignments...
          </div>
        ) : assignments.length ===
          0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: C.inkSoft,
            }}
          >
            No service assignments found.
          </div>
        ) : (
          <div
            style={{
              overflowX:
                "auto",
            }}
          >
            <table
              style={{
                width:
                  "100%",

                borderCollapse:
                  "collapse",

                minWidth:
                  1050,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Client
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Service
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Manager
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Requirement Note
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
                    Assigned
                  </th>
                </tr>
              </thead>

              <tbody>
                {assignments.map(
                  (assignment) => (
                    <tr
                      key={
                        assignment.id
                      }
                    >
                      <td
                        style={
                          tableCellStyle
                        }
                      >
                        <div
                          style={{
                            fontWeight:
                              700,
                          }}
                        >
                          {getClientName(
                            assignment.lead
                          )}
                        </div>

                        <div
                          style={{
                            fontSize:
                              11,

                            color:
                              C.inkSoft,

                            marginTop:
                              3,
                          }}
                        >
                          {getCategory(
                            assignment.lead
                          )}
                        </div>
                      </td>

                      <td
                        style={
                          tableCellStyle
                        }
                      >
                        {assignment.service_type ===
                        "meta_ads"
                          ? "Meta Ads"
                          : "Google Ads"}
                      </td>

                      <td
                        style={
                          tableCellStyle
                        }
                      >
                        {assignment.manager
                          ?.name ||
                          "—"}
                      </td>

                      <td
                        style={{
                          ...tableCellStyle,
                          whiteSpace:
                            "normal",
                          minWidth:
                            240,
                          maxWidth:
                            360,
                          lineHeight:
                            1.45,
                        }}
                      >
                        {assignment.requirement_note ||
                          "Sent"}
                      </td>

                      <td
                        style={
                          tableCellStyle
                        }
                      >
                        <select
                          value={
                            assignment.status ||
                            "Assigned"
                          }
                          disabled={
                            updatingStatusId ===
                            assignment.id
                          }
                          onChange={(
                            event
                          ) =>
                            handleStatusChange(
                              assignment.id,
                              event
                                .target
                                .value
                            )
                          }
                          style={{
                            minWidth:
                              125,

                            padding:
                              "7px 10px",

                            border:
                              `1px solid ${C.border}`,

                            borderRadius:
                              7,

                            background:
                              getStatusBackground(
                                assignment.status
                              ),

                            color:
                              getStatusColor(
                                assignment.status
                              ),

                            fontSize:
                              12,

                            fontWeight:
                              600,
                          }}
                        >
                          <option value="Assigned">
                            Assigned
                          </option>

                          <option value="Onboarding">
                            Onboarding
                          </option>

                          <option value="Active">
                            Active
                          </option>

                          <option value="Paused">
                            Paused
                          </option>

                          <option value="Completed">
                            Completed
                          </option>
                        </select>

                        {updatingStatusId ===
                          assignment.id && (
                          <span
                            style={{
                              marginLeft:
                                7,

                              fontSize:
                                10,

                              color:
                                C.inkSoft,
                            }}
                          >
                            Saving...
                          </span>
                        )}
                      </td>

                      <td
                        style={
                          tableCellStyle
                        }
                      >
                        {formatDate(
                          assignment.assigned_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>


      {/* ===================================================
          CLOSED SALES LEADS
      =================================================== */}

      <Panel
        style={{
          overflow:
            "hidden",
        }}
      >
        <div
          style={{
            padding:
              "18px 20px",

            borderBottom:
              `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Closed Sales Leads
          </div>

          <div
            style={{
              fontSize: 11,
              color: C.inkSoft,
              marginTop: 3,
            }}
          >
            Sales requirements collected before closing the lead.
          </div>
        </div>

        {closedLeads.length ===
        0 ? (
          <EmptyNote>
            No closed leads found.
          </EmptyNote>
        ) : (
          <div
            style={{
              overflowX:
                "auto",
            }}
          >
            <table
              style={{
                width:
                  "100%",

                borderCollapse:
                  "collapse",

                minWidth:
                  950,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Client
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Contact
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Sales Status
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Close Note
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Service
                  </th>

                  <th
                    style={
                      tableHeadStyle
                    }
                  >
                    Service Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {closedLeads.map(
                  (lead) => {
                    const leadAssignments =
                      assignments.filter(
                        (
                          assignment
                        ) =>
                          assignment.lead_id ===
                          lead.id
                      );

                    return (
                      <tr
                        key={
                          lead.id
                        }
                      >
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <div
                            style={{
                              fontWeight:
                                700,
                            }}
                          >
                            {getClientName(
                              lead
                            )}
                          </div>

                          <div
                            style={{
                              fontSize:
                                11,

                              color:
                                C.inkSoft,

                              marginTop:
                                3,
                            }}
                          >
                            {getCategory(
                              lead
                            )}
                          </div>
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {getContact(
                            lead
                          )}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <StatusBadge
                            status="Closed"
                          />
                        </td>

                        {/* CLOSE NOTE */}
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <button
                            onClick={() =>
                              openCloseNote(
                                lead
                              )
                            }
                            style={{
                              display:
                                "inline-flex",

                              alignItems:
                                "center",

                              gap: 6,

                              padding:
                                "7px 11px",

                              border:
                                `1px solid ${C.border}`,

                              borderRadius:
                                7,

                              background:
                                "#fff",

                              color:
                                C.ink,

                              fontSize:
                                11,

                              fontWeight:
                                650,

                              cursor:
                                "pointer",
                            }}
                          >
                            <FileText
                              size={14}
                            />

                            View / Edit Close Note
                          </button>
                        </td>

                        {/* SERVICE */}
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {leadAssignments.length ===
                          0 ? (
                            <button
                              onClick={() =>
                                openAssignment(
                                  lead
                                )
                              }
                              style={{
                                padding:
                                  "7px 12px",

                                border:
                                  "none",

                                borderRadius:
                                  7,

                                background:
                                  "#0F172A",

                                color:
                                  "#fff",

                                fontSize:
                                  11,

                                fontWeight:
                                  600,

                                cursor:
                                  "pointer",
                              }}
                            >
                              Assign Service
                            </button>
                          ) : (
                            leadAssignments.map(
                              (
                                assignment
                              ) => (
                                <div
                                  key={
                                    assignment.id
                                  }
                                  style={{
                                    fontSize:
                                      12,

                                    fontWeight:
                                      600,

                                    marginBottom:
                                      4,
                                  }}
                                >
                                  {assignment.service_type ===
                                  "meta_ads"
                                    ? "Meta Ads"
                                    : "Google Ads"}
                                </div>
                              )
                            )
                          )}
                        </td>

                        {/* SERVICE STATUS */}
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {leadAssignments.length ===
                          0
                            ? "—"
                            : leadAssignments.map(
                                (
                                  assignment
                                ) => (
                                  <div
                                    key={
                                      assignment.id
                                    }
                                    style={{
                                      marginBottom:
                                        5,
                                    }}
                                  >
                                    <StatusBadge
                                      status={
                                        assignment.status
                                      }
                                    />
                                  </div>
                                )
                              )}
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


      {/* ===================================================
          CLOSE NOTE MODAL
      =================================================== */}

      {closeNoteLead && (
        <div
          style={{
            position:
              "fixed",

            inset: 0,

            background:
              "rgba(0,0,0,0.45)",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            zIndex:
              3000,

            padding: 20,
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                620,

              maxHeight:
                "90vh",

              overflowY:
                "auto",

              background:
                "#fff",

              borderRadius:
                12,

              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                padding:
                  "18px 20px",

                borderBottom:
                  `1px solid ${C.border}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      17,

                    fontWeight:
                      750,
                  }}
                >
                  {editingCloseNote
                    ? "Edit Close Note"
                    : "Close Note"}
                </div>

                <div
                  style={{
                    fontSize:
                      12,

                    color:
                      C.inkSoft,

                    marginTop:
                      4,
                  }}
                >
                  {getClientName(
                    closeNoteLead
                  )}
                </div>
              </div>

              <button
                onClick={
                  closeCloseNote
                }
                style={{
                  width:
                    34,

                  height:
                    34,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  border:
                    "none",

                  borderRadius:
                    7,

                  background:
                    C.borderSoft,

                  cursor:
                    "pointer",
                }}
              >
                <X
                  size={18}
                />
              </button>
            </div>


            {/* CONTENT */}
            <div
              style={{
                padding:
                  20,
              }}
            >
              {editingCloseNote ? (
                <>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Requirement *
                  </label>

                  <textarea
                    value={
                      closeNoteForm.requirement
                    }
                    onChange={(
                      event
                    ) =>
                      setCloseNoteForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          requirement:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize:
                        "vertical",
                    }}
                    placeholder="Enter client requirement"
                  />

                  <label
                    style={{
                      ...labelStyle,
                      marginTop: 15,
                    }}
                  >
                    Service *
                  </label>

                  <select
                    value={
                      closeNoteForm.service
                    }
                    onChange={(
                      event
                    ) =>
                      setCloseNoteForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          service:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="">
                      Select service
                    </option>

                    <option value="google_ads">
                      Google Ads
                    </option>

                    <option value="meta_ads">
                      Meta Ads
                    </option>
                  </select>

                  <label
                    style={{
                      ...labelStyle,
                      marginTop: 15,
                    }}
                  >
                    Budget *
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      closeNoteForm.budget
                    }
                    onChange={(
                      event
                    ) =>
                      setCloseNoteForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          budget:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    style={
                      inputStyle
                    }
                    placeholder="Enter budget"
                  />

                  <label
                    style={{
                      ...labelStyle,
                      marginTop: 15,
                    }}
                  >
                    Budget Type *
                  </label>

                  <select
                    value={
                      closeNoteForm.budgetType
                    }
                    onChange={(
                      event
                    ) =>
                      setCloseNoteForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          budgetType:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="daily">
                      Daily
                    </option>

                    <option value="monthly">
                      Monthly
                    </option>
                  </select>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "1fr 1fr",

                      gap:
                        12,

                      marginTop:
                        15,
                    }}
                  >
                    <div>
                      <label
                        style={
                          labelStyle
                        }
                      >
                        From Date *
                      </label>

                      <input
                        type="date"
                        value={
                          closeNoteForm.fromDate
                        }
                        onChange={(
                          event
                        ) =>
                          setCloseNoteForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              fromDate:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </div>

                    <div>
                      <label
                        style={
                          labelStyle
                        }
                      >
                        To Date *
                      </label>

                      <input
                        type="date"
                        value={
                          closeNoteForm.toDate
                        }
                        onChange={(
                          event
                        ) =>
                          setCloseNoteForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              toDate:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        style={
                          inputStyle
                        }
                      />
                    </div>
                  </div>

                  <label
                    style={{
                      ...labelStyle,
                      marginTop: 15,
                    }}
                  >
                    Remark
                    <span
                      style={{
                        fontWeight:
                          400,

                        color:
                          C.inkSoft,

                        marginLeft:
                          5,
                      }}
                    >
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    value={
                      closeNoteForm.remark
                    }
                    onChange={(
                      event
                    ) =>
                      setCloseNoteForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          remark:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize:
                        "vertical",
                    }}
                    placeholder="Enter remark"
                  />

                  {closeNoteError && (
                    <div
                      style={{
                        marginTop:
                          14,

                        padding:
                          "10px 12px",

                        border:
                          "1px solid #FECACA",

                        background:
                          "#FEF2F2",

                        color:
                          "#B91C1C",

                        borderRadius:
                          7,

                        fontSize:
                          12,

                        lineHeight:
                          1.5,
                      }}
                    >
                      {
                        closeNoteError
                      }
                    </div>
                  )}
                </>
              ) : (
                <>
                  <CloseNoteRow
                    label="Requirement"
                    value={
                      closeNoteLead.closeRequirement
                    }
                    multiline
                  />

                  <CloseNoteRow
                    label="Service"
                    value={
                      formatCloseService(
                        closeNoteLead.closeService
                      )
                    }
                  />

                  <CloseNoteRow
                    label="Budget"
                    value={
                      formatBudget(
                        closeNoteLead.closeBudget,
                        closeNoteLead.closeBudgetType
                      )
                    }
                  />

                  <CloseNoteRow
                    label="Budget Type"
                    value={
                      formatBudgetType(
                        closeNoteLead.closeBudgetType
                      )
                    }
                  />

                  <CloseNoteRow
                    label="From Date"
                    value={
                      formatDate(
                        closeNoteLead.closeFromDate
                      )
                    }
                  />

                  <CloseNoteRow
                    label="To Date"
                    value={
                      formatDate(
                        closeNoteLead.closeToDate
                      )
                    }
                  />

                  <CloseNoteRow
                    label="Remark"
                    value={
                      closeNoteLead.closeRemark
                    }
                    multiline
                    optional
                  />

                  <div
                    style={{
                      height:
                        1,

                      background:
                        C.border,

                      margin:
                        "18px 0",
                    }}
                  />

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "1fr 1fr",

                      gap:
                        14,
                    }}
                  >
                    <div>
                      <div
                        style={
                          closeNoteLabelStyle
                        }
                      >
                        Closed By
                      </div>

                      <div
                        style={
                          closeNoteValueStyle
                        }
                      >
                        {getEmployeeName(
                          closeNoteLead.closedBy,
                          employees
                        )}
                      </div>
                    </div>

                    <div>
                      <div
                        style={
                          closeNoteLabelStyle
                        }
                      >
                        Closed Date
                      </div>

                      <div
                        style={
                          closeNoteValueStyle
                        }
                      >
                        {formatDateTime(
                          closeNoteLead.closedAt
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>


            {/* FOOTER */}
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap:
                  10,

                padding:
                  "0 20px 20px",
              }}
            >
              {editingCloseNote ? (
                <>
                  <button
                    onClick={
                      cancelEditingCloseNote
                    }
                    disabled={
                      savingCloseNote
                    }
                    style={{
                      padding:
                        "9px 16px",

                      border:
                        `1px solid ${C.border}`,

                      borderRadius:
                        7,

                      background:
                        "#fff",

                      cursor:
                        "pointer",

                      fontSize:
                        12,

                      fontWeight:
                        600,
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleSaveCloseNote
                    }
                    disabled={
                      savingCloseNote
                    }
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      gap:
                        7,

                      padding:
                        "9px 16px",

                      border:
                        "none",

                      borderRadius:
                        7,

                      background:
                        "#0F172A",

                      color:
                        "#fff",

                      cursor:
                        savingCloseNote
                          ? "wait"
                          : "pointer",

                      fontSize:
                        12,

                      fontWeight:
                        600,

                      opacity:
                        savingCloseNote
                          ? 0.6
                          : 1,
                    }}
                  >
                    <Save
                      size={14}
                    />

                    {savingCloseNote
                      ? "Saving..."
                      : "Save Close Note"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={
                      closeCloseNote
                    }
                    style={{
                      padding:
                        "9px 16px",

                      border:
                        `1px solid ${C.border}`,

                      borderRadius:
                        7,

                      background:
                        "#fff",

                      cursor:
                        "pointer",

                      fontSize:
                        12,

                      fontWeight:
                        600,
                    }}
                  >
                    Close
                  </button>

                  <button
                    onClick={
                      startEditingCloseNote
                    }
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      gap:
                        7,

                      padding:
                        "9px 16px",

                      border:
                        "none",

                      borderRadius:
                        7,

                      background:
                        "#0F172A",

                      color:
                        "#fff",

                      cursor:
                        "pointer",

                      fontSize:
                        12,

                      fontWeight:
                        600,
                    }}
                  >
                    <Pencil
                      size={14}
                    />

                    Edit Close Note
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ===================================================
          ASSIGN SERVICE MODAL
      =================================================== */}

      {selectedLead && (
        <div
          style={{
            position:
              "fixed",

            inset: 0,

            background:
              "rgba(0,0,0,0.45)",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            zIndex:
              2000,

            padding: 20,
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                500,

              background:
                "#fff",

              borderRadius:
                12,

              padding:
                22,

              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)",
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

                marginBottom:
                  20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      17,

                    fontWeight:
                      750,
                  }}
                >
                  Assign Service
                </div>

                <div
                  style={{
                    fontSize:
                      12,

                    color:
                      C.inkSoft,

                    marginTop:
                      4,
                  }}
                >
                  {getClientName(
                    selectedLead
                  )}
                </div>
              </div>

              <button
                onClick={
                  closeAssignment
                }
                style={{
                  border:
                    "none",

                  background:
                    "transparent",

                  cursor:
                    "pointer",
                }}
              >
                <X
                  size={20}
                />
              </button>
            </div>


            {/* REQUIREMENT PREVIEW */}
            <div
              style={{
                marginBottom:
                  17,

                padding:
                  "11px 12px",

                border:
                  `1px solid ${C.border}`,

                borderRadius:
                  8,

                background:
                  "#F8FAFC",
              }}
            >
              <div
                style={
                  closeNoteLabelStyle
                }
              >
                Requirement Note
              </div>

              <div
                style={{
                  fontSize:
                    12,

                  lineHeight:
                    1.5,

                  color:
                    C.ink,

                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {selectedLead.closeRequirement ||
                  "—"}
              </div>
            </div>


            <label
              style={
                labelStyle
              }
            >
              Service
            </label>

            <select
              value={
                serviceType
              }
              onChange={(
                event
              ) => {
                setServiceType(
                  event.target
                    .value
                );

                setManagerId(
                  ""
                );
              }}
              style={
                inputStyle
              }
            >
              <option value="">
                Select service
              </option>

              {SERVICE_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>


            <label
              style={{
                ...labelStyle,
                marginTop: 15,
              }}
            >
              Manager
            </label>

            <select
              value={
                managerId
              }
              onChange={(
                event
              ) =>
                setManagerId(
                  event.target
                    .value
                )
              }
              disabled={
                !serviceType
              }
              style={{
                ...inputStyle,
                opacity:
                  !serviceType
                    ? 0.65
                    : 1,
              }}
            >
              <option value="">
                {serviceType
                  ? "Select manager"
                  : "Select service first"}
              </option>

              {availableManagers.map(
                (manager) => (
                  <option
                    key={
                      manager.id
                    }
                    value={
                      manager.id
                    }
                  >
                    {
                      manager.name
                    }
                  </option>
                )
              )}
            </select>

            {serviceType &&
              availableManagers.length ===
                0 && (
                <div
                  style={{
                    marginTop:
                      7,

                    fontSize:
                      11,

                    color:
                      "#B45309",
                  }}
                >
                  No active{" "}
                  {serviceType ===
                  "google_ads"
                    ? "Google Ads Manager"
                    : "Meta Ads Manager"}{" "}
                  found.
                </div>
              )}


            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap: 10,

                marginTop:
                  22,
              }}
            >
              <button
                onClick={
                  closeAssignment
                }
                style={{
                  padding:
                    "9px 15px",

                  border:
                    `1px solid ${C.border}`,

                  borderRadius:
                    7,

                  background:
                    "#fff",

                  cursor:
                    "pointer",

                  fontSize:
                    12,

                  fontWeight:
                    600,
                }}
              >
                Cancel
              </button>

              <button
                onClick={
                  handleAssign
                }
                disabled={
                  saving ||
                  !serviceType ||
                  !managerId
                }
                style={{
                  padding:
                    "9px 15px",

                  border:
                    "none",

                  borderRadius:
                    7,

                  background:
                    "#0F172A",

                  color:
                    "#fff",

                  cursor:
                    saving
                      ? "wait"
                      : "pointer",

                  fontSize:
                    12,

                  fontWeight:
                    600,

                  opacity:
                    saving ||
                    !serviceType ||
                    !managerId
                      ? 0.55
                      : 1,
                }}
              >
                {saving
                  ? "Assigning..."
                  : "Assign Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* =========================================================
   CLOSE NOTE ROW
========================================================= */

function CloseNoteRow({
  label,
  value,
  multiline = false,
  optional = false,
}) {
  return (
    <div
      style={{
        marginBottom:
          16,
      }}
    >
      <div
        style={
          closeNoteLabelStyle
        }
      >
        {label}

        {optional && (
          <span
            style={{
              fontWeight:
                400,

              color:
                C.inkSoft,

              marginLeft:
                5,
            }}
          >
            (Optional)
          </span>
        )}
      </div>

      <div
        style={{
          ...closeNoteValueStyle,

          whiteSpace:
            multiline
              ? "pre-wrap"
              : "normal",

          minHeight:
            multiline
              ? 40
              : "auto",
        }}
      >
        {value ||
          "—"}
      </div>
    </div>
  );
}


/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value
) {
  if (!value)
    return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


function formatDateTime(
  value
) {
  if (!value)
    return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


function formatCloseService(
  value
) {
  if (!value)
    return "—";

  if (
    value ===
    "google_ads"
  ) {
    return "Google Ads";
  }

  if (
    value ===
    "meta_ads"
  ) {
    return "Meta Ads";
  }

  return value;
}


function formatBudgetType(
  value
) {
  if (!value)
    return "—";

  if (
    value ===
    "daily"
  ) {
    return "Daily";
  }

  if (
    value ===
    "monthly"
  ) {
    return "Monthly";
  }

  return value;
}


function formatBudget(
  budget,
  budgetType
) {
  if (
    budget ===
      null ||
    budget ===
      undefined ||
    budget ===
      ""
  ) {
    return "—";
  }

  const number =
    Number(budget);

  if (
    Number.isNaN(
      number
    )
  ) {
    return String(
      budget
    );
  }

  const formatted =
    number.toLocaleString(
      "en-IN"
    );

  const type =
    formatBudgetType(
      budgetType
    );

  return `₹${formatted} / ${type}`;
}


function getEmployeeName(
  employeeId,
  employees
) {
  if (!employeeId)
    return "—";

  const employee =
    (
      employees || []
    ).find(
      (item) =>
        String(
          item.id
        ) ===
        String(
          employeeId
        )
    );

  return (
    employee?.name ||
    employee?.fullName ||
    employee?.email ||
    String(
      employeeId
    )
  );
}


function getClientName(
  lead
) {
  if (!lead)
    return "Unnamed Client";

  return (
    lead.name ||
    lead.business_name ||
    lead.businessName ||
    lead.company_name ||
    lead.companyName ||
    "Unnamed Client"
  );
}


function getCategory(
  lead
) {
  if (!lead)
    return "—";

  return (
    lead.business_category ||
    lead.category ||
    lead.businessCategory ||
    "—"
  );
}


function getContact(
  lead
) {
  if (!lead)
    return "—";

  return (
    lead.contact ||
    lead.phone ||
    lead.mobile ||
    "—"
  );
}


function getStatusBackground(
  status
) {
  switch (
    status
  ) {
    case "Active":
      return "#ECFDF5";

    case "Paused":
      return "#FFF7ED";

    case "Onboarding":
      return "#EEF2FF";

    case "Completed":
      return "#F0FDF4";

    case "Assigned":
    default:
      return "#F1F5F9";
  }
}


function getStatusColor(
  status
) {
  switch (
    status
  ) {
    case "Active":
      return "#047857";

    case "Paused":
      return "#C2410C";

    case "Onboarding":
      return "#4338CA";

    case "Completed":
      return "#166534";

    case "Assigned":
    default:
      return "#475569";
  }
}


function StatusBadge({
  status,
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        padding:
          "4px 9px",

        borderRadius:
          20,

        background:
          getStatusBackground(
            status
          ),

        color:
          getStatusColor(
            status
          ),

        fontSize:
          11,

        fontWeight:
          600,
      }}
    >
      {status ||
        "Assigned"}
    </span>
  );
}


/* =========================================================
   STYLES
========================================================= */

const tableHeadStyle = {
  padding:
    "12px 18px",

  textAlign:
    "left",

  fontSize:
    11,

  fontWeight:
    700,

  color:
    C.inkSoft,

  background:
    C.borderSoft,

  borderBottom:
    `1px solid ${C.border}`,

  whiteSpace:
    "nowrap",
};


const tableCellStyle = {
  padding:
    "13px 18px",

  fontSize:
    12,

  color:
    C.ink,

  borderBottom:
    `1px solid ${C.border}`,

  whiteSpace:
    "nowrap",
};


const labelStyle = {
  display:
    "block",

  fontSize:
    12,

  fontWeight:
    600,

  color:
    C.ink,

  marginBottom:
    7,
};


const closeNoteLabelStyle = {
  fontSize:
    11,

  fontWeight:
    700,

  color:
    C.inkSoft,

  marginBottom:
    6,

  textTransform:
    "uppercase",

  letterSpacing:
    "0.03em",
};


const closeNoteValueStyle = {
  padding:
    "10px 12px",

  border:
    `1px solid ${C.border}`,

  borderRadius:
    7,

  background:
    "#F8FAFC",

  fontSize:
    13,

  lineHeight:
    1.5,

  color:
    C.ink,
};