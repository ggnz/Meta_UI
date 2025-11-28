import apiClient from "@/api/client";

export const getUsers = async (page = 1, pageSize = 20) => {
  const res = await apiClient.get(`/users?page=${page}&page_size=${pageSize}`);
  return res.data;
};

// Get single user
export const getUser = async (userId: string) => {
  const res = await apiClient.get(`/users/${userId}`);
  return res.data;
};

// Create user (organization comes from token)
export const createUser = async (userData: {
  name: string;
  email: string;
  role?: string;
}) => {
  const res = await apiClient.post("/users/create", userData);
  return res.data;
};

// Update user
export const updateUser = async (userId: string, userData: object) => {
  const res = await apiClient.put(`/users/update/${userId}`, userData);
  return res.data;
};

// Delete user
export const deleteUser = async (userId: string) => {
  const res = await apiClient.delete(`/users/delete/${userId}`);
  return res.data;
};