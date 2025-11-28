import apiClient from "@/api/client";

export const getTemplates = async () => {
  const res = await apiClient.get(`/templates`);
  return res.data;
};

export const getTemplatesByPlatform = async (platform: string) => {
  const res = await apiClient.get(`/templates/${platform}`);
  return res.data;
};

export const createTemplate = async (templateData: {
  name: string;
  platform: "facebook" | "instagram" | "whatsapp";
  command: string;
  content: string;
  status: "aprobada" | "pendiente" | "rechazada";
  variables?: string[];
}) => {
  try {
    const res = await apiClient.post("/templates/create", templateData);
    return res.data;
  } catch (error: any) {
    const backendMessage = error.response?.data?.message;
    
    if (backendMessage) {
      const customError = new Error(backendMessage);
      customError.name = "TemplateCreationError";
      throw customError;
    }
    
    throw error;
  }
};

export const deleteTemplate = async (templateId: string) => {
  try {
    const res = await apiClient.delete(`/templates/delete/${templateId}`);
    return res.data;
  } catch (error: any) {
    const backendMessage = error.response?.data?.message;
    
    if (backendMessage) {
      const customError = new Error(backendMessage);
      customError.name = "TemplateDeletionError";
      throw customError;
    }
    
    throw error;
  }
};