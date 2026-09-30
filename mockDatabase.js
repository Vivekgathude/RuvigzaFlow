/**
 * ============================================================================
 *  MOCK DATABASE LAYER
 * ============================================================================
 *  This file is the ONLY place that "knows" data is hardcoded in memory.
 *  Every function here returns a Promise, on purpose — so that when you
 *  replace the body of each function with a real `fetch()` call to your
 *  backend API, NOTHING else in the app has to change. The rest of the app
 *  only ever calls these functions (loginUser, getAllLeads, etc.) and awaits
 *  them — it never touches the arrays below directly.
 *
 *  WHEN YOU CONNECT A REAL DATABASE:
 *  - Replace the in-memory arrays with real API calls (e.g. fetch('/api/leads')).
 *  - Move `users` to a real backend table with HASHED passwords (bcrypt/argon2)
 *    — never store or compare plaintext passwords like this in production.
 *  - Do the permission check (admin vs employee, "can this user see this
 *    lead") on the SERVER, not just in the React code. Client-side role
 *    checks can be bypassed by anyone with browser dev tools.
 *  - Replace loginUser with a real auth call that returns a session token
 *    (e.g. JWT), and have the browser attach that token to every request
 *    instead of trusting a role string sent from the client.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// HARDCODED DATA — replace with real DB tables
// ---------------------------------------------------------------------------

let users = [
  {
    id: "u-admin-1",
    name: "Agency Owner",
    username: "admin",
    password: "admin123", // ⚠️ PLAINTEXT — for demo only. Hash this in a real DB.
    role: "admin",
    phone: "",
  },
  {
    id: "u-emp-1",
    name: "Rahul Sharma",
    username: "rahul",
    password: "rahul123",
    role: "employee",
    phone: "9876543210",
  },
  {
    id: "u-emp-2",
    name: "Priya Patil",
    username: "priya",
    password: "priya123",
    role: "employee",
    phone: "9876500000",
  },
];

let leads = [
  {
    id: "lead-1",
    name: "Suresh Traders",
    phone: "9822011111",
    email: "",
    source: "Google Ads",
    status: "New",
    packageTier: "Growth",
    assignedEmployeeId: "u-emp-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead-2",
    name: "Shree Coaching Classes",
    phone: "9822022222",
    email: "shree.classes@example.com",
    source: "Meta Ads",
    status: "Interested",
    packageTier: "Advance",
    assignedEmployeeId: "u-emp-2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let uploadHistory = [];

const genId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const clone = (x) => JSON.parse(JSON.stringify(x));
const withoutPassword = (u) => {
  const { password, ...rest } = u;
  return rest;
};
// simulate network latency so the rest of your app already handles loading
// states correctly once a real API is behind these calls
const delay = (ms = 150) => new Promise((res) => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export async function loginUser(username, password) {
  await delay();
  const user = users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase() && u.password === password
  );
  if (!user) {
    throw new Error("Incorrect username or password.");
  }
  return withoutPassword(user);
  // REAL DB VERSION: POST /api/login { username, password }
  // → server checks hashed password, returns { user, token }
  // → store token in memory (or an httpOnly cookie set by the server), NOT localStorage
}

// ---------------------------------------------------------------------------
// USERS / TEAM MANAGEMENT  (admin only — enforce this server-side too)
// ---------------------------------------------------------------------------

export async function getAllUsers() {
  await delay();
  return clone(users.map(withoutPassword));
}

export async function createUser({ name, username, password, role, phone }) {
  await delay();
  if (!name || !username || !password) {
    throw new Error("Name, username, and password are required.");
  }
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("That username is already taken.");
  }
  const newUser = {
    id: genId("u"),
    name: name.trim(),
    username: username.trim(),
    password, // ⚠️ hash before saving in a real DB
    role: role === "admin" ? "admin" : "employee",
    phone: phone || "",
  };
  users.push(newUser);
  return withoutPassword(newUser);
}

export async function deleteUser(userId) {
  await delay();
  users = users.filter((u) => u.id !== userId);
  // unassign any leads that belonged to this employee
  leads = leads.map((l) => (l.assignedEmployeeId === userId ? { ...l, assignedEmployeeId: "" } : l));
  return true;
}

// ---------------------------------------------------------------------------
// LEADS
// ---------------------------------------------------------------------------

export async function getAllLeads() {
  await delay();
  return clone(leads);
  // REAL DB VERSION (admin): GET /api/leads
}

export async function getLeadsForEmployee(employeeId) {
  await delay();
  return clone(leads.filter((l) => l.assignedEmployeeId === employeeId));
  // REAL DB VERSION (employee): GET /api/leads?assignedTo=me
  // IMPORTANT: the server must derive "me" from the authenticated session/token,
  // never from a value the client sends — otherwise an employee could just
  // request someone else's employeeId and see their leads.
}

export async function createLead(lead) {
  await delay();
  const newLead = {
    id: genId("lead"),
    name: lead.name,
    phone: lead.phone || "",
    email: lead.email || "",
    source: lead.source || "Other",
    status: lead.status || "New",
    packageTier: lead.packageTier || "",
    assignedEmployeeId: lead.assignedEmployeeId || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leads.push(newLead);
  return clone(newLead);
}

export async function updateLead(leadId, updates) {
  await delay();
  let updated = null;
  leads = leads.map((l) => {
    if (l.id !== leadId) return l;
    updated = { ...l, ...updates, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("Lead not found.");
  return clone(updated);
  // REAL DB VERSION: server must verify the requesting employee is either
  // admin OR the lead's assignedEmployeeId before allowing the update.
}

export async function deleteLead(leadId) {
  await delay();
  leads = leads.filter((l) => l.id !== leadId);
  return true;
}

export async function assignLead(leadId, employeeId) {
  return updateLead(leadId, { assignedEmployeeId: employeeId });
}

// ---------------------------------------------------------------------------
// EXCEL IMPORT / MERGE  (admin only)
// ---------------------------------------------------------------------------

function normalizePhone(raw) {
  return String(raw || "").replace(/\D/g, "").slice(-10);
}
function getKey(rec) {
  const p = normalizePhone(rec.phone);
  if (p.length >= 7) return "p:" + p;
  const e = String(rec.email || "").trim().toLowerCase();
  if (e) return "e:" + e;
  return null;
}

/**
 * Takes already-mapped rows (see lib/excelUtils.js for turning raw Excel rows
 * into this shape) and merges them into the leads table: new phone/email →
 * insert, matching phone/email → update, missing name/contact → skip.
 */
