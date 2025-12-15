// src/api/axios.ts
import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Attach access token from multiple sources (Supabase session or localStorage)
api.interceptors.request.use(async (config) => {
  // Try to get token from Supabase session first (if available)
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && config.headers) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
      return config;
    }
  } catch {
    // Supabase not available, fall through to localStorage
  }

  // Fallback to localStorage token (for non-Supabase auth flows)
  const token = localStorage.getItem("token") || 
                localStorage.getItem("access_token") ||
                localStorage.getItem("sb-access-token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh-on-401 interceptor
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (!original || original._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      original._retry = true;
      try {
        // Try Supabase session refresh first
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && session?.access_token) {
            original.headers["Authorization"] = `Bearer ${session.access_token}`;
            return api(original);
          }
        } catch {
          // Supabase refresh failed, try backend refresh endpoint
        }

        // Fallback: Try backend refresh token endpoint
        const refresh = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        if (refresh.data.access_token) {
          localStorage.setItem("token", refresh.data.access_token);
          original.headers["Authorization"] = `Bearer ${refresh.data.access_token}`;
          return api(original);
        }
      } catch (e) {
        // All refresh attempts failed - redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
        if (window.location.pathname !== "/sign-in" && window.location.pathname !== "/login") {
          window.location.href = "/sign-in";
        }
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;


