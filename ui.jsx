import React from "react";

export const C = {
  bg: "#FAFAF8",
  panel: "#FFFFFF",
  ink: "#1C2321",
  inkSoft: "#5B645F",
  inkFaint: "#8A9289",
  primary: "#1D4E45",
  primaryDeep: "#123832",
  primarySoft: "#E4ECE9",
  accent: "#E8A33D",
  accentDeep: "#C77F1F",
  accentSoft: "#FBEBD3",
  border: "#DCE1DA",
  borderSoft: "#EAEDE7",
  danger: "#B5533C",
  dangerSoft: "#F5E4DE",
};

export const STATUS_COLOR = {
  New: { fg: C.inkSoft, bg: C.borderSoft },
  Called: { fg: "#3E6E93", bg: "#E1EBF2" },
  Interested: { fg: C.accentDeep, bg: C.accentSoft },
  "Follow-up": { fg: "#8A6D3B", bg: "#F3EAD4" },
  "Not Interested": { fg: C.danger, bg: C.dangerSoft },
  Converted: { fg: C.primaryDeep, bg: C.primarySoft },
  Lost: { fg: C.danger, bg: C.dangerSoft },
};

export const inputStyle = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "'IBM Plex Sans', sans-serif",
  color: C.ink,
  background: C.panel,
  outline: "none",
};

export function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, style }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18, ...style }}>
      {title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );
}

export function EmptyNote({ text }) {
  return <div style={{ color: C.inkFaint, fontSize: 13, padding: "8px 0" }}>{text}</div>;
}

export function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 500, color: accent || C.ink }}>{value}</div>
    </div>
  );
}

export function Button({ children, onClick, icon: Icon, variant = "primary", disabled, type = "button" }) {
  const styles = {
    primary: { background: C.primary, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.inkSoft, border: `1px solid ${C.border}` },
    danger: { background: C.danger, color: "#fff", border: "none" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/** Loads the two Google Fonts used across the app. Call once from App.jsx. */
export function useAppFonts() {
  React.useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}
