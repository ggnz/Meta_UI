import { useState, useEffect, useCallback, useRef } from "react";
import { ChatSidebar } from "@/components/messages/ChatSidebar";
import { ChatMain } from "@/components/messages/ChatMain";
import { UserInfoPanel } from "@/components/messages/UserInfoPanel";
import { ConnectionsView } from "@/components/views/ConnectionsView";
import { LoginView } from "../auth/LoginView";
import { RegisterView } from "../auth/RegisterView";
import { ForgotPasswordView } from "../auth/ForgotPassword";
import { ResetPasswordView } from "../auth/ResetPassword";
import { ContactsView } from "../views/ContactsView";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, MessageSquare } from "lucide-react";
import type { Conversation, Message } from "@/components/messages/ChatMain";
import {
  getMessengerConversations,
  getMessengerMessages,
  sendMessengerMessage,
  markConversationRead,
} from "@/api/messenger";
import { getContact } from "@/api/contacts";
import { useRealtime } from "@/api/realtime/RealtimeProvider";
import logo from "@/assets/vayneBWLogo.png";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  joinDate?: string;
  platform: "facebook" | "instagram" | "whatsapp";
  tags: string[];
  totalMessages?: number;
  lastActivity?: string;
  customerScore?: number;
}

function formatLastActivity(lastMessageAt: string): string {
  const date = new Date(lastMessageAt);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "ahora mismo";
  if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
  if (diffInMinutes < 1440) return `hace ${Math.floor(diffInMinutes / 60)} horas`;
  return `hace ${Math.floor(diffInMinutes / 1440)} días`;
}

function mapDbMessage(messageData: any): Message {
  return {
    id: String(
      messageData.id ?? messageData.external_id ?? crypto.randomUUID()
    ),
    content: messageData.text ?? messageData.content ?? "",
    conversation_id: String(messageData.conversation_id),
    timestamp: (
      messageData.sent_at ??
      messageData.created_at ??
      new Date()
    ).toString(),
    sender: messageData.direction === "out" ? "user" : "customer",
    senderName: messageData.direction === "out" ? "Tú" : "Cliente",
    status: (messageData.delivery_status as Message["status"]) ?? "sent",
    content_type: messageData.content_type,
    attachments: messageData.attachments || [],
  };
}  

const userId = "1"; //Esto debe tener el id del user relacionado a la cuenta de meta 

