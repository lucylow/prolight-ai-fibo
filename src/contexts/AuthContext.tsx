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
      const session = await getSessionAPI();
      if (session?.user) {
        setUser(session.user);
      }
    } catch (error) {
      console.error("Session check failed:", error);
      setUser(null);
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
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear user state even if API call fails
      setUser(null);
    }
  };

  const loginWithOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : "OAuth login failed";
      throw new Error(errorMessage);
    }
  };

  const refreshSession = async () => {
    await checkSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loginWithOAuth, refreshSession, api }}>
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
