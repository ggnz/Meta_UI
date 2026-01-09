import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "@/hooks/use-toast";

const backEndUrl = (import.meta as any).env?.BACK_END_URL || 'http://localhost:3000';

// Custom error class for session expiration
export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

const apiClient = axios.create({
  baseURL: backEndUrl,
  timeout: 10000,
  withCredentials: true, // Enable cookies for CORS requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add auth token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle errors globally and refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried this request yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshTokenValue = localStorage.getItem("refreshToken");

      if (!refreshTokenValue) {
        // No refresh token, logout user
        const sessionError = new SessionExpiredError("No refresh token");
        processQueue(sessionError, null);
        isRefreshing = false;
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        if (typeof window !== 'undefined') {
          toast({
            title: "Sesión terminada",
            description: "Cerrando sesión...",
            variant: "destructive",
          });
          
          // Small delay to show the toast before redirecting
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
        return Promise.reject(sessionError);
      }

      try {
        // Set refresh token as cookie before making the request
        // Backend expects the refresh token in a cookie named 'rt'
        const isSecure = backEndUrl.startsWith('https');
        const cookieOptions = `path=/; SameSite=${isSecure ? 'None' : 'Lax'}${isSecure ? '; Secure' : ''}`;
        document.cookie = `rt=${refreshTokenValue}; ${cookieOptions}`;

        // Create a separate axios instance to avoid interceptor loops
        const refreshAxios = axios.create({
          baseURL: backEndUrl,
          timeout: 10000,
          withCredentials: true, // Enable cookies
          headers: {
            "Content-Type": "application/json",
          },
        });

        // Backend expects refresh token in cookie, not in body
        const response = await refreshAxios.post("/auth/refresh");

        // Backend returns { ok: false } if no refresh token cookie is found
        if (response.data.ok === false) {
          throw new Error("Refresh token not found or invalid");
        }

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        if (accessToken) {
          localStorage.setItem("accessToken", accessToken);
          // Update refresh token in localStorage if backend returns a new one
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
            // Also update the cookie
            document.cookie = `rt=${newRefreshToken}; ${cookieOptions}`;
          }

          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          // Process queued requests
          processQueue(null, accessToken);
          isRefreshing = false;

          // Retry the original request
          return apiClient(originalRequest);
        } else {
          throw new Error("No access token in refresh response");
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        const sessionError = new SessionExpiredError("Refresh token failed");
        processQueue(sessionError, null);
        isRefreshing = false;
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        
        if (typeof window !== 'undefined') {
          toast({
            title: "Sesión terminada",
            description: "Cerrando sesión...",
            variant: "destructive",
          });
          
          // Small delay to show the toast before redirecting
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
        return Promise.reject(sessionError);
      }
    }

    console.error("API error:", error);
    return Promise.reject(error);
  }
);

export default apiClient;