export function MessagesView() {
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [activeView, setActiveView] = useState<string>("messages");
  const { toast } = useToast();
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isMobileUserInfoOpen, setIsMobileUserInfoOpen] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // WebSocket integration
  const { joinThread, leaveThread, setHandlers } = useRealtime();
  const prevConvIdRef = useRef<string | null>(null);

  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)
    : undefined;

  const activeConversationMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  // --- Empty State Component ---
  const EmptyState = () => (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background text-center p-8">
      <div className="relative mb-6">
          <img
            src={logo}
            alt="Vayne Logo"
            className="h-32 w-32 object-contain"
          />
      </div>
      
      <p className="text-muted max-w-sm text-xl leading-relaxed mb-2">
        Selecciona una conversación para empezar
      </p>
      
      <p className="text-md text-muted/60">
        Gestiona todas tus comunicaciones en un solo lugar
      </p>
    </div>
  );

  // --- Fetch user info when conversation changes ---
  const fetchUserInfo = async (conversationId: string) => {
    setIsLoadingUserInfo(true);
    try {
      // Convert conversation ID to contact ID (you might need to adjust this logic)
      const contactId = parseInt(conversationId);
      if (isNaN(contactId)) {
        console.error("Invalid contact ID:", conversationId);
        return;
      }

      const contactData = await getContact(contactId);

      console.log("Contact data:", contactData);
      
      // Map API response to UserInfo interface
      const mappedUserInfo: UserInfo = {
        id: String(contactData.id),
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        company: contactData.company,
        location: contactData.location,
        platform: contactData.platform === "facebook" 
          ? "facebook" 
          : contactData.platform === "instagram" 
          ? "instagram" 
          : "whatsapp",
        tags: contactData.tags?.map((tag: any) => tag.name) || [],
        lastActivity: contactData.lastMessageAt 
          ? formatLastActivity(contactData.lastMessageAt)
          : "N/A",
      };

      setUserInfo(mappedUserInfo);
    } catch (err) {
      console.error("Error fetching user info:", err);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del contacto",
        variant: "destructive",
      });
      setUserInfo(null);
    } finally {
      setIsLoadingUserInfo(false);
    }
  };

  useEffect(() => {
    if (!activeConversationId) {
      setUserInfo(null);
      return;
    }
    fetchUserInfo(activeConversationId);
  }, [activeConversationId, toast]);

  // --- Handle contact update from UserInfoPanel ---
  const handleContactUpdated = async () => {
    if (activeConversationId) {
      // Refresh the user info
      await fetchUserInfo(activeConversationId);
      
      // Refresh conversations to update the contact name and info
      await fetchConversations();
      
      toast({
        title: "Contacto actualizado",
        description: "La información del contacto se actualizó correctamente",
      });
    }
  };

  // --- Fetch conversations ---
  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);

      const data = await getMessengerConversations(userId);
      console.log(data);

      const mapped: Conversation[] = data.items.map((item: any) => ({
        id: item.id,
        name: item.customer.name,
        avatar: item.customer.avatar || "",
        lastMessage: item.preview.text,
        lastMessageSender:
          item.preview.direction === "in" ? "customer" : "user",
        lastMessageStatus:
          item.preview.direction === "out" ? "sent" : undefined,
        timestamp: new Date(item.last_message_at).toISOString(),
        unreadCount: item.unread_count || 0,
        platform:
          item.customer.platform === "messenger"
            ? "facebook"
            : item.customer.platform === "instagram"
            ? "instagram"
            : "whatsapp",
        messages: [],
      }));
      setConversations(mapped);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones",
        variant: "destructive",
      });      
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [userId, toast]);

  // --- Fetch messages for active conversation ---
  useEffect(() => {
    if (!activeConversationId) return;

    const fetchMessages = async () => {
      setIsLoading(true);

      try {
        const data = await getMessengerMessages(activeConversationId);

        const mappedMessages: Message[] = data.items.map((m: any) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          content:
            m.content_type === "text"
              ? m.text
              : m.attachments?.[0]?.storage_key || "Adjunto",
          content_type: m.content_type,
          timestamp: m.sent_at,
          sender: m.direction === "in" ? "customer" : "user",
          senderName: m.direction === "in" ? "customer" : "user",
          status: m.delivery_status,
          attachments: m.attachments || [],
        }));

        setMessages((prev) => ({
          ...prev,
          [activeConversationId]: mappedMessages,
        }));

        await markConversationRead(activeConversationId);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (err) {
        console.error(err);
        toast({
          title: "Error al cargar mensajes",
          description: "No se pudieron obtener los mensajes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [activeConversationId, toast]);

  // --- Send message ---
  const handleSendMessage = async (content: string, conversationId: string) => {
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      content,
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
      sender: "user",
      senderName: "user",
      status: "queued",
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage],
    }));

    try {
      const data = await sendMessengerMessage(conversationId, content);

      setMessages((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId].map((m) =>
          m.id === tempId ? { ...m, id: data.id, status: "sent" } : m
        ),
      }));
    } catch (err) {
      toast({
        title: "Error al enviar mensaje",
        description: "No se pudo enviar el mensaje.",
        variant: "destructive",
      });
      setMessages((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId].map((m) =>
          m.id === tempId ? { ...m, status: "failed" } : m
        ),
      }));
    }
  };

  // --- Retry message ---
  const handleRetryMessage = async (messageId: string) => {
    if (!activeConversationId) return;
    const failedMessage = messages[activeConversationId].find(
      (m) => m.id === messageId
    );
    if (!failedMessage) return;

    setMessages((prev) => ({
      ...prev,
      [activeConversationId]: prev[activeConversationId].map((m) =>
        m.id === messageId ? { ...m, status: "queued" } : m
      ),
    }));

    try {
      const data = await sendMessengerMessage(
        activeConversationId,
        failedMessage.content
      );

      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: prev[activeConversationId].map((m) =>
          m.id === messageId
            ? {
                ...m,
                id: data.id || messageId,
                status: "sent",
                timestamp: data.sent_at || m.timestamp,
              }
            : m
        ),
      }));

      toast({
        title: "Mensaje reenviado",
        description: "Tu mensaje se envió correctamente.",
      });
    } catch {
      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: prev[activeConversationId].map((m) =>
          m.id === messageId ? { ...m, status: "failed" } : m
        ),
      }));
      toast({
        title: "Error al reenviar",
        description: "No se pudo reenviar el mensaje.",
        variant: "destructive",
      });
    }
  };

  // --- Handle new message from WS ---
  const handleNewMessage = useCallback((newMessage: Message) => {
    setMessages((prev) => {
      const convMessages = prev[newMessage.conversation_id] || [];
      const isDuplicate = convMessages.some((msg) => msg.id === newMessage.id);

      if (!isDuplicate) {
        return {
          ...prev,
          [newMessage.conversation_id]: [...convMessages, newMessage],
        };
      }
      return prev;
    });

    // Update conversation last message and unread count if needed
    if (newMessage.sender === "customer") {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === newMessage.conversation_id
            ? {
                ...conv,
                lastMessage: newMessage.content,
                lastMessageSender: "customer",
                unreadCount: conv.unreadCount + 1,
              }
            : conv
        )
      );
    }
  }, []);

  // --- Handle older messages from ChatMain ---
  const handleLoadOlderMessages = (
    olderMessages: any[],
    nextBeforeId: string | null
  ) => {
    if (!activeConversationId) return;

    // Mapear los mensajes usando mapDbMessage
    const mappedOlder = olderMessages
      .map(mapDbMessage)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    setMessages((prev) => {
      const currentMessages = prev[activeConversationId] || [];

      // Prevenir duplicados
      const filteredOlder = mappedOlder.filter(
        (m) => !currentMessages.some((msg) => msg.id === m.id)
      );

      return {
        ...prev,
        [activeConversationId]: [...filteredOlder, ...currentMessages],
      };
    });
  };

  // --- WebSocket Management ---
  useEffect(() => {
    if (!activeConversationId) return;

    // Clean up previous conversation WebSocket connection
    if (
      prevConvIdRef.current &&
      prevConvIdRef.current !== activeConversationId
    ) {
      leaveThread(prevConvIdRef.current);
    }
    prevConvIdRef.current = activeConversationId;

    // Join new conversation thread
    joinThread(activeConversationId);

    // Set WebSocket message handlers - ONLY FOR INCOMING MESSAGES
    setHandlers({
      onThreadNew: (messageData: any) => {
        // Only handle incoming messages from customers, not our own messages
        if (messageData.direction === "in") {
          const mappedMessage = mapDbMessage(messageData);
          handleNewMessage(mappedMessage);
        }
      },
      onThreadRead: () => {
        // Handle read receipts if needed
      },
    });

    // Cleanup on unmount or conversation change
    return () => {
      setHandlers({ onThreadNew: undefined, onThreadRead: undefined });
      leaveThread(activeConversationId);
    };
  }, [activeConversationId, joinThread, leaveThread, setHandlers]);

  const renderMainContent = () => {
    switch (activeView) {
      case "messages":
        return (
          <div className="flex h-full overflow-hidden">
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onConversationSelect={(id) => {
                setActiveConversationId(id);
                if (window.innerWidth < 768) {
                  setIsMobileChatOpen(true);
                } else {
                  setIsMobileChatOpen(false);
                }
              }}
              isLoading={isLoadingConversations}
            />

            {isMobileChatOpen && activeConversation && (
              <div className="absolute top-0 left-0 right-0 bottom-12 bg-background-dark z-50 flex flex-col">
                <button
                  title="Volver"
                  onClick={() => {
                    setIsMobileChatOpen(false);
                    setActiveConversationId(null);
                  }}
                  className="absolute top-6 left-2 z-50 p-2 rounded-full bg-background text-sidebar-foreground hover:text-primary shadow-md"
                >
                  <ChevronLeft />
                </button>

                <ChatMain
                  conversation={{
                    ...activeConversation,
                    messages: activeConversationMessages,
                  }}
                  onRetryMessage={handleRetryMessage}
                  onNewMessage={handleNewMessage}
                  onSendMessage={handleSendMessage}
                  onLoadOlderMessages={handleLoadOlderMessages}
                  onToggleUserInfo={() => {
                    if (window.innerWidth < 768) {
                      setIsMobileUserInfoOpen(true);
                    } else {
                      setShowUserInfo((prev) => !prev);
                    }
                  }}
                />
              </div>
            )}

            {isMobileUserInfoOpen && activeConversation && (
              <div className="absolute inset-0 z-50 bg-background">
                <UserInfoPanel
                  userInfo={userInfo}
                  onClose={() => setIsMobileUserInfoOpen(false)}
                  isLoading={isLoadingUserInfo}
                  onContactUpdated={handleContactUpdated}
                />
              </div>
            )}

            {/* Desktop: side by side */}
            <div className="hidden md:flex flex-1">
              {activeConversation ? (
                <>
                  <ChatMain
                    key={activeConversation?.id}
                    conversation={{
                      ...activeConversation,
                      messages: activeConversationMessages,
                    }}
                    onRetryMessage={handleRetryMessage}
                    onNewMessage={handleNewMessage}
                    onSendMessage={handleSendMessage}
                    onLoadOlderMessages={handleLoadOlderMessages}
                    onToggleUserInfo={() => {
                      if (window.innerWidth < 768) {
                        setIsMobileUserInfoOpen(true);
                      } else {
                        setShowUserInfo((prev) => !prev);
                      }
                    }}
                  />
                  {showUserInfo && (
                    <UserInfoPanel
                      userInfo={userInfo}
                      onClose={() => setShowUserInfo(false)}
                      isLoading={isLoadingUserInfo}
                      onContactUpdated={handleContactUpdated}
                    />
                  )}
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        );
      case "contacts":
        return <ContactsView />;
      case "connections":
        return <ConnectionsView />;
      case "login":
        return <LoginView onViewChange={setActiveView} />;
      case "register":
        return <RegisterView onViewChange={setActiveView} />;
      case "forgot-password":
        return <ForgotPasswordView onViewChange={setActiveView} />;
      case "reset-password":
        return <ResetPasswordView onViewChange={setActiveView} />;
      default:
        {/* Mobile: fullscreen ChatMain */}
        return (
          <div className="flex-1 flex overflow-hidden relative">
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onConversationSelect={(id) => {
                setActiveConversationId(id);
                if (window.innerWidth < 768) {
                  setIsMobileChatOpen(true);
                } else {
                  setIsMobileChatOpen(false);
                }
              }}
            />

            {isMobileChatOpen && activeConversation && (
              <div className="absolute top-0 left-0 right-0 bottom-16 bg-background-dark z-40 flex flex-col">
                <button
                  title="Volver"
                  onClick={() => {
                    setIsMobileChatOpen(false);
                    setActiveConversationId(null);
                  }}
                  className="absolute top-5 left-4 z-50 p-2 rounded-full bg-background text-sidebar-foreground hover:text-primary shadow-md"
                >
                  <ChevronLeft />
                </button>

                <ChatMain
                  conversation={{
                    ...activeConversation,
                    messages: activeConversationMessages,
                  }}
                  onRetryMessage={handleRetryMessage}
                  onNewMessage={handleNewMessage}
                  onSendMessage={handleSendMessage}
                  onLoadOlderMessages={handleLoadOlderMessages}
                  onToggleUserInfo={() => {
                    if (window.innerWidth < 768) {
                      setIsMobileUserInfoOpen(true);
                    } else {
                      setShowUserInfo((prev) => !prev);
                    }
                  }}
                />
              </div>
            )}

            {isMobileUserInfoOpen && activeConversation && (
              <div className="absolute inset-0 z-50 bg-background">
                <UserInfoPanel
                  userInfo={userInfo}
                  onClose={() => setIsMobileUserInfoOpen(false)}
                  isLoading={isLoadingUserInfo}
                  onContactUpdated={handleContactUpdated}
                />
              </div>
            )}

            {/* Desktop: side by side */}
            <div className="hidden md:flex flex-1">
              {activeConversation ? (
                <>
                  <ChatMain
                    conversation={{
                      ...activeConversation,
                      messages: activeConversationMessages,
                    }}
                    onRetryMessage={handleRetryMessage}
                    onNewMessage={handleNewMessage}
                    onSendMessage={handleSendMessage}
                    onLoadOlderMessages={handleLoadOlderMessages}
                    onToggleUserInfo={() => {
                      if (window.innerWidth < 768) {
                        setIsMobileUserInfoOpen(true);
                      } else {
                        setShowUserInfo((prev) => !prev);
                      }
                    }}
                  />
                  {showUserInfo && (
                    <UserInfoPanel
                      userInfo={userInfo}
                      onClose={() => setShowUserInfo(false)}
                      isLoading={isLoadingUserInfo}
                      onContactUpdated={handleContactUpdated}
                    />
                  )}
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">{renderMainContent()}</div>
      </div>
    </div>
  );
}