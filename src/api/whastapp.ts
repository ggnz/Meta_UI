import apiClient from "@/api/client";

// Get all WhatsApp conversations
export const getWhatsAppConversations = async (userId: string) => {
  const res = await apiClient.get(
    `/whatsapp/threads?user_id=${userId}&status=open&page=1&page_size=20`
  );
  return res.data;
};

// Get messages for one conversation
export const getWhatsAppMessages = async (conversationId: string) => {
  const res = await apiClient.get(
    `/whatsapp/threads/${conversationId}/messages?limit=30`
  );
  return res.data;
};

// Send a message
export const sendWhatsAppMessage = async (
  conversationId: string,
  content: string
) => {
  const res = await apiClient.post(
    `/whatsapp/threads/${conversationId}/send`,
    {
      text: content,
    }
  );
  return res.data;
};
