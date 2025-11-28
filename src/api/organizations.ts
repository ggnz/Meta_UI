// src/api/organizations.ts
import apiClient from "@/api/client";

// Get all organizations
export const getOrganizations = async () => {
  const res = await apiClient.get("/organizations");
  return res.data;
};

// Get single organization
export const getOrganization = async (organizationId: number) => {
  const res = await apiClient.get(`/organizations/${organizationId}`);
  return res.data;
};

// Create organization
export const createOrganization = async (organizationData: {
  name: string;
}) => {
  const res = await apiClient.post("organizations/create", organizationData);
  return res.data;
};

// Update organization
export const updateOrganization = async (
  organizationId: number, 
  organizationData: { name?: string }
) => {
  const res = await apiClient.put(`/organizations/update/${organizationId}`, organizationData);
  return res.data;
};

// Delete organization
export const deleteOrganization = async (organizationId: number) => {
  const res = await apiClient.delete(`/organizations/delete/${organizationId}`);
  return res.data;
};

// Get organization users
export const getOrganizationUsers = async (organizationId: number) => {
  const res = await apiClient.get(`/organizations/${organizationId}/users`);
  return res.data;
};