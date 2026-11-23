

import React, { useEffect, useState } from "react";

import { Plus, Trash2, Pencil, X, Save } from "lucide-react";

import {

  C,

  Panel,

  PageHeader,

  Button,

  EmptyNote,

  inputStyle,

} from "./ui";

import { supabase } from "./supabase";



const EMPTY_FORM = {

  name: "",

  email: "",

  password: "",

  employmentType: "employee",

  employmentRoleId: "",

  employmentStatus: "",

  employmentStage: "probation",

  monthlySalary: "",

  commissionPercentage: "",

  phone: "",

};



const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX = /^[6-9]\d{9}$/;



export default function TeamManagement({

  employees = [],

  leads = [],

  onChanged,

}) {

  const [showAdd, setShowAdd] = useState(false);

  const [showEdit, setShowEdit] = useState(false);

  const [onlineEmployees, setOnlineEmployees] = useState({});

  const [profilePictureUrls, setProfilePictureUrls] = useState({});

  const [roles, setRoles] = useState([]);

  const [editingEmployee, setEditingEmployee] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [editForm, setEditForm] = useState({ ...EMPTY_FORM, password: "" });

  const [error, setError] = useState("");

  const [editError, setEditError] = useState("");

  const [busy, setBusy] = useState(false);

  const [editBusy, setEditBusy] = useState(false);



  // =====================================================

  // PROFILE PHOTOS
  useEffect(() => {
    let cancelled = false;

    const loadProfilePictures = async () => {
      const entries = await Promise.all(
        employees.map(async (emp) => {
          const rawPath = emp.profilePicturePath || emp.profile_picture_path || null;
          if (!rawPath) return [emp.id, null];

          // A complete URL should be used directly.
          if (/^https?:\/\//i.test(rawPath)) return [emp.id, rawPath];

          // Supabase expects a path relative to the selected bucket.
          const path = String(rawPath)
            .replace(/^\/+/, "")
            .replace(/^profile-photos\//, "");

          try {
            const { data, error: storageError } = await supabase.storage
              .from("profile-photos")
              .createSignedUrl(path, 3600);

            if (storageError || !data?.signedUrl) {
              console.error(
                "Profile picture load error:", emp.name, storageError,
                "Stored path:", rawPath, "Storage path used:", path
              );
              return [emp.id, null];
            }
            return [emp.id, data.signedUrl];
          } catch (storageError) {
            console.error("Profile picture load exception:", emp.name, storageError);
            return [emp.id, null];
          }
        })
      );

      if (!cancelled) setProfilePictureUrls(Object.fromEntries(entries));
    };

    loadProfilePictures();
    return () => { cancelled = true; };
  }, [employees]);

  // LOAD ROLES

  // =====================================================

  useEffect(() => {

    let cancelled = false;



    const loadRoles = async () => {

      const { data, error: rolesError } = await supabase

        .from("roles")

        .select("id, name")

        .eq("is_active", true)

        .order("name", { ascending: true });



      if (rolesError) {

        console.error("Get roles error:", rolesError);

        return;

      }



      if (!cancelled) {

        setRoles(data || []);

      }

    };



    loadRoles();



    return () => {

      cancelled = true;

    };

  }, []);



  // =====================================================

  // ONLINE / OFFLINE STATUS

  // =====================================================

  useEffect(() => {

    let mounted = true;



    const loadOnlineStatus = async () => {

      try {

        const now = new Date();

        const today = [

          now.getFullYear(),

          String(now.getMonth() + 1).padStart(2, "0"),

          String(now.getDate()).padStart(2, "0"),

        ].join("-");



        const { data, error: statusError } = await supabase

          .from("employee_timesheets")

          .select("employee_id, check_in, check_out")

          .eq("work_date", today)

          .not("check_in", "is", null);



        if (statusError) {

          console.error("Online status error:", statusError);

          return;

        }



        if (!mounted) return;



        const statusMap = {};



        (data || []).forEach((item) => {

          statusMap[item.employee_id] = Boolean(

            item.check_in && !item.check_out

          );

        });



        setOnlineEmployees(statusMap);

      } catch (err) {

        console.error("Online status error:", err);

      }

    };



    loadOnlineStatus();



    const interval = setInterval(loadOnlineStatus, 15000);



    return () => {

      mounted = false;

      clearInterval(interval);

    };

  }, []);



  // =====================================================

  // ROLE NAME

  // =====================================================

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



    if (emp.employmentRoleId && roles.length > 0) {

      const role = roles.find(

        (item) =>

          Number(item.id) === Number(emp.employmentRoleId)

      );



      return role?.name || "";

    }



    return "";

  };



  // =====================================================

  // FORM VALIDATION

  // =====================================================

  const validateForm = (values, setMessage) => {

    const name = values.name.trim();

    const email = values.email.trim().toLowerCase();

    const phone = values.phone.trim();



    if (!name) {

      setMessage("Please enter the team member's name.");

      return false;

    }



    if (!email || !EMAIL_REGEX.test(email)) {

      setMessage("Please enter a valid email address.");

      return false;

    }



    if (!phone || !PHONE_REGEX.test(phone)) {

      setMessage("Please enter a valid 10-digit mobile number.");

      return false;

    }



    if (

      values.employmentType === "employee" &&

      !values.employmentRoleId

    ) {

      setMessage("Please select an employment role.");

      return false;

    }



    if (

      values.employmentType === "employee" &&

      !values.employmentStatus

    ) {

      setMessage("Please select an employment status.");

      return false;

    }



    if (

      values.employmentType === "employee" &&

      values.employmentStatus === "Salary Based"

    ) {

      if (

        !values.employmentStage ||

        values.employmentStage === "not_applicable"

      ) {

        setMessage("Please select an employment stage.");

        return false;

      }



      if (

        !values.monthlySalary ||

        Number(values.monthlySalary) <= 0

      ) {

        setMessage("Please enter a valid monthly salary.");

        return false;

      }

    }



    if (

      values.employmentType === "employee" &&

      values.employmentStatus === "Commission Based" &&

      (

        values.commissionPercentage === "" ||

        Number(values.commissionPercentage) <= 0 ||

        Number(values.commissionPercentage) > 100

      )

    ) {

      setMessage(

        "Please enter a valid commission percentage between 1 and 100."

      );

      return false;

    }



    return true;

  };



  // =====================================================

  // ADD TEAM MEMBER

  // =====================================================

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



    if (!email || !EMAIL_REGEX.test(email)) {

      setError("Please enter a valid email address.");

      setBusy(false);

      return;

    }



    if (!password || password.length < 6) {

      setError("Password must be at least 6 characters.");

      setBusy(false);

      return;

    }



    if (!phone || !PHONE_REGEX.test(phone)) {

      setError("Please enter a valid 10-digit mobile number.");

      setBusy(false);

      return;

    }



    if (!validateForm({ ...form, name, email, phone }, setError)) {

      setBusy(false);

      return;

    }



    try {

      const { data, error: invokeError } =

        await supabase.functions.invoke("clever-worker", {

          body: {

            name,

            email,

            password,

            phone,

            role:

              form.employmentType === "admin"

                ? "admin"

                : "sales",

            employment_type: form.employmentType,

            employment_role_id:

              form.employmentType === "employee"

                ? Number(form.employmentRoleId)

                : null,

            employment_status:

              form.employmentType === "employee"

                ? form.employmentStatus

                : null,

            employment_stage:

              form.employmentType === "employee" &&

              form.employmentStatus === "Salary Based"

                ? form.employmentStage

                : "not_applicable",

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

        });



      if (invokeError) {

        let message =

          invokeError.message ||

          "Unable to create team member. Please try again.";



        if (invokeError.context) {

          try {

            const response = await invokeError.context.json();

            if (response?.error) message = response.error;

          } catch {

            // Keep the original error message.

          }

        }



        throw new Error(message);

      }



      if (!data?.success) {

        throw new Error(

          data?.error || "Unable to create team member."

        );

      }



      if (onChanged) await onChanged();



      setForm({ ...EMPTY_FORM });

      setShowAdd(false);

      setError("");

    } catch (err) {

      console.error("Add team member error:", err);

      setError(err.message || "Unable to create team member.");

    } finally {

      setBusy(false);

    }

  };



  // =====================================================

  // OPEN EDIT

  // =====================================================

  const openEdit = (emp) => {

    setEditingEmployee(emp);



    setEditForm({

      name: emp.name || "",

      email: emp.email || "",

      password: "",

      phone: emp.phone || "",

      employmentType: emp.employmentType || "employee",

      employmentRoleId: emp.employmentRoleId

        ? String(emp.employmentRoleId)

        : "",

      employmentStatus: emp.employmentStatus || "",

      employmentStage:

        emp.employmentStage ||

        emp.employment_stage ||

        (

          emp.employmentStatus === "Commission Based" ||

          emp.employmentType === "admin"

            ? "not_applicable"

            : "probation"

        ),

      monthlySalary: emp.monthlySalary ?? "",

      commissionPercentage: emp.commissionPercentage ?? "",

    });



    setEditError("");

    setShowEdit(true);

  };



  // =====================================================

  // UPDATE TEAM MEMBER

  // =====================================================

  const updateMember = async () => {

    if (!editingEmployee) return;



    setEditBusy(true);

    setEditError("");



    const name = editForm.name.trim();

    const email = editForm.email.trim().toLowerCase();

    const phone = editForm.phone.trim();



    if (

      editForm.password &&

      editForm.password.length < 6

    ) {

      setEditError("New password must be at least 6 characters.");

      setEditBusy(false);

      return;

    }



    if (!validateForm({ ...editForm, name, email, phone }, setEditError)) {

      setEditBusy(false);

      return;

    }



    try {

      const { data, error: invokeError } =

        await supabase.functions.invoke("clever-worker", {

          body: {

            action: "update_team_member",

            team_member_id: editingEmployee.id,

            auth_user_id:

              editingEmployee.authUserId ||

              editingEmployee.auth_user_id,

            name,

            email,

            phone,

            employment_type: editForm.employmentType,

            employment_role_id:

              editForm.employmentType === "employee"

                ? Number(editForm.employmentRoleId)

                : null,

            employment_status:

              editForm.employmentType === "employee"

                ? editForm.employmentStatus

                : null,

            employment_stage:

              editForm.employmentType === "employee" &&

              editForm.employmentStatus === "Salary Based"

                ? editForm.employmentStage

                : "not_applicable",

            monthly_salary:

              editForm.employmentType === "employee" &&

              editForm.employmentStatus === "Salary Based"

                ? Number(editForm.monthlySalary)

                : null,

            commission_percentage:

              editForm.employmentType === "employee" &&

              editForm.employmentStatus === "Commission Based"

                ? Number(editForm.commissionPercentage)

                : null,

            password: editForm.password || null,

          },

        });



      if (invokeError) {

        let message =

          invokeError.message ||

          "Unable to update team member. Please try again.";



        if (invokeError.context) {

          try {

            const response = await invokeError.context.json();

            if (response?.error) message = response.error;

          } catch {

            // Keep the original error message.

          }

        }



        throw new Error(message);

      }



      if (!data?.success) {

        throw new Error(

          data?.error || "Unable to update team member."

        );

      }



      if (onChanged) await onChanged();



      setShowEdit(false);

      setEditingEmployee(null);

      setEditError("");

    } catch (err) {

      console.error("Update team member error:", err);

      setEditError(err.message || "Unable to update team member.");

    } finally {

      setEditBusy(false);

    }

  };



  // =====================================================

  // DELETE TEAM MEMBER

  // =====================================================

  const removeMember = async (emp) => {

    setError("");



    const confirmed = window.confirm(

      `Are you sure you want to delete ${emp.name}? This will remove their CRM access.`

    );



    if (!confirmed) return;



    setBusy(true);



    try {

      const { data, error: invokeError } =

        await supabase.functions.invoke("clever-worker", {

          body: {

            action: "delete_team_member",

            team_member_id: emp.id,

            auth_user_id:

              emp.authUserId || emp.auth_user_id,

          },

        });



      if (invokeError) {

        let message =

          invokeError.message ||

          "Unable to delete team member. Please try again.";



        if (invokeError.context) {

          try {

            const response = await invokeError.context.json();

            if (response?.error) message = response.error;

          } catch {

            // Keep the original error message.

          }

        }



        throw new Error(message);

      }



      if (!data?.success) {

        throw new Error(

          data?.error || "Unable to delete team member."

        );

      }



      if (onChanged) await onChanged();

    } catch (err) {

      console.error("Delete team member error:", err);

      setError(err.message || "Unable to delete team member.");

    } finally {

      setBusy(false);

    }

  };



  const closeEdit = () => {

    if (editBusy) return;

    setShowEdit(false);

    setEditingEmployee(null);

    setEditError("");

  };



  // FORM FIELD HELPER

  // =====================================================

  const renderFormFields = (values, setValues, isEdit = false) => {

    const update = (key, value) => {

      setValues((previous) => ({ ...previous, [key]: value }));

    };



    return (

      <>

        <input

          placeholder="Full name *"

          value={values.name}

          onChange={(e) => update("name", e.target.value)}

          style={inputStyle}

        />



        <input

          type="email"

          autoComplete="off"

          placeholder="Email address *"

          value={values.email}

          onChange={(e) => update("email", e.target.value)}

          style={inputStyle}

        />



        <input

          type="password"

          autoComplete="new-password"

          placeholder={

            isEdit

              ? "New password (leave blank to keep current)"

              : "Temporary password *"

          }

          value={values.password}

          onChange={(e) => update("password", e.target.value)}

          style={inputStyle}

        />



        <input

          type="tel"

          placeholder="Mobile number *"

          value={values.phone}

          maxLength={10}

          onChange={(e) =>

            update("phone", e.target.value.replace(/\D/g, ""))

          }

          style={inputStyle}

        />



        <select

          value={values.employmentType}

          onChange={(e) =>

            setValues((previous) => ({

              ...previous,

              employmentType: e.target.value,

              employmentRoleId: "",

              employmentStatus: "",

              employmentStage: "probation",

              monthlySalary: "",

              commissionPercentage: "",

            }))

          }

          style={inputStyle}

        >

          <option value="">Select employment type *</option>

          <option value="employee">Employee</option>

          <option value="admin">Admin</option>

        </select>



        {values.employmentType === "employee" && (

          <select

            value={values.employmentStatus}

            onChange={(e) =>

              setValues((previous) => ({

                ...previous,

                employmentStatus: e.target.value,

                employmentStage:

                  e.target.value === "Commission Based"

                    ? "not_applicable"

                    : "probation",

                monthlySalary: "",

                commissionPercentage: "",

              }))

            }

            style={inputStyle}

          >

            <option value="">Select employment status *</option>

            <option value="Salary Based">Salary Based</option>

            <option value="Commission Based">Commission Based</option>

          </select>

        )}



        {values.employmentType === "employee" &&

          values.employmentStatus === "Salary Based" && (

            <select

              value={values.employmentStage}

              onChange={(e) => update("employmentStage", e.target.value)}

              style={inputStyle}

            >

              <option value="">Select employment stage *</option>

              <option value="probation">Probation</option>

              <option value="confirmed">Confirmed</option>

              <option value="terminated">Terminated</option>

            </select>

          )}



        {values.employmentType === "employee" &&

          values.employmentStatus === "Commission Based" && (

            <div

              style={{

                ...inputStyle,

                display: "flex",

                alignItems: "center",

                color: C.inkFaint,

              }}

            >

              Employment Stage: Not Applicable (Commission Based)

            </div>

          )}



        {values.employmentType === "employee" &&

          values.employmentStatus === "Salary Based" && (

            <input

              type="number"

              min="0"

              placeholder="Monthly salary *"

              value={values.monthlySalary}

              onChange={(e) => update("monthlySalary", e.target.value)}

              style={inputStyle}

            />

          )}



        {values.employmentType === "employee" &&

          values.employmentStatus === "Commission Based" && (

            <div style={{ position: "relative" }}>

              <input

                type="number"

                min="1"

                max="100"

                step="0.01"

                placeholder="Commission percentage *"

                value={values.commissionPercentage}

                onChange={(e) =>

                  update("commissionPercentage", e.target.value)

                }

                style={{ ...inputStyle, paddingRight: 30 }}

              />

              <span

                style={{

                  position: "absolute",

                  right: 10,

                  top: "50%",

                  transform: "translateY(-50%)",

                  color: C.inkFaint,

                  fontSize: 13,

                  pointerEvents: "none",

                }}

              >

                %

              </span>

            </div>

          )}



        {values.employmentType === "employee" && (

          <select

            value={values.employmentRoleId}

            onChange={(e) => update("employmentRoleId", e.target.value)}

            style={inputStyle}

          >

            <option value="">Select employment role *</option>

            {roles.map((role) => (

              <option key={role.id} value={role.id}>

                {role.name}

              </option>

            ))}

          </select>

        )}

      </>

    );

  };



  return (

    <div>

      <PageHeader
        title="Team"
        subtitle="Add employee logins and manage team access, salary and compensation."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Button
            onClick={() => {
              setShowAdd(true);
              setError("");
            }}
            icon={Plus}
          >
            Add team member
          </Button>
        </div>
      </PageHeader>



      
      {/* ADD TEAM MEMBER */}

      {showAdd && (

        <Panel style={{ marginBottom: 14 }}>

          <div

            className="team-add-form"

            style={{

              display: "grid",

              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",

              gap: 10,

              marginBottom: 10,

            }}

          >

            {renderFormFields(form, setForm)}

          </div>



          <div

            style={{

              fontSize: 12,

              color: C.inkFaint,

              marginBottom: 10,

            }}

          >

            Share the login details with the employee directly. There is no

            forgot-password flow yet.

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



          <div style={{ display: "flex", gap: 8 }}>

            <Button onClick={addMember} disabled={busy}>

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



      {error && !showAdd && (

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



      {/* TEAM MEMBER CARDS */}

      {employees.length === 0 ? (

        <Panel>

          <EmptyNote text="No team members yet." />

        </Panel>

      ) : (

        <div

          className="team-members-grid"

          style={{

            display: "grid",

            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",

            gap: 14,

          }}

        >

          {employees.map((emp) => {

            const assigned = leads.filter(

              (lead) => lead.assignedEmployeeId === emp.id

            );



            const closed = assigned.filter(

              (lead) => lead.status === "Closed"

            ).length;



            const conversionRate =

              assigned.length > 0

                ? Math.round((closed / assigned.length) * 100)

                : 0;



            const employmentRole = getRoleName(emp);

            const employmentStage =

              emp.employmentStage ||

              emp.employment_stage ||

              "not_set";



            const stageColor =

              employmentStage === "probation"

                ? "#92400E"

                : employmentStage === "confirmed"

                  ? "#166534"

                  : employmentStage === "terminated"

                    ? "#991B1B"

                    : C.inkFaint;



            const stageBackground =

              employmentStage === "probation"

                ? "#FEF3C7"

                : employmentStage === "confirmed"

                  ? "#DCFCE7"

                  : employmentStage === "terminated"

                    ? "#FEE2E2"

                    : C.borderSoft;



            const stageBorder =

              employmentStage === "probation"

                ? "#F59E0B"

                : employmentStage === "confirmed"

                  ? "#22C55E"

                  : employmentStage === "terminated"

                    ? "#EF4444"

                    : C.border;



            const stageLabel =

              employmentStage === "probation"

                ? "Probation"

                : employmentStage === "confirmed"

                  ? "Confirmed"

                  : employmentStage === "terminated"

                    ? "Terminated"

                    : employmentStage === "not_applicable"

                      ? "Not Applicable"

                      : "Stage Not Set";



            const pictureUrl = profilePictureUrls[emp.id];



            return (

              <div

                key={emp.id}

                style={{

                  background:

                    employmentStage === "probation"

                      ? "#FFFBEB"

                      : employmentStage === "confirmed"

                        ? "#F0FDF4"

                        : employmentStage === "terminated"

                          ? "#FEF2F2"

                          : C.panel,

                  border: `1px solid ${stageBorder}`,

                  borderRadius: 8,

                  padding: 16,

                  minWidth: 0,

                }}

              >

                {/* HEADER: PHOTO + DETAILS APPEAR ONLY ONCE */}

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "flex-start",

                    gap: 10,

                  }}

                >

                  <div

                    style={{

                      minWidth: 0,

                      display: "flex",

                      alignItems: "flex-start",

                      gap: 10,

                      flex: 1,

                    }}

                  >

                    {pictureUrl ? (

                      <img

                        src={pictureUrl}

                        alt={`${emp.name || "Employee"} profile`}

                        onError={() => {

                          console.error(

                            "Profile image failed to render:",

                            emp.name,

                            emp.profilePicturePath ||

                              emp.profile_picture_path

                          );



                          setProfilePictureUrls((previous) => ({

                            ...previous,

                            [emp.id]: null,

                          }));

                        }}

                        style={{

                          width: 46,

                          height: 46,

                          minWidth: 46,

                          borderRadius: "50%",

                          objectFit: "cover",

                          flexShrink: 0,

                          border: `1px solid ${C.border}`,

                          display: "block",

                        }}

                      />

                    ) : (

                      <div

                        style={{

                          width: 46,

                          height: 46,

                          minWidth: 46,

                          borderRadius: "50%",

                          flexShrink: 0,

                          display: "flex",

                          alignItems: "center",

                          justifyContent: "center",

                          background: C.borderSoft,

                          color: C.primaryDeep,

                          fontSize: 17,

                          fontWeight: 700,

                          border: `1px solid ${C.border}`,

                        }}

                      >

                        {emp.name?.trim()?.charAt(0)?.toUpperCase() || "?"}

                      </div>

                    )}



                    <div style={{ minWidth: 0, flex: 1 }}>

                      {/* NAME */}

                      <div

                        style={{

                          fontWeight: 600,

                          overflow: "hidden",

                          textOverflow: "ellipsis",

                          whiteSpace: "nowrap",

                        }}

                      >

                        {emp.name}

                      </div>



                      {/* ONLINE STATUS: ONE INSTANCE */}

                      <div

                        style={{

                          display: "flex",

                          alignItems: "center",

                          gap: 5,

                          marginTop: 4,

                          fontSize: 11,

                          fontWeight: 600,

                          color: onlineEmployees[emp.id]

                            ? "#16A34A"

                            : C.inkFaint,

                        }}

                      >

                        <span

                          style={{

                            width: 7,

                            height: 7,

                            borderRadius: "50%",

                            background: onlineEmployees[emp.id]

                              ? "#16A34A"

                              : "#9CA3AF",

                            display: "inline-block",

                          }}

                        />

                        {onlineEmployees[emp.id] ? "Online" : "Offline"}

                      </div>



                      {/* ROLE + EMAIL: ONE INSTANCE */}

                      <div

                        style={{

                          fontSize: 12,

                          color: C.inkFaint,

                          marginTop: 4,

                          overflow: "hidden",

                          textOverflow: "ellipsis",

                          whiteSpace: "nowrap",

                        }}

                      >

                        {emp.employmentType === "admin"

                          ? "Admin"

                          : employmentRole || "Sales"}

                        {" · "}

                        {emp.email}

                      </div>



                      {/* EMPLOYMENT STAGE: ONE INSTANCE */}

                      <div style={{ marginTop: 7 }}>

                        <span

                          style={{

                            display: "inline-block",

                            padding: "3px 8px",

                            borderRadius: 999,

                            fontSize: 10,

                            fontWeight: 700,

                            color: stageColor,

                            background: stageBackground,

                            border: `1px solid ${stageBorder}`,

                          }}

                        >

                          {stageLabel}

                        </span>

                      </div>

                    </div>

                  </div>



                  {/* ACTIONS */}

                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>

                    <button

                      onClick={() => openEdit(emp)}

                      disabled={busy}

                      title="Edit team member"

                      aria-label={`Edit ${emp.name}`}

                      style={{

                        border: "none",

                        background: "none",

                        cursor: busy ? "not-allowed" : "pointer",

                        color: C.primaryDeep,

                        padding: 3,

                      }}

                    >

                      <Pencil size={15} />

                    </button>



                    <button

                      onClick={() => removeMember(emp)}

                      disabled={busy}

                      title="Delete team member"

                      aria-label={`Delete ${emp.name}`}

                      style={{

                        border: "none",

                        background: "none",

                        cursor: busy ? "not-allowed" : "pointer",

                        color: C.inkFaint,

                        padding: 3,

                      }}

                    >

                      <Trash2 size={15} />

                    </button>

                  </div>

                </div>



                {/* COMPENSATION */}

                {emp.employmentType === "employee" && (

                  <div

                    style={{

                      marginTop: 12,

                      padding: "8px 10px",

                      background: C.borderSoft,

                      borderRadius: 6,

                      fontSize: 11,

                      color: C.inkFaint,

                    }}

                  >

                    {emp.employmentStatus === "Salary Based" ? (

                      <>

                        Salary Based · ₹

                        {Number(emp.monthlySalary || 0).toLocaleString("en-IN")}

                        /month

                      </>

                    ) : emp.employmentStatus === "Commission Based" ? (

                      <>

                        Commission Based ·{" "}

                        {Number(emp.commissionPercentage || 0)}%

                      </>

                    ) : (

                      "Compensation not configured"

                    )}

                  </div>

                )}



                {/* PERFORMANCE STATS */}

                <div

                  className="team-member-stats"

                  style={{

                    display: "grid",

                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",

                    gap: 12,

                    marginTop: 14,

                  }}

                >

                  <div>

                    <div

                      style={{

                        fontFamily: "'IBM Plex Mono', monospace",

                        fontSize: 18,

                      }}

                    >

                      {assigned.length}

                    </div>

                    <div style={{ fontSize: 11, color: C.inkFaint }}>

                      Assigned

                    </div>

                  </div>



                  <div>

                    <div

                      style={{

                        fontFamily: "'IBM Plex Mono', monospace",

                        fontSize: 18,

                        color: C.primaryDeep,

                      }}

                    >

                      {closed}

                    </div>

                    <div style={{ fontSize: 11, color: C.inkFaint }}>

                      Closed

                    </div>

                  </div>



                  <div>

                    <div

                      style={{

                        fontFamily: "'IBM Plex Mono', monospace",

                        fontSize: 18,

                        color: C.accentDeep,

                      }}

                    >

                      {conversionRate}%

                    </div>

                    <div style={{ fontSize: 11, color: C.inkFaint }}>

                      Conv. rate

                    </div>

                  </div>

                </div>



                {/* CONVERSION BAR */}

                <div style={{ marginTop: 14 }}>

                  <div

                    style={{

                      height: 6,

                      background: C.borderSoft,

                      borderRadius: 20,

                      overflow: "hidden",

                    }}

                  >

                    <div

                      style={{

                        height: "100%",

                        width: `${Math.min(conversionRate, 100)}%`,

                        background: C.primary,

                        borderRadius: 20,

                        transition: "width 0.3s ease",

                      }}

                    />

                  </div>

                </div>

              </div>

            );

          })}

        </div>

      )}



      {/* EDIT TEAM MEMBER */}

      {showEdit && editingEmployee && (

        <div

          style={{

            position: "fixed",

            inset: 0,

            background: "rgba(15, 23, 42, 0.45)",

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

              border: `1px solid ${C.border}`,

              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",

            }}

          >

            {/* MODAL HEADER */}

            <div

              style={{

                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                padding: "16px 18px",

                borderBottom: `1px solid ${C.border}`,

              }}

            >

              <div>

                <div style={{ fontSize: 16, fontWeight: 700 }}>

                  Edit Team Member

                </div>

                <div

                  style={{

                    fontSize: 11,

                    color: C.inkFaint,

                    marginTop: 3,

                  }}

                >

                  Update login credentials, employment and compensation.

                </div>

              </div>



              <button

                onClick={closeEdit}

                disabled={editBusy}

                aria-label="Close edit dialog"

                style={{

                  border: "none",

                  background: "transparent",

                  cursor: editBusy ? "not-allowed" : "pointer",

                  color: C.inkFaint,

                }}

              >

                <X size={18} />

              </button>

            </div>



            {/* MODAL BODY */}

            <div style={{ padding: 18 }}>

              <div

                className="team-edit-form"

                style={{

                  display: "grid",

                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

                  gap: 10,

                }}

              >

                {renderFormFields(editForm, setEditForm, true)}

              </div>



              <div

                style={{

                  marginTop: 12,

                  padding: 10,

                  background: C.borderSoft,

                  borderRadius: 6,

                  fontSize: 11,

                  color: C.inkFaint,

                  lineHeight: 1.5,

                }}

              >

                Leave <strong>New password</strong> blank if you do not want

                to change the existing password.

              </div>



              {editError && (

                <div

                  style={{

                    marginTop: 12,

                    color: C.danger,

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

                justifyContent: "flex-end",

                gap: 8,

                padding: "12px 18px",

                borderTop: `1px solid ${C.border}`,

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

                {editBusy ? "Saving…" : "Save Changes"}

              </Button>

            </div>

          </div>

        </div>

      )}



      {/* RESPONSIVE */}

      <style>{`

        @media (max-width: 900px) {

          .team-members-grid {

            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;

          }

          .team-add-form {

            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;

          }

          .team-edit-form {

            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;

          }

        }



        @media (max-width: 600px) {

          .team-members-grid,

          .team-add-form,

          .team-edit-form {

            grid-template-columns: 1fr !important;

          }

          .team-member-stats {

            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;

          }

        }



        @media (max-width: 380px) {

          .team-member-stats {

            grid-template-columns: 1fr !important;

          }

        }

      `}</style>

    </div>

  );

}