export async function mergeLeadsFromImport(mappedRows) {
  await delay(300);
  const keyIndex = {};
  leads.forEach((l, i) => {
    const k = getKey(l);
    if (k) keyIndex[k] = i;
  });

  let added = 0,
    updated = 0,
    skipped = 0,
    unchanged = 0;
  const resultsPreview = [];

  mappedRows.forEach((rec) => {
    if (!rec.name || !rec.name.trim()) {
      skipped++;
      if (resultsPreview.length < 25) resultsPreview.push({ ...rec, action: "skipped", reason: "No name" });
      return;
    }
    const key = getKey(rec);
    if (!key) {
      skipped++;
      if (resultsPreview.length < 25) resultsPreview.push({ ...rec, action: "skipped", reason: "No phone/email" });
      return;
    }
    const idx = keyIndex[key];
    if (idx === undefined) {
      const newLead = {
        id: genId("lead"),
        name: rec.name.trim(),
        phone: rec.phone || "",
        email: rec.email || "",
        source: rec.source || "Other",
        status: rec.status || "New",
        packageTier: rec.packageTier || "",
        assignedEmployeeId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      leads.push(newLead);
      keyIndex[key] = leads.length - 1;
      added++;
      if (resultsPreview.length < 25) resultsPreview.push({ ...rec, action: "added" });
    } else {
      const existing = leads[idx];
      const changed =
        (rec.phone && rec.phone !== existing.phone) ||
        (rec.email && rec.email.toLowerCase() !== (existing.email || "").toLowerCase()) ||
        (rec.source && rec.source !== existing.source) ||
        (rec.status && rec.status !== existing.status) ||
        (rec.packageTier && rec.packageTier !== existing.packageTier);
      if (changed) {
        leads[idx] = {
          ...existing,
          phone: rec.phone || existing.phone,
          email: rec.email || existing.email,
          source: rec.source || existing.source,
          status: rec.status || existing.status,
          packageTier: rec.packageTier || existing.packageTier,
          updatedAt: new Date().toISOString(),
        };
        updated++;
        if (resultsPreview.length < 25) resultsPreview.push({ ...rec, action: "updated" });
      } else {
        unchanged++;
      }
    }
  });

  return { added, updated, skipped, unchanged, total: mappedRows.length, resultsPreview };
}

// ---------------------------------------------------------------------------
// UPLOAD HISTORY
// ---------------------------------------------------------------------------

export async function getUploadHistory() {
  await delay();
  return clone(uploadHistory);
}

export async function addUploadHistoryRecord(entry) {
  await delay();
  const record = { id: genId("upload"), uploadedAt: new Date().toISOString(), ...entry };
  uploadHistory = [record, ...uploadHistory];
  return clone(record);
}
