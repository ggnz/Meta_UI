import axios from "axios";

const backEndUrl = (import.meta as any).env?.BACK_END_URL || 'http://localhost:3000';

const apiClient = axios.create({

  baseURL: backEndUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error);
    return Promise.reject(error);
  }
);

export default apiClient;
