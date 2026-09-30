import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Save,
} from "lucide-react";

import {
  C,
  Panel,
  PageHeader,
  Button,
  EmptyNote,
  inputStyle,
} from "./ui";

import { supabase } from "./supabase";

export default function TeamManagement({
  employees = [],
  leads = [],
  onChanged,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [onlineEmployees, setOnlineEmployees] = useState({});
  const [roles, setRoles] = useState([]);

  const [editingEmployee, setEditingEmployee] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    employmentType: "",
    employmentRoleId: "",
    employmentStatus: "",
    monthlySalary: "",
    commissionPercentage: "",
    phone: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    employmentType: "",
    employmentRoleId: "",
    employmentStatus: "",
    monthlySalary: "",
    commissionPercentage: "",
  });

  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");

  const [busy, setBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  // =========================================================
  // LOAD ROLES
  // =========================================================

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("roles")
          .select("id, name")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) {
          console.error("Get roles error:", error);
          return;
        }

        setRoles(data || []);
      } catch (error) {
        console.error("Roles load error:", error);
      }
    };

    loadRoles();
  }, []);

  // =========================================================
  // ADD TEAM MEMBER
  // =========================================================

  const addMember = async () => {
    setBusy(true);
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const phone = form.phone.trim();

    if (!name) {
      setError("Please enter the team member's name.");
      setBusy(false);
      return;
    }

    if (!email) {
      setError("Please enter an email address.");
      setBusy(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setBusy(false);
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      setBusy(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setBusy(false);
      return;
    }

    if (!phone) {
      setError("Please enter a mobile number.");
      setBusy(false);
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      setBusy(false);
      return;
    }

    if (
      form.employmentType === "employee" &&
      !form.employmentRoleId
    ) {
      setError("Please select an employment role.");
      setBusy(false);
      return;
    }

    if (
      form.employmentType === "employee" &&
      !form.employmentStatus
    ) {
      setError("Please select an employment status.");
      setBusy(false);
      return;
    }

    if (
      form.employmentType === "employee" &&
      form.employmentStatus === "Salary Based"
    ) {
      if (
        !form.monthlySalary ||
        Number(form.monthlySalary) <= 0
      ) {
        setError("Please enter a valid monthly salary.");
        setBusy(false);
        return;
      }
    }

    if (
      form.employmentType === "employee" &&
      form.employmentStatus === "Commission Based"
    ) {
      if (
        form.commissionPercentage === "" ||
        Number(form.commissionPercentage) <= 0 ||
        Number(form.commissionPercentage) > 100
      ) {
        setError(
          "Please enter a valid commission percentage between 1 and 100."
        );
        setBusy(false);
        return;
      }
    }

    try {
      const { data, error } =
        await supabase.functions.invoke(
          "clever-worker",
          {
            body: {
              name,
              email,
              password,
              phone,

              role:
                form.employmentType === "admin"
                  ? "admin"
                  : "sales",

              employment_type:
                form.employmentType,

              employment_role_id:
                form.employmentType === "employee"
                  ? Number(form.employmentRoleId)
                  : null,

              employment_status:
                form.employmentType === "employee"
                  ? form.employmentStatus
                  : null,

              monthly_salary:
                form.employmentType === "employee" &&
                form.employmentStatus === "Salary Based"
                  ? Number(form.monthlySalary)
                  : null,

              commission_percentage:
                form.employmentType === "employee" &&
                form.employmentStatus === "Commission Based"
                  ? Number(form.commissionPercentage)
                  : null,
            },
          }
        );

      if (error) {
        console.error(
          "Edge Function error:",
          error
        );

        let message =
          "Unable to create team member. Please try again.";

        if (error.context) {
          try {
            const errorData =
              await error.context.json();

            if (errorData?.error) {
              message = errorData.error;
            }
          } catch {
            // Ignore JSON parsing errors
          }
        }

        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Unable to create team member."
        );
      }

      setError("");

      await onChanged();

      setForm({
        name: "",
        email: "",
        password: "",
        employmentType: "employee",
        employmentRoleId: "",
        employmentStatus: "",
        monthlySalary: "",
        commissionPercentage: "",
        phone: "",
      });

      setShowAdd(false);
    } catch (err) {
      console.error(
        "Add team member error:",
        err
      );

      setError(
        err.message ||
          "Unable to create team member. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEdit = (emp) => {
    setEditingEmployee(emp);

    setEditForm({
      name: emp.name || "",
      email: emp.email || "",
      password: "",
      phone: emp.phone || "",
      employmentType:
        emp.employmentType || "employee",
      employmentRoleId:
        emp.employmentRoleId
          ? String(emp.employmentRoleId)
          : "",
      employmentStatus:
        emp.employmentStatus || "",
      monthlySalary:
        emp.monthlySalary ?? "",
      commissionPercentage:
        emp.commissionPercentage ?? "",
    });

    setEditError("");
    setShowEdit(true);
  };

  // =========================================================
  // UPDATE TEAM MEMBER
  // =========================================================

  const updateMember = async () => {
    if (!editingEmployee) return;

    setEditBusy(true);
    setEditError("");

    const name = editForm.name.trim();
    const email = editForm.email.trim().toLowerCase();
    const password = editForm.password;
    const phone = editForm.phone.trim();

    if (!name) {
      setEditError("Please enter the team member's name.");
      setEditBusy(false);
      return;
    }

    if (!email) {
      setEditError("Please enter an email address.");
      setEditBusy(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setEditError("Please enter a valid email address.");
      setEditBusy(false);
      return;
    }

    if (password && password.length < 6) {
      setEditError(
        "Password must be at least 6 characters."
      );
      setEditBusy(false);
      return;
    }

    if (!phone) {
      setEditError("Please enter a mobile number.");
      setEditBusy(false);
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setEditError(
        "Please enter a valid 10-digit mobile number."
      );
      setEditBusy(false);
      return;
    }

    if (
      editForm.employmentType === "employee" &&
      !editForm.employmentRoleId
    ) {
      setEditError("Please select an employment role.");
      setEditBusy(false);
      return;
    }

    if (
      editForm.employmentType === "employee" &&
      !editForm.employmentStatus
    ) {
      setEditError(
        "Please select an employment status."
      );
      setEditBusy(false);
      return;
    }

    if (
      editForm.employmentType === "employee" &&
      editForm.employmentStatus === "Salary Based"
    ) {
      if (
        !editForm.monthlySalary ||
        Number(editForm.monthlySalary) <= 0
      ) {
        setEditError(
          "Please enter a valid monthly salary."
        );
        setEditBusy(false);
        return;
      }
    }

    if (
      editForm.employmentType === "employee" &&
      editForm.employmentStatus === "Commission Based"
    ) {
      if (
        editForm.commissionPercentage === "" ||
        Number(editForm.commissionPercentage) <= 0 ||
        Number(editForm.commissionPercentage) > 100
      ) {
        setEditError(
          "Please enter a valid commission percentage between 1 and 100."
        );
        setEditBusy(false);
        return;
      }
    }

    try {
      const payload = {
        action: "update_team_member",

        team_member_id: editingEmployee.id,

        auth_user_id:
          editingEmployee.authUserId,

        name,
        email,
        phone,

        employment_type:
          editForm.employmentType,

        employment_role_id:
          editForm.employmentType === "employee"
            ? Number(editForm.employmentRoleId)
            : null,

        employment_status:
          editForm.employmentType === "employee"
            ? editForm.employmentStatus
            : null,

        monthly_salary:
          editForm.employmentType === "employee" &&
          editForm.employmentStatus === "Salary Based"
            ? Number(editForm.monthlySalary)
            : null,

        commission_percentage:
          editForm.employmentType === "employee" &&
          editForm.employmentStatus === "Commission Based"
            ? Number(
                editForm.commissionPercentage
              )
            : null,

        // Empty password means:
        // keep existing password
        password: password || null,
      };

      console.log(
        "Updating team member:",
        payload
      );

      const { data, error } =
        await supabase.functions.invoke(
          "clever-worker",
          {
            body: payload,
          }
        );

      if (error) {
        console.error(
          "Update Edge Function error:",
          error
        );

        let message =
          "Unable to update team member. Please try again.";

        if (error.context) {
          try {
            const errorData =
              await error.context.json();

            if (errorData?.error) {
              message = errorData.error;
            }
          } catch {
            // Ignore JSON parsing errors
          }
        }

        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Unable to update team member."
        );
      }

      await onChanged();

      setShowEdit(false);
      setEditingEmployee(null);
      setEditError("");

    } catch (err) {
      console.error(
        "Update team member error:",
        err
      );

      setEditError(
        err.message ||
          "Unable to update team member. Please try again."
      );
    } finally {
      setEditBusy(false);
    }
  };

  // =========================================================
  // EMPLOYEE ONLINE STATUS
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadOnlineStatus = async () => {
      try {
        const today =
          new Date().toLocaleDateString("en-CA");

        const { data, error } = await supabase
          .from("employee_timesheets")
          .select(
            "employee_id, check_in, check_out"
          )
          .eq("work_date", today)
          .not("check_in", "is", null);

        if (error) {
          console.error(
            "Get online employee status error:",
            error
          );
          return;
        }

        if (!mounted) return;

        const statusMap = {};

        (data || []).forEach((timesheet) => {
          statusMap[timesheet.employee_id] =
            Boolean(
              timesheet.check_in &&
              !timesheet.check_out
            );
        });

        setOnlineEmployees(statusMap);
      } catch (error) {
        console.error(
          "Online status error:",
          error
        );
      }
    };

    loadOnlineStatus();

    const interval = setInterval(
      loadOnlineStatus,
      5000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // =========================================================
  // DELETE TEAM MEMBER
  // =========================================================

  const removeMember = async (emp) => {
    setError("");

    const confirmed = window.confirm(
      `Are you sure you want to delete ${emp.name}? This will remove their CRM access.`
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      console.log(
        "Deleting team member:",
        {
          id: emp.id,
          name: emp.name,
          authUserId: emp.authUserId,
        }
      );

      const { data, error } =
        await supabase.functions.invoke(
          "clever-worker",
          {
            body: {
              action: "delete_team_member",
              team_member_id: emp.id,
              auth_user_id: emp.authUserId,
            },
          }
        );

      if (error) {
        console.error(
          "Delete Edge Function error:",
          error
        );

        let message =
          "Unable to delete team member. Please try again.";

        if (error.context) {
          try {
            const errorData =
              await error.context.json();

            if (errorData?.error) {
              message = errorData.error;
            }
          } catch {
            // Ignore JSON parsing errors
          }
        }

        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Unable to delete team member."
        );
      }

      await onChanged();

    } catch (err) {
      console.error(
        "Delete team member error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete team member. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // =========================================================
  // GET EMPLOYMENT ROLE NAME
  // =========================================================

  const getRoleName = (emp) => {
    if (emp.employmentRoleName) {
      return emp.employmentRoleName;
    }

    if (
      emp.employmentType === "admin" ||
      emp.role === "admin"
    ) {
      return "Admin";
    }

    if (
      emp.employmentRoleId &&
      roles.length > 0
    ) {
      const role = roles.find(
        (item) =>
          Number(item.id) ===
          Number(emp.employmentRoleId)
      );

      return role?.name || "";
    }

    return "";
  };

  // =========================================================
  // CLOSE EDIT MODAL
  // =========================================================

  const closeEdit = () => {
    if (editBusy) return;

    setShowEdit(false);
    setEditingEmployee(null);
    setEditError("");
  };

  return (
    <div>

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <PageHeader
        title="Team"
        subtitle="Add employee logins and manage team access, salary and compensation."
      >
        <Button
          onClick={() => {
            setShowAdd(true);
            setError("");
          }}
          icon={Plus}
        >
          Add team member
        </Button>
      </PageHeader>


      {/* =====================================================
          ADD TEAM MEMBER
      ====================================================== */}

      {showAdd && (
        <Panel style={{ marginBottom: 14 }}>

          <div
            className="team-add-form"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 10,
            }}
          >

            <input
              placeholder="Full name *"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              style={inputStyle}
            />

            <input
              type="email"
              name="team-member-email"
              autoComplete="off"
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              style={inputStyle}
            />

            <input
              type="password"
              name="team-member-password"
              autoComplete="new-password"
              placeholder="Enter temporary password"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              style={inputStyle}
            />

            <input
              type="tel"
              placeholder="Mobile Number *"
              value={form.phone}
              maxLength={10}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value.replace(
                    /\D/g,
                    ""
                  ),
                })
              }
              style={inputStyle}
            />

            <select
              value={form.employmentType}
              onChange={(e) =>
                setForm({
                  ...form,
                  employmentType:
                    e.target.value,
                  employmentRoleId: "",
                  employmentStatus: "",
                  monthlySalary: "",
                  commissionPercentage: "",
                })
              }
              style={inputStyle}
            >
              <option value="">
                Select employment type
              </option>

              <option value="employee">
                Employee
              </option>

              <option value="admin">
                Admin
              </option>
            </select>


            {/* EMPLOYMENT STATUS */}

            {form.employmentType ===
              "employee" && (
              <select
                value={form.employmentStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employmentStatus:
                      e.target.value,
                    monthlySalary: "",
                    commissionPercentage: "",
                  })
                }
                style={inputStyle}
              >
                <option value="">
                  Select Employment Status *
                </option>

                <option value="Salary Based">
                  Salary Based
                </option>

                <option value="Commission Based">
                  Commission Based
                </option>
              </select>
            )}


            {/* MONTHLY SALARY */}

            {form.employmentType ===
              "employee" &&
              form.employmentStatus ===
                "Salary Based" && (
              <input
                type="number"
                min="0"
                placeholder="Monthly Salary *"
                value={form.monthlySalary}
                onChange={(e) =>
                  setForm({
                    ...form,
                    monthlySalary:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />
            )}


            {/* COMMISSION */}

            {form.employmentType ===
              "employee" &&
              form.employmentStatus ===
                "Commission Based" && (
              <div
                style={{
                  position: "relative",
                }}
              >
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  placeholder="Commission Percentage *"
                  value={
                    form.commissionPercentage
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      commissionPercentage:
                        e.target.value,
                    })
                  }
                  style={{
                    ...inputStyle,
                    paddingRight: 30,
                  }}
                />

                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    color: C.inkFaint,
                    fontSize: 13,
                    pointerEvents: "none",
                  }}
                >
                  %
                </span>
              </div>
            )}


            {/* EMPLOYMENT ROLE */}

            {form.employmentType ===
              "employee" && (
              <select
                value={form.employmentRoleId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employmentRoleId:
                      e.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="">
                  Select Employment Role *
                </option>

                {roles.map((role) => (
                  <option
                    key={role.id}
                    value={role.id}
                  >
                    {role.name}
                  </option>
                ))}
              </select>
            )}

          </div>


          <div
            style={{
              fontSize: 12,
              color: C.inkFaint,
              marginBottom: 10,
            }}
          >
            Share this username/password with the
            employee directly. There is no forgot
            password flow yet.
          </div>


          {error && (
            <div
              style={{
                color: C.danger,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {error}
            </div>
          )}


          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <Button
              onClick={addMember}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save"}
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>

        </Panel>
      )}


      {/* =====================================================
          TEAM MEMBERS
      ====================================================== */}

      {employees.length === 0 ? (
        <Panel>
          <EmptyNote text="No team members yet." />
        </Panel>
      ) : (
        <div
          className="team-members-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: 14,
          }}
        >

          {employees.map((emp) => {

            const assigned = leads.filter(
              (lead) =>
                lead.assignedEmployeeId ===
                emp.id
            );

            const closed = assigned.filter(
              (lead) =>
                lead.status === "Closed"
            ).length;

            const conversionRate =
              assigned.length > 0
                ? Math.round(
                    (closed /
                      assigned.length) *
                      100
                  )
                : 0;

            const employmentRole =
              getRoleName(emp);

            return (
              <div
                key={emp.id}
                style={{
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >

                {/* =================================================
                    EMPLOYEE HEADER
                ================================================== */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: 10,
                  }}
                >

                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >

                    {/* NAME */}

                    <div
                      style={{
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {emp.name}
                    </div>


                    {/* ONLINE / OFFLINE */}

                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: 5,
                        marginTop: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          onlineEmployees[
                            emp.id
                          ]
                            ? "#16A34A"
                            : C.inkFaint,
                      }}
                    >

                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius:
                            "50%",
                          background:
                            onlineEmployees[
                              emp.id
                            ]
                              ? "#16A34A"
                              : "#9CA3AF",
                          display:
                            "inline-block",
                        }}
                      />

                      {onlineEmployees[
                        emp.id
                      ]
                        ? "Online"
                        : "Offline"}

                    </div>


                    {/* EMPLOYMENT TYPE + ROLE */}

                    <div
                      style={{
                        fontSize: 12,
                        color:
                          C.inkFaint,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {emp.employmentType ===
                      "admin"
                        ? "Admin"
                        : employmentRole ||
                          "Sales"}
                      {" · "}
                      {emp.email}
                    </div>

                  </div>


                  {/* ACTIONS */}

                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >

                    {/* EDIT */}

                    <button
                      onClick={() =>
                        openEdit(emp)
                      }
                      disabled={busy}
                      title="Edit team member"
                      style={{
                        border: "none",
                        background: "none",
                        cursor: busy
                          ? "not-allowed"
                          : "pointer",
                        color: C.primaryDeep,
                        padding: 3,
                      }}
                    >
                      <Pencil size={15} />
                    </button>


                    {/* DELETE */}

                    <button
                      onClick={() =>
                        removeMember(emp)
                      }
                      disabled={busy}
                      title="Delete team member"
                      style={{
                        border: "none",
                        background: "none",
                        cursor: busy
                          ? "not-allowed"
                          : "pointer",
                        color: C.inkFaint,
                        padding: 3,
                      }}
                    >
                      <Trash2 size={15} />
                    </button>

                  </div>

                </div>


                {/* =================================================
                    COMPENSATION SUMMARY
                ================================================== */}

                {emp.employmentType ===
                  "employee" && (
                  <div
                    style={{
                      marginTop: 12,
                      padding:
                        "8px 10px",
                      background:
                        C.borderSoft,
                      borderRadius: 6,
                      fontSize: 11,
                      color:
                        C.inkFaint,
                    }}
                  >

                    {emp.employmentStatus ===
                      "Salary Based" ? (
                      <>
                        Salary Based · ₹
                        {Number(
                          emp.monthlySalary || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                        /month
                      </>
                    ) : emp.employmentStatus ===
                      "Commission Based" ? (
                      <>
                        Commission Based ·{" "}
                        {Number(
                          emp.commissionPercentage ||
                            0
                        )}
                        %
                      </>
                    ) : (
                      "Compensation not configured"
                    )}

                  </div>
                )}


                {/* =================================================
                    PERFORMANCE STATS
                ================================================== */}

                <div
                  className="team-member-stats"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: 12,
                    marginTop: 14,
                  }}
                >

                  <div>
                    <div
                      style={{
                        fontFamily:
                          "'IBM Plex Mono', monospace",
                        fontSize: 18,
                      }}
                    >
                      {assigned.length}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color:
                          C.inkFaint,
                      }}
                    >
                      Assigned
                    </div>
                  </div>


                  <div>
                    <div
                      style={{
                        fontFamily:
                          "'IBM Plex Mono', monospace",
                        fontSize: 18,
                        color:
                          C.primaryDeep,
                      }}
                    >
                      {closed}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color:
                          C.inkFaint,
                      }}
                    >
                      Closed
                    </div>
                  </div>


                  <div>
                    <div
                      style={{
                        fontFamily:
                          "'IBM Plex Mono', monospace",
                        fontSize: 18,
                        color:
                          C.accentDeep,
                      }}
                    >
                      {conversionRate}%
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color:
                          C.inkFaint,
                      }}
                    >
                      Conv. rate
                    </div>
                  </div>

                </div>


                {/* =================================================
                    CONVERSION BAR
                ================================================== */}

                <div
                  style={{
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      background:
                        C.borderSoft,
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          conversionRate,
                          100
                        )}%`,
                        background:
                          C.primary,
                        borderRadius: 20,
                        transition:
                          "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

              </div>
            );
          })}

        </div>
      )}


      {/* =====================================================
          EDIT TEAM MEMBER MODAL
      ====================================================== */}

      {showEdit && editingEmployee && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 2000,
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
              background: C.panel,
              borderRadius: 10,
              border:
                `1px solid ${C.border}`,
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.18)",
            }}
          >

            {/* MODAL HEADER */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                padding:
                  "16px 18px",
                borderBottom:
                  `1px solid ${C.border}`,
              }}
            >

              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Edit Team Member
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      C.inkFaint,
                    marginTop: 3,
                  }}
                >
                  Update login credentials,
                  employment and compensation.
                </div>
              </div>

              <button
                onClick={closeEdit}
                disabled={editBusy}
                style={{
                  border: "none",
                  background:
                    "transparent",
                  cursor: editBusy
                    ? "not-allowed"
                    : "pointer",
                  color:
                    C.inkFaint,
                }}
              >
                <X size={18} />
              </button>

            </div>


            {/* MODAL BODY */}

            <div
              style={{
                padding: 18,
              }}
            >

              <div
                className="team-edit-form"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, 1fr)",
                  gap: 10,
                }}
              >

                {/* NAME */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        C.inkFaint,
                      marginBottom: 5,
                    }}
                  >
                    Full Name
                  </label>

                  <input
                    value={
                      editForm.name
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        name:
                          e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>


                {/* USERNAME / EMAIL */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        C.inkFaint,
                      marginBottom: 5,
                    }}
                  >
                    Username / Email
                  </label>

                  <input
                    type="email"
                    autoComplete="off"
                    value={
                      editForm.email
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        email:
                          e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>


                {/* PASSWORD */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        C.inkFaint,
                      marginBottom: 5,
                    }}
                  >
                    New Password
                  </label>

                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current password"
                    value={
                      editForm.password
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        password:
                          e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>


                {/* PHONE */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        C.inkFaint,
                      marginBottom: 5,
                    }}
                  >
                    Mobile Number
                  </label>

                  <input
                    type="tel"
                    maxLength={10}
                    value={
                      editForm.phone
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        phone:
                          e.target.value.replace(
                            /\D/g,
                            ""
                          ),
                      })
                    }
                    style={inputStyle}
                  />
                </div>


                {/* EMPLOYMENT TYPE */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        C.inkFaint,
                      marginBottom: 5,
                    }}
                  >
                    Employment Type
                  </label>

                  <select
                    value={
                      editForm.employmentType
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        employmentType:
                          e.target.value,
                        employmentRoleId: "",
                        employmentStatus: "",
                        monthlySalary: "",
                        commissionPercentage: "",
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="employee">
                      Employee
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>
                </div>


                {/* EMPLOYMENT ROLE */}

                {editForm.employmentType ===
                  "employee" && (
                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          C.inkFaint,
                        marginBottom: 5,
                      }}
                    >
                      Employment Role
                    </label>

                    <select
                      value={
                        editForm.employmentRoleId
                      }
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          employmentRoleId:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="">
                        Select Employment Role
                      </option>

                      {roles.map(
                        (role) => (
                          <option
                            key={role.id}
                            value={
                              role.id
                            }
                          >
                            {role.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}


                {/* EMPLOYMENT STATUS */}

                {editForm.employmentType ===
                  "employee" && (
                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          C.inkFaint,
                        marginBottom: 5,
                      }}
                    >
                      Employment Status
                    </label>

                    <select
                      value={
                        editForm.employmentStatus
                      }
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          employmentStatus:
                            e.target.value,
                          monthlySalary:
                            "",
                          commissionPercentage:
                            "",
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="">
                        Select Employment Status
                      </option>

                      <option value="Salary Based">
                        Salary Based
                      </option>

                      <option value="Commission Based">
                        Commission Based
                      </option>
                    </select>
                  </div>
                )}


                {/* MONTHLY SALARY */}

                {editForm.employmentType ===
                  "employee" &&
                  editForm.employmentStatus ===
                    "Salary Based" && (
                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          C.inkFaint,
                        marginBottom: 5,
                      }}
                    >
                      Monthly Salary
                    </label>

                    <input
                      type="number"
                      min="0"
                      placeholder="Monthly Salary"
                      value={
                        editForm.monthlySalary
                      }
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          monthlySalary:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>
                )}


                {/* COMMISSION */}

                {editForm.employmentType ===
                  "employee" &&
                  editForm.employmentStatus ===
                    "Commission Based" && (
                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          C.inkFaint,
                        marginBottom: 5,
                      }}
                    >
                      Commission Percentage
                    </label>

                    <div
                      style={{
                        position:
                          "relative",
                      }}
                    >
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.01"
                        value={
                          editForm.commissionPercentage
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            commissionPercentage:
                              e.target.value,
                          })
                        }
                        style={{
                          ...inputStyle,
                          paddingRight: 30,
                        }}
                      />

                      <span
                        style={{
                          position:
                            "absolute",
                          right: 10,
                          top: "50%",
                          transform:
                            "translateY(-50%)",
                          color:
                            C.inkFaint,
                          fontSize: 13,
                          pointerEvents:
                            "none",
                        }}
                      >
                        %
                      </span>
                    </div>
                  </div>
                )}

              </div>


              {/* PASSWORD INFO */}

              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background:
                    C.borderSoft,
                  borderRadius: 6,
                  fontSize: 11,
                  color:
                    C.inkFaint,
                  lineHeight: 1.5,
                }}
              >
                Leave <strong>New Password</strong>{" "}
                blank if you don't want to change
                the existing password.
              </div>


              {/* ERROR */}

              {editError && (
                <div
                  style={{
                    marginTop: 12,
                    color:
                      C.danger,
                    fontSize: 12,
                  }}
                >
                  {editError}
                </div>
              )}

            </div>


            {/* MODAL FOOTER */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: 8,
                padding:
                  "12px 18px",
                borderTop:
                  `1px solid ${C.border}`,
              }}
            >

              <Button
                variant="ghost"
                onClick={closeEdit}
                disabled={editBusy}
              >
                Cancel
              </Button>

              <Button
                onClick={updateMember}
                disabled={editBusy}
                icon={Save}
              >
                {editBusy
                  ? "Saving…"
                  : "Save Changes"}
              </Button>

            </div>

          </div>

        </div>
      )}


      {/* =====================================================
          RESPONSIVE
      ====================================================== */}

      <style>{`

        @media (max-width: 900px) {

          .team-members-grid {
            grid-template-columns:
              repeat(2, 1fr) !important;
          }

          .team-add-form {
            grid-template-columns:
              repeat(2, 1fr) !important;
          }

          .team-edit-form {
            grid-template-columns:
              repeat(2, 1fr) !important;
          }

        }


        @media (max-width: 600px) {

          .team-members-grid {
            grid-template-columns:
              1fr !important;
          }

          .team-add-form {
            grid-template-columns:
              1fr !important;
          }

          .team-edit-form {
            grid-template-columns:
              1fr !important;
          }

          .team-member-stats {
            grid-template-columns:
              repeat(3, 1fr) !important;
          }

        }


        @media (max-width: 380px) {

          .team-member-stats {
            grid-template-columns:
              1fr !important;
          }

        }

      `}</style>

    </div>
  );
}