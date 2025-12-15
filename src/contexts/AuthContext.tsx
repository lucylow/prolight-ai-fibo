import React, { createContext, useState, useEffect, useContext } from "react";
import { AxiosInstance } from "axios";
import { signInAPI, signOutAPI, getSessionAPI } from "../services/auth";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  avatar_url?: string;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithOAuth: (provider: "google" | "github") => Promise<void>;
  loginAsDemo: () => Promise<void>;
  refreshSession: () => Promise<void>;
  api: AxiosInstance;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();
    
    // Listen for auth changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Fetch user profile when auth state changes
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      // Check for demo session first
      const demoSession = localStorage.getItem("demo_session");
      if (demoSession) {
        try {
          const parsed = JSON.parse(demoSession);
          // Demo sessions expire after 24 hours
          const DEMO_SESSION_DURATION = 24 * 60 * 60 * 1000;
          if (Date.now() - parsed.timestamp < DEMO_SESSION_DURATION) {
            setUser(parsed.user);
            setLoading(false);
            return;
          } else {
            // Demo session expired, remove it
            localStorage.removeItem("demo_session");
          }
        } catch (e) {
          // Invalid demo session, remove it
          localStorage.removeItem("demo_session");
        }
      }

      const session = await getSessionAPI();
      if (session?.user) {
        setUser(session.user);
      } else {
        // Dev fallback: return admin user if no auth configured
        const isDev = import.meta.env.DEV || !import.meta.env.VITE_SUPABASE_URL;
        if (isDev) {
          console.warn("No auth configured, using dev admin fallback");
          setUser({
            id: "dev-admin",
            email: "admin@dev.local",
            name: "Dev Admin",
            role: "admin",
          });
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
      // Dev fallback on error
      const isDev = import.meta.env.DEV || !import.meta.env.VITE_SUPABASE_URL;
      if (isDev) {
        console.warn("Auth check failed, using dev admin fallback");
        setUser({
          id: "dev-admin",
          email: "admin@dev.local",
          name: "Dev Admin",
          role: "admin",
        });
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch user profile from your backend or Supabase
      // For now, we'll use a mock user based on Supabase user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser) {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
          role: supabaseUser.user_metadata?.role || "viewer",
          avatar_url: supabaseUser.user_metadata?.avatar_url,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userData = await signInAPI(email, password);
      setUser(userData);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOutAPI();
      setUser(null);
      // Clear demo session on logout
      localStorage.removeItem("demo_session");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear user state even if API call fails
      setUser(null);
      // Clear demo session on logout
      localStorage.removeItem("demo_session");
    }
  };

  const loginWithOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      // OAuth redirects, so we don't reset loading here
      // The auth state change listener will handle the rest
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : `Failed to sign in with ${provider}. Please try again.`;
      throw new Error(errorMessage);
    }
  };

  const loginAsDemo = async () => {
    setLoading(true);
    try {
      // Create a demo user without requiring authentication
      const demoUser: User = {
        id: `demo-${Date.now()}`,
        email: "demo@prolight.ai",
        name: "Demo User",
        role: "editor", // Give demo users editor role for full experience
        avatar_url: undefined,
      };
      setUser(demoUser);
      // Store demo session in localStorage so it persists
      localStorage.setItem("demo_session", JSON.stringify({
        user: demoUser,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error("Demo login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    await checkSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loginWithOAuth, loginAsDemo, refreshSession, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


