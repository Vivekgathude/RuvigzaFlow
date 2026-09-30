# Agency CRM — with roles (Admin / Employee)

A working prototype with two logins:

- **Admin** — uploads Excel files, sees all leads, assigns leads to employees, adds/removes team members.
- **Employee** — sees only their own assigned leads, can update status (Called, Interested, Follow-up, Not Interested, Converted, Lost).

## Demo logins

| Role     | Username | Password  |
|----------|----------|-----------|
| Admin    | admin    | admin123  |
| Employee | rahul    | rahul123  |
| Employee | priya    | priya123  |

Remove the "Demo logins" box in `src/components/Login.jsx` before real use.

## Running it

This is written as standard React (JSX) using `xlsx` and `lucide-react`. Drop it into a Vite or Create React App project:

```
npm create vite@latest my-crm -- --template react
cd my-crm
npm install xlsx lucide-react
# copy the contents of src/ from this project into your new project's src/
npm run dev
```

## ⚠️ The ONE file you need to replace to connect a real database

**`src/data/mockDatabase.js`** is the entire fake backend. Every other file in
the app calls functions from this file (`loginUser`, `getAllLeads`,
`createUser`, `mergeLeadsFromImport`, etc.) and `await`s them — none of them
touch the hardcoded arrays directly. That means:

1. Stand up a real backend (Node/Express, or a backend-as-a-service like
   **Supabase** or **Firebase** — both are a much faster path than a custom
   server for a small team).
2. Create real database tables for `users` and `leads` matching the shapes
   already used in this file.
3. Rewrite each function in `mockDatabase.js` to call your API instead of
   reading/writing the in-memory arrays — for example:

```js
// BEFORE (mock)
export async function getAllLeads() {
  await delay();
  return clone(leads);
}

// AFTER (real API)
export async function getAllLeads() {
  const res = await fetch("/api/leads", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load leads.");
  return res.json();
}
```

Because every function signature stays the same, **no other file changes.**

## Security — must fix before this touches real data

This prototype hardcodes plaintext passwords and does all "permission
checks" in the browser. Both are fine for a demo, **not fine for production**:

- **Hash passwords** (bcrypt or argon2) in your real `users` table — never
  store or compare plaintext passwords like `mockDatabase.js` does now.
- **Do permission checks on the server.** `getLeadsForEmployee(employeeId)`
  currently trusts whatever `employeeId` the app passes in. In a real
  backend, the server must determine "who is asking" from their
  authenticated session/token — never from a value the client sends —
  otherwise an employee could edit the request and see someone else's leads.
- **Use a real session mechanism** — a JWT or session cookie issued by your
  backend on login, not anything stored in `localStorage` (readable by any
  script on the page, which is a risk for auth tokens specifically).
- **Restrict admin-only actions** (Excel upload, add/remove team members,
  reassigning leads) on the server too — the "Admin" UI hiding these buttons
  from employees is a convenience, not a security boundary.

## File map

```
src/
├── App.jsx                    — auth gate, routes to Login / AdminView / EmployeeView
├── context/AuthContext.jsx    — login/logout/session state (in-memory)
├── data/mockDatabase.js       — ⚠️ replace this file's internals with real API calls
├── lib/excelUtils.js          — Excel parsing, column-mapping, merge helpers
└── components/
    ├── ui.jsx                 — design tokens + shared Button/Panel/etc.
    ├── Login.jsx
    ├── LeadsTable.jsx         — shared table (admin: full control, employee: status-only)
    ├── UploadExcel.jsx        — admin-only Excel import flow
    ├── TeamManagement.jsx     — admin-only add/remove team members
    ├── Dashboard.jsx          — stats (admin view)
    ├── AdminView.jsx          — admin's sidebar + all four screens
    └── EmployeeView.jsx       — employee's simplified single screen
```
