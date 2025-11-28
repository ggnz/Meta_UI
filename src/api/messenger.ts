import apiClient from "@/api/client";

// Get all messenger conversations
export const getMessengerConversations = async (userId: string) => {
  const res = await apiClient.get(
    `/messenger/threads?user_id=${userId}&status=open&page=1&page_size=20`
  );
  return res.data;
};

// Get messages for one conversation
export const getMessengerMessages = async (conversationId: string) => {
  const res = await apiClient.get(
    `/messenger/threads/${conversationId}/messages?limit=30`
  );
  console.log(res.data);
  

  return res.data;
};

export const sendMessengerMessage = async (conversationId: string, content: string) => {
  const res = await apiClient.post(
    `/messenger/threads/${conversationId}/send`, {
    text: content,
  });
  return res.data;
};

// Mark a conversation as read
export const markConversationRead = async (conversationId: string) => {
  const res = await apiClient.post(
    `/messenger/conversations/${conversationId}/mark-read`,
    { send_mark_seen: true }
  );
  return res.data;
};

// Get older messages before a specific message ID (for infinite scroll)
export const getOlderMessengerMessages = async (
  conversationId: string,
  beforeId: string,
  limit = 30
) => {
  const res = await apiClient.get(
    `/messenger/threads/${conversationId}/messages?limit=${limit}&before_id=${beforeId}`
  );
  console.log("Older messages:", res.data);
  return res.data;
};

