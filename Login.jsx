import React, { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "./AuthContext";
import { C, inputStyle } from "./ui";
import logo from "./assets/ruvigza-logo.png";

export default function Login() {
  const { login, authError, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      return;
    }

    await login(username, password);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #F4F7F6 0%, #E9F0EE 50%, #F8FAF9 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'IBM Plex Sans', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(21, 91, 78, 0.06)",
          top: -180,
          right: -120,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(33, 150, 120, 0.05)",
          bottom: -150,
          left: -120,
        }}
      />

      {/* Main card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#FFFFFF",
          border: "1px solid rgba(20, 70, 60, 0.10)",
          borderRadius: 18,
          padding: "38px 36px",
          boxShadow: "0 20px 60px rgba(20, 50, 45, 0.10)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 22,
          }}
        >
          <img
            src={logo}
            alt="RUVIGZA Digital Technologies"
            style={{
              width: 190,
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 24,
              color: C.primaryDeep,
              letterSpacing: "-0.5px",
            }}
          >
            Welcome back
          </div>

          <div
            style={{
              fontSize: 13,
              color: C.inkSoft,
              marginTop: 7,
            }}
          >
            Sign in to your RuvigzaFlow account
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 17 }}>
            <label
              style={{
                fontSize: 12,
                color: C.inkSoft,
                display: "block",
                marginBottom: 7,
                fontWeight: 500,
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              autoFocus
              style={{
                ...inputStyle,
                width: "100%",
                height: 44,
                boxSizing: "border-box",
                borderRadius: 8,
                padding: "0 13px",
                fontSize: 13,
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                fontSize: 12,
                color: C.inkSoft,
                display: "block",
                marginBottom: 7,
                fontWeight: 500,
              }}
            >
              Password
            </label>

            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  ...inputStyle,
                  width: "100%",
                  height: 44,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  padding: "0 42px 0 13px",
                  fontSize: 13,
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: C.inkFaint,
                  display: "flex",
                  alignItems: "center",
                  padding: 4,
                }}
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {authError && (
            <div
              style={{
                color: C.danger,
                background: "rgba(190, 60, 60, 0.06)",
                border: "1px solid rgba(190, 60, 60, 0.12)",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 12,
                marginBottom: 15,
              }}
            >
              {authError}
            </div>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 46,
              border: "none",
              borderRadius: 8,
              background: loading
                ? "#8FA9A2"
                : C.primaryDeep,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}

            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid #E8ECEA",
            fontSize: 11,
            color: C.inkFaint,
          }}
        >
          RUVIGZA Digital Technologies
          <div style={{ marginTop: 3 }}>
            Performance Marketing • Maharashtra
          </div>
        </div>
      </div>
    </div>
  );
}