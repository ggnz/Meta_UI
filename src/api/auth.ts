import apiClient from "./client";

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

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

// Get current user
export const getCurrentUser = async () => {
  const res = await apiClient.get('/auth/me');
  return res.data;
};