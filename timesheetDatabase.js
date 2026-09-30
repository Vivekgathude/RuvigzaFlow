import { supabase } from "./supabase";

// Get today's timesheet for an employee
export async function getTodayTimesheet(employeeId) {
  const today = new Date().toLocaleDateString("en-CA");

  const { data, error } = await supabase
    .from("employee_timesheets")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", today)
    .maybeSingle();

  if (error) {
    console.error("Get today's timesheet error:", error);
    throw error;
  }

  return data;
}


// Get all timesheets for an employee
export async function getEmployeeTimesheets(employeeId) {
  const { data, error } = await supabase
    .from("employee_timesheets")
    .select("*")
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false });

  if (error) {
    console.error("Get employee timesheets error:", error);
    throw error;
  }

  return data || [];
}


// Get all timesheets for Admin
export async function getAllTimesheets() {
  const { data, error } = await supabase
    .from("employee_timesheets")
    .select("*")
    .order("work_date", { ascending: false })
    .order("check_in", { ascending: false });

  if (error) {
    console.error("Get all timesheets error:", error);
    throw error;
  }

  return data || [];
}


// Employee Check In
export async function checkIn(employeeId) {
  const today = new Date().toLocaleDateString("en-CA");

  const { data: existing, error: existingError } = await supabase
    .from("employee_timesheets")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", today)
    .maybeSingle();

  if (existingError) {
    console.error("Check existing timesheet error:", existingError);
    throw existingError;
  }

  // Already checked in
  if (existing?.check_in) {
    return existing;
  }

  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await supabase
      .from("employee_timesheets")
      .update({
        check_in: now,
        status: "In Progress",
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Check in update error:", error);
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("employee_timesheets")
    .insert({
      employee_id: employeeId,
      work_date: today,
      check_in: now,
      status: "In Progress",
      working_minutes: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Check in insert error:", error);
    throw error;
  }

  return data;
}


// Employee Check Out
export async function checkOut(employeeId) {
  const today = new Date().toLocaleDateString("en-CA");

  const { data: existing, error: existingError } = await supabase
    .from("employee_timesheets")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", today)
    .maybeSingle();

  if (existingError) {
    console.error("Check existing timesheet error:", existingError);
    throw existingError;
  }

  if (!existing) {
    throw new Error("Please check in before checking out.");
  }

  if (!existing.check_in) {
    throw new Error("Please check in before checking out.");
  }

  if (existing.check_out) {
    return existing;
  }

  const checkInTime = new Date(existing.check_in);
  const checkOutTime = new Date();

  const workingMinutes = Math.max(
    0,
    Math.round(
      (checkOutTime.getTime() - checkInTime.getTime()) / 60000
    )
  );

  const { data, error } = await supabase
    .from("employee_timesheets")
    .update({
      check_out: checkOutTime.toISOString(),
      working_minutes: workingMinutes,
      status: "Completed",
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    console.error("Check out error:", error);
    throw error;
  }

  return data;
}