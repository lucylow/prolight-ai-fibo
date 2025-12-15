import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: string | null) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

// Request interceptor: attach auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && config.headers) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error("Failed to get session for request:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request to retry after refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((e) => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use Supabase to refresh the session
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (error || !session?.access_token) {
          throw new Error("Failed to refresh session");
        }

        const newToken = session.access_token;
        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        }
        
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // If refresh fails, sign out the user
        await supabase.auth.signOut();
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;


