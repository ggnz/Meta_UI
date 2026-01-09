import apiClient from "./client";
import axios from "axios";

// Login - store the access token
export const login = async (email: string, password: string) => {
  const res = await apiClient.post("/auth/login", { email, password });
  
  if (res.data.accessToken) {
    localStorage.setItem('accessToken', res.data.accessToken);
  }
  
  return res.data;
};

// Register - store the access token
export const register = async (userData: {
  name: string;
  email: string;
  password: string;
  organizationId: string;
}) => {
  const res = await apiClient.post("/auth/register", userData);
  
  if (res.data.accessToken) {
    localStorage.setItem('accessToken', res.data.accessToken);
  }
  
  return res.data;
};

// Forgot password
export const forgotPassword = async (email: string) => {
  const res = await apiClient.post("/auth/forgot-password", { email });
  return res.data;
};

// Reset password
export const resetPassword = async (token: string, nuevaContrasena: string) => {
  const res = await apiClient.post("/auth/reset-password", {
    token,
    nuevaContrasena, 
  });
  return res.data;
};

// Change password
export const changePassword = async (currentPassword: string, newPassword: string) => {
  const res = await apiClient.post("/auth/change-password", {    
    currentPassword,
    newPassword,
  });  
  return res.data;
};

// Logout - clear tokens
export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");

    // Clear refresh token cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'rt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'rt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
    }

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

// Refresh token - utility function (refresh is handled automatically in client interceptor)
export const refreshToken = async () => {
  const refreshTokenValue = localStorage.getItem("refreshToken");
  if (!refreshTokenValue) {
    throw new Error("No refresh token available");
  }
  
  // Set refresh token as cookie before making the request
  // Backend expects the refresh token in a cookie named 'rt'
  const backEndUrl = (import.meta as any).env?.BACK_END_URL || 'http://localhost:3000';
  const isSecure = backEndUrl.startsWith('https');
  const cookieOptions = `path=/; SameSite=${isSecure ? 'None' : 'Lax'}${isSecure ? '; Secure' : ''}`;
  document.cookie = `rt=${refreshTokenValue}; ${cookieOptions}`;
  
  // Use a separate axios instance to avoid interceptor loops
  const refreshClient = axios.create({
    baseURL: backEndUrl,
    timeout: 10000,
    withCredentials: true, // Enable cookies
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  // Backend expects refresh token in cookie, not in body
  const res = await refreshClient.post("/auth/refresh");
  
  if (res.data.accessToken) {
    localStorage.setItem("accessToken", res.data.accessToken);
    if (res.data.refreshToken) {
      localStorage.setItem("refreshToken", res.data.refreshToken);
      // Also update the cookie
      document.cookie = `rt=${res.data.refreshToken}; ${cookieOptions}`;
    }
  }
  
  return res.data;
};

// Get current user
export const getCurrentUser = async () => {
  const res = await apiClient.get('/auth/me');
  return res.data;
};