import { supabase } from "./supabase";

// =====================================================
// Supabase row -> CRM lead format
// =====================================================
function mapLead(row) {
  return {
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    city: row.city || "",
    businessName: row.business_name || "",
    businessCategory: row.business_category || "",
    website: row.website || "",
    source: row.source || "Excel",
    status: row.status || "New",
    assignedEmployeeId: row.assigned_to || "",
    notes: row.notes || "",
    alternatePhone: row.alternate_phone || "",
    state: row.state || "",
    pincode: row.pincode || "",

    // Package
    packageTier: row.package_tier || "",

    packageAmount: row.package_amount ?? null,

    // Dates
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedAt: row.assigned_at,
    closedAt: row.closed_at,

    // Closed by employee
    closedBy: row.closed_by || "",

    // =================================================
    // Close Note
    // =================================================
    closeRequirement: row.close_requirement || "",
    closeService: row.close_service || "",
    closeBudget: row.close_budget ?? "",
    closeBudgetType: row.close_budget_type || "daily",
    closeFromDate: row.close_from_date || "",
    closeToDate: row.close_to_date || "",
    closeRemark: row.close_remark || "",
  };
}


// =====================================================
// CRM lead -> Supabase columns
// =====================================================
function mapLeadToDatabase(lead) {
  return {
    name: lead.name,
    phone: lead.phone || null,
    email: lead.email || null,
    address: lead.address || null,
    city: lead.city || null,
    business_name: lead.businessName || null,
    business_category: lead.businessCategory || null,
    website: lead.website || null,
    source: lead.source || "Excel",
    status: lead.status || "New",
    assigned_to: lead.assignedEmployeeId || null,
    package_tier: lead.packageTier || null,
    package_amount:
    lead.packageAmount === "" ||
    lead.packageAmount === undefined ||
    lead.packageAmount === null
    ? null
    : Number(lead.packageAmount),
    notes: lead.notes || null,
    alternate_phone: lead.alternatePhone || null,
    state: lead.state || null,
    pincode: lead.pincode || null,

    // Closed information
    closed_by: lead.closedBy || null,

    // =================================================
    // Close Note
    // =================================================
    close_requirement: lead.closeRequirement || null,
    close_service: lead.closeService || null,
    close_budget: lead.closeBudget ?? null,
    close_budget_type: lead.closeBudgetType || "daily",
    close_from_date: lead.closeFromDate || null,
    close_to_date: lead.closeToDate || null,
    close_remark: lead.closeRemark || null,
  };
}


// =====================================================
// Get all leads
// =====================================================
export async function getAllLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Get all leads error:", error);
    throw error;
  }

  return (data || []).map(mapLead);
}


// =====================================================
// Get leads assigned to employee
// =====================================================
export async function getLeadsForEmployee(employeeId) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", employeeId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Get employee leads error:",
      error
    );

    throw error;
  }

  return (data || []).map(mapLead);
}


// =====================================================
// Create lead
// =====================================================
export async function createLead(lead) {
  const payload = mapLeadToDatabase(lead);

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(
      "Create lead error:",
      error
    );

    throw error;
  }

  return mapLead(data);
}


