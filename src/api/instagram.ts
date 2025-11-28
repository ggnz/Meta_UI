// src/api/instagram.ts
import apiClient from "@/api/client";

// Get all Instagram conversations
export const getInstagramConversations = async (userId: string) => {
  const res = await apiClient.get(
    `/instagram/threads?user_id=${userId}&status=open&page=1&page_size=20`
  );
  return res.data;
};

// Get messages for one conversation
export const getInstagramMessages = async (conversationId: string) => {
  const res = await apiClient.get(
    `/instagram/threads/${conversationId}/messages?limit=30`
  );
  return res.data;
};

// Send a message
export const sendInstagramMessage = async (
  conversationId: string,
  content: string
) => {
  const res = await apiClient.post(
    `/instagram/threads/${conversationId}/send`,
    {
      text: content,
    }
  );
  return res.data;
};
