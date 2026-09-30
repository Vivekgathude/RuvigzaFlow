import React from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { useAppFonts } from "./ui";
import Login from "./Login";
import AdminView from "./AdminView";
import EmployeeView from "./EmployeeView";
import MetaAdsDashboard from "./MetaAdsDashboard";
import GoogleAdsDashboard from "./GoogleAdsDashboard";

function Root() {
  useAppFonts();

  const { currentUser } = useAuth();

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!currentUser) {
    return <Login />;
  }

  // =====================================================
  // ADMIN
  // =====================================================

  if (currentUser.role === "admin") {
    return <AdminView />;
  }

  // =====================================================
  // GOOGLE ADS MANAGER
  // Google Ads Manager role ID = 5
  // =====================================================

  if (
    currentUser.employmentRoleId &&
    Number(currentUser.employmentRoleId) === 5
  ) {
    return <GoogleAdsDashboard />;
  }

  // =====================================================
  // META ADS MANAGER
  // Meta Ads Manager role ID = 6
  // =====================================================

  if (
    currentUser.employmentRoleId &&
    Number(currentUser.employmentRoleId) === 6
  ) {
    return <MetaAdsDashboard />;
  }

  // =====================================================
  // OTHER EMPLOYEES
  // =====================================================

  return <EmployeeView />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}