import apiClient from "@/api/client";

// Get all tags for the authenticated organization
export const getTags = async () => {
  const res = await apiClient.get("/tags");
  return res.data;
};

// Create tag (organization_id will come from token)
export const createTag = async (tagData: {
  name: string;
}) => {
  const res = await apiClient.post("/tags/create", tagData);
  return res.data;
};

// Update tag
export const updateTag = async (tagId: number, tagData: { name: string }) => {
  const res = await apiClient.put(`/tags/update/${tagId}`, tagData);
  return res.data;
};

// Delete tag
export const deleteTag = async (tagId: number) => {
  const res = await apiClient.delete(`/tags/delete/${tagId}`);
  return res.data;
};