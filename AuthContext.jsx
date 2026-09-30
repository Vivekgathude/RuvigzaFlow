import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);

  // Get logged-in user's team member information
  const loadCurrentUser = useCallback(async (authUser) => {
    if (!authUser) {
      setCurrentUser(null);
      return;
    }

    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Team member fetch error:", error);
      setCurrentUser(null);
      setAuthError("User profile not found.");
      return;
    }

   setCurrentUser({
  id: data.id,
  authUserId: data.auth_user_id,
  name: data.name,
  email: data.email,
  phone: data.phone,

  // Existing backend role
  role: data.role,

  // Employment details
  employmentType: data.employment_type,
  employmentRoleId: data.employment_role_id,

  isActive: data.is_active,
});
  }, []);

  // Check existing Supabase session when app starts
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        await loadCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }

      setLoading(false);
    };

    initializeAuth();

    // Listen for login/logout/session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        await loadCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadCurrentUser]);

  // Login with Supabase Auth
  const login = useCallback(
    async (username, password) => {
      setLoading(true);
      setAuthError("");

      try {
        const email = username.trim();

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.user) {
          throw new Error("Login failed.");
        }

        await loadCurrentUser(data.user);

        return true;
      } catch (err) {
        console.error("Login error:", err);
        setAuthError(err.message || "Login failed.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadCurrentUser]
  );

  // Logout from Supabase
  const logout = useCallback(async () => {
    setAuthError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setAuthError(error.message || "Logout failed.");
      return;
    }

    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        authError,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return ctx;
}