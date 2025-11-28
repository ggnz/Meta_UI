// src/api/connections.ts
import apiClient from "@/api/client";

export type Page = { id: string; name: string };
export type PlatformInfo = {
  status: "connected" | "needs_reauth" | "disabled" | "account_only";
  account_connected: boolean;
  handle: string | null;
  pages: Page[];
  configure_url: string | null;
};
export type ConnectionsResponse = {
  facebook: PlatformInfo;
  instagram: PlatformInfo;
  whatsapp: PlatformInfo;
};

// ------------------- GENERIC -------------------

// Get all platform connections summary
export const getConnectionsSummary = async (userId: string) => {
  const res = await apiClient.get(`/connections/summary?user_id=${userId}`);
  console.log(res);
  
  return res.data as ConnectionsResponse;
};

// Disconnect a whole platform
export const deleteConnectionsPlatform = async (platformId: string, userId: string) => {
  await apiClient.delete(`/connections/${platformId}?user_id=${userId}`);
};

// ------------------- FACEBOOK -------------------
export const getFacebookPages = async (userId: string) => {
  const res = await apiClient.get(`/access/facebook/pages?user_id=${userId}`);
  return res.data as Page[];
};

export const postFacebookPage = async (userId: string, pageId: string) => {
  await apiClient.post(`/access/facebook/select-page`, { user_id: userId, page_id: pageId });
};

export const disconnectFacebookPage = async (userId: string, pageId: string) => {
  await apiClient.delete(`/connections/facebook/pages/${pageId}?user_id=${userId}`);
};

// ------------------- INSTAGRAM -------------------
export const instagramConnection = async (userId: string, accountId: string) => {
  await apiClient.post(`/auth_instagram/connect`, { user_id: userId, account_id: accountId });
};

export const getInstagramAccounts = async (userId: string) => {
  const res = await apiClient.get(`/access/instagram/accounts?user_id=${userId}`);
  return res.data as Page[];
};

export const postInstagramAccount = async (userId: string, accountId: string) => {
  await apiClient.post(`/access/instagram/select-account`, { user_id: userId, account_id: accountId });
};

export const disconnectInstagramAccount = async (userId: string, accountId: string) => {
  await apiClient.delete(`/connections/instagram/accounts/${accountId}?user_id=${userId}`);
};

// ------------------- WHATSAPP -------------------
export const getWhatsappNumbers = async (userId: string) => {
  const res = await apiClient.get(`/access/whatsapp/numbers?user_id=${userId}`);
  return res.data as Page[];
};

export const postWhatsappNumber = async (userId: string, numberId: string) => {
  await apiClient.post(`/access/whatsapp/select-number`, { user_id: userId, number_id: numberId });
};

export const disconnectWhatsappNumber = async (userId: string, numberId: string) => {
  await apiClient.delete(`/connections/whatsapp/numbers/${numberId}?user_id=${userId}`);
};
