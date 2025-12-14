import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/contexts/AuthContext";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const signInAPI = async (email: string, password: string): Promise<User> => {
  try {
    // Try Supabase auth first
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Fetch user profile/role from backend
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        });
        return {
          id: data.user.id,
          email: data.user.email || email,
          name: response.data.name || data.user.user_metadata?.name || email.split("@")[0],
          role: response.data.role || "viewer",
          avatar_url: response.data.avatar_url || data.user.user_metadata?.avatar_url,
        };
      } catch (backendError) {
        // Fallback to Supabase user metadata
        return {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split("@")[0],
          role: data.user.user_metadata?.role || "viewer",
          avatar_url: data.user.user_metadata?.avatar_url,
        };
      }
    }

    throw new Error("Login failed");
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw new Error(error.message || "Failed to sign in");
  }
};

export const signOutAPI = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error: any) {
    console.error("Sign out error:", error);
    throw new Error(error.message || "Failed to sign out");
  }
};

export const getSessionAPI = async (): Promise<{ user: User } | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      return null;
    }

    // Fetch user profile from backend
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      return {
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: response.data.name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
          role: response.data.role || session.user.user_metadata?.role || "viewer",
          avatar_url: response.data.avatar_url || session.user.user_metadata?.avatar_url,
        },
      };
    } catch (backendError) {
      // Fallback to Supabase user metadata
      return {
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
          role: session.user.user_metadata?.role || "viewer",
          avatar_url: session.user.user_metadata?.avatar_url,
        },
      };
    }
  } catch (error) {
    console.error("Get session error:", error);
    return null;
  }
};
