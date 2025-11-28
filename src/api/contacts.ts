import apiClient from "@/api/client";

// Get all contacts
export const getContacts = async () => {
  const res = await apiClient.get("/contacts");
  return res.data;
};

// Get single contact
export const getContact = async (contactId: number) => {
  const res = await apiClient.get(`/contacts/${contactId}`);
  return res.data;
};

// Create contact
export const createContact = async (contactData: {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  platform?: string;
  lastMessageAt?: string; // ISO string
  tags?: number[]; // tag IDs
  organizationId?: number; 

}) => {
  const res = await apiClient.post("/contacts/create", contactData);
  return res.data;
};

// Update contact
export const updateContact = async (contactId: number, contactData: {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  platform?: string;
  lastMessageAt?: string; // ISO string
  tags?: number[]; // tag IDs
  organizationId?: number;

}) => {
  const res = await apiClient.put(`/contacts/update/${contactId}`, contactData);
  return res.data;
};

// Delete contact
export const deleteContact = async (contactId: number) => {
  const res = await apiClient.delete(`/contacts/delete/${contactId}`);
  return res.data;
};
