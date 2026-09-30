import { supabase } from "./supabase";

/* =========================================================
   GET MONTHLY TIMESHEET
========================================================= */

export async function getMonthlyTimesheet(employeeId, month) {
  const startDate = `${month}-01`;

  const [year, monthNumber] = month.split("-").map(Number);

  const lastDay = new Date(year, monthNumber, 0).getDate();

  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("monthly_timesheet_entries")
    .select(`
      *,
      monthly_timesheet_leads (
        lead_id
      )
    `)
    .eq("employee_id", employeeId)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    workDate: row.work_date,
    workingMinutes: row.working_minutes,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    workedLeadIds:
      row.monthly_timesheet_leads?.map(
        (item) => item.lead_id
      ) || [],
  }));
}


/* =========================================================
   GET ONE DAY
========================================================= */

export async function getMonthlyTimesheetDay(
  employeeId,
  workDate
) {
  const { data, error } = await supabase
    .from("monthly_timesheet_entries")
    .select(`
      *,
      monthly_timesheet_leads (
        lead_id
      )
    `)
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    employeeId: data.employee_id,
    workDate: data.work_date,
    workingMinutes: data.working_minutes,
    status: data.status,
    submittedAt: data.submitted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    workedLeadIds:
      data.monthly_timesheet_leads?.map(
        (item) => item.lead_id
      ) || [],
  };
}


/* =========================================================
   SAVE DAILY TIMESHEET
========================================================= */

export async function saveMonthlyTimesheetDay({
  employeeId,
  workDate,
  workingMinutes,
  leadIds,
}) {
  const { data: entry, error: entryError } = await supabase
    .from("monthly_timesheet_entries")
    .upsert(
      {
        employee_id: employeeId,
        work_date: workDate,
        working_minutes: workingMinutes || 0,
        status: "Submitted",
        submitted_at: new Date().toISOString(),
      },
      {
        onConflict: "employee_id,work_date",
      }
    )
    .select()
    .single();

  if (entryError) {
    throw entryError;
  }

  /* Delete previously selected leads */
  const { error: deleteError } = await supabase
    .from("monthly_timesheet_leads")
    .delete()
    .eq("timesheet_entry_id", entry.id);

  if (deleteError) {
    throw deleteError;
  }

  /* Add newly selected leads */
  if (leadIds && leadIds.length > 0) {
    const rows = leadIds.map((leadId) => ({
      timesheet_entry_id: entry.id,
      lead_id: leadId,
    }));

    const { error: leadError } = await supabase
      .from("monthly_timesheet_leads")
      .insert(rows);

    if (leadError) {
      throw leadError;
    }
  }

  return getMonthlyTimesheetDay(
    employeeId,
    workDate
  );
}


/* =========================================================
   ADMIN - GET ALL MONTHLY TIMESHEETS
========================================================= */

export async function getAllMonthlyTimesheets(month) {
  const startDate = `${month}-01`;

  const [year, monthNumber] = month.split("-").map(Number);

  const lastDay = new Date(
    year,
    monthNumber,
    0
  ).getDate();

  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  console.log("Loading monthly timesheets:", {
    month,
    startDate,
    endDate,
  });

  const { data, error } = await supabase
    .from("monthly_timesheet_entries")
    .select(`
      id,
      employee_id,
      work_date,
      working_minutes,
      status,
      submitted_at,
      created_at,
      updated_at,

      team_members (
        id,
        name,
        email,
        phone
      ),

      monthly_timesheet_leads (
        id,
        lead_id,

        leads (
          id,
          name,
          phone,
          status,
          business_category,
          address,
          website
        )
      )
    `)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", {
      ascending: true,
    });

  if (error) {
    console.error(
      "getAllMonthlyTimesheets error:",
      error
    );

    throw error;
  }

  console.log(
    "Monthly timesheet records fetched:",
    data
  );

  return data || [];
}