// =====================================================
// Update lead
// =====================================================
export async function updateLead(id, updates) {
  const payload = {};

  // ===================================================
  // Basic fields
  // ===================================================

  if (updates.name !== undefined) {
    payload.name = updates.name;
  }

  if (updates.phone !== undefined) {
    payload.phone = updates.phone || null;
  }

  if (updates.email !== undefined) {
    payload.email = updates.email || null;
  }

  if (updates.address !== undefined) {
    payload.address =
      updates.address || null;
  }

  if (updates.city !== undefined) {
    payload.city =
      updates.city || null;
  }

  if (updates.businessName !== undefined) {
    payload.business_name =
      updates.businessName || null;
  }

  if (updates.businessCategory !== undefined) {
    payload.business_category =
      updates.businessCategory || null;
  }

  if (updates.website !== undefined) {
    payload.website =
      updates.website || null;
  }

  if (updates.source !== undefined) {
    payload.source =
      updates.source || "Excel";
  }

  if (updates.notes !== undefined) {
    payload.notes =
      updates.notes || null;
  }

  if (updates.alternatePhone !== undefined) {
    payload.alternate_phone =
      updates.alternatePhone || null;
  }

  if (updates.state !== undefined) {
    payload.state =
      updates.state || null;
  }

  if (updates.pincode !== undefined) {
    payload.pincode =
      updates.pincode || null;
  }


  // ===================================================
  // Package
  // ===================================================

  if (updates.packageTier !== undefined) {
  payload.package_tier =
    updates.packageTier || null;
}

if (updates.packageAmount !== undefined) {
  payload.package_amount =
    updates.packageAmount === "" ||
    updates.packageAmount === null ||
    updates.packageAmount === undefined
      ? null
      : Number(updates.packageAmount);
}


  // ===================================================
  // Assigned employee
  // ===================================================

  if (
    updates.assignedEmployeeId !== undefined
  ) {
    payload.assigned_to =
      updates.assignedEmployeeId || null;
  }


  // ===================================================
  // Close Note
  // ===================================================

  if (updates.closeRequirement !== undefined) {
    payload.close_requirement =
      updates.closeRequirement || null;
  }

  if (updates.closeService !== undefined) {
    payload.close_service =
      updates.closeService || null;
  }

  if (updates.closeBudget !== undefined) {
    payload.close_budget =
      updates.closeBudget === ""
        ? null
        : Number(updates.closeBudget);
  }

  if (updates.closeBudgetType !== undefined) {
    payload.close_budget_type =
      updates.closeBudgetType || "daily";
  }

  if (updates.closeFromDate !== undefined) {
    payload.close_from_date =
      updates.closeFromDate || null;
  }

  if (updates.closeToDate !== undefined) {
    payload.close_to_date =
      updates.closeToDate || null;
  }

  if (updates.closeRemark !== undefined) {
    payload.close_remark =
      updates.closeRemark || null;
  }


  // ===================================================
  // Status + Closed By
  // ===================================================

  if (updates.status !== undefined) {
    payload.status = updates.status;

    // -----------------------------------------------
    // Lead Closed
    // -----------------------------------------------
    if (updates.status === "Closed") {
      payload.closed_at =
        new Date().toISOString();

      if (updates.closedBy !== undefined) {
        payload.closed_by =
          updates.closedBy || null;
      }
    }

    // -----------------------------------------------
    // Lead reopened / status changed
    // -----------------------------------------------
    else {
      payload.closed_at = null;
      payload.closed_by = null;
    }
  }


  // ===================================================
  // Database update
  // ===================================================

  const { data, error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      "Update lead error:",
      error
    );

    throw error;
  }

  return mapLead(data);
}


// =====================================================
// Delete lead
// =====================================================
export async function deleteLead(id) {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Delete lead error:",
      error
    );

    throw error;
  }

  return true;
}


// =====================================================
// Assign lead to employee
// =====================================================
export async function assignLead(
  leadId,
  employeeId
) {
  const { data, error } =
    await supabase.rpc(
      "assign_lead_with_history",
      {
        p_lead_id: leadId,
        p_employee_id:
          employeeId || null,
      }
    );

  if (error) {
    console.error(
      "Assign lead with history error:",
      error
    );

    throw error;
  }

  if (!data) {
    throw new Error(
      "Lead assignment failed."
    );
  }

  return mapLead(data);
}


// =====================================================
// Helpers
// =====================================================
function normalizePhone(phone) {
  return String(phone || "").replace(
    /\D/g,
    ""
  );
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}


// =====================================================
// Import / Merge Leads
// =====================================================
export async function mergeLeadsFromImport(
  mappedRows
) {
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of mappedRows) {
    const name = String(
      row.name || ""
    ).trim();

    const phone = String(
      row.phone || ""
    ).trim();

    const email = String(
      row.email || ""
    ).trim();

    if (!name) {
      skipped++;
      continue;
    }

    const normalizedPhone =
      normalizePhone(phone);

    const normalizedEmail =
      normalizeEmail(email);

    let existingLead = null;


    // =================================================
    // Phone duplicate check
    // =================================================

    if (normalizedPhone) {
      const { data, error } =
        await supabase
          .from("leads")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();

      if (error) {
        console.error(
          "Phone duplicate check error:",
          error
        );

        throw error;
      }

      existingLead = data;
    }


    // =================================================
    // Email duplicate check
    // =================================================

    if (
      !existingLead &&
      normalizedEmail
    ) {
      const { data, error } =
        await supabase
          .from("leads")
          .select("*")
          .ilike(
            "email",
            normalizedEmail
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Email duplicate check error:",
          error
        );

        throw error;
      }

      existingLead = data;
    }


    // =================================================
    // Import payload
    // =================================================

    const payload = {
      name,
      phone: phone || null,
      email: email || null,
      address: row.address || null,
      business_category:
        row.category || null,
      website: row.website || null,
      source:
        row.source || "Excel",
      status: normalizeStatus(
        row.status
      ),
    };


    // =================================================
    // Update existing lead
    // =================================================

    if (existingLead) {
      const { error } =
        await supabase
          .from("leads")
          .update(payload)
          .eq(
            "id",
            existingLead.id
          );

      if (error) {
        console.error(
          "Lead update during import error:",
          error
        );

        throw error;
      }

      updated++;
    }

    // =================================================
    // Insert new lead
    // =================================================

    else {
      const { error } =
        await supabase
          .from("leads")
          .insert(payload);

      if (error) {
        console.error(
          "Lead insert during import error:",
          error
        );

        throw error;
      }

      added++;
    }
  }

  return {
    added,
    updated,
    skipped,
    total: mappedRows.length,
  };
}