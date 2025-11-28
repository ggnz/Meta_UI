// src/api/realtime/RealtimeProvider.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Socket } from "socket.io-client";
import { createMessengerSocket } from "@/api/realtime/webSocket";

// ---------------------- Types ----------------------

export type Conversation = {
  id: string;
  platform?: string;
  lastMessage?: string;
  lastMessageSender?: "user" | "customer";
  lastMessageStatus?: string;
  timestamp?: string;
  unreadCount?: number;
};

type ThreadPatch = {
  id: string;
  last_message_at?: string;
  last_customer_message_at?: string;
  unread?: number;
  status?: "open" | "closed";
  preview?: {
    text?: string | null;
    content_type?: string;
    direction?: "in" | "out";
  };
  typing?: "agent_on" | "agent_off";
};

type RTContext = {
  socket: Socket | null;
  ready: boolean;
  joinThread: (conversationId: string) => void;
  leaveThread: (conversationId: string) => void;
  setHandlers: (
    h: Partial<
      Omit<
        RTContext,
        | "socket"
        | "ready"
        | "joinThread"
        | "leaveThread"
        | "setHandlers"
        | "conversations"
        | "updateConversation"
        | "setConversations"
        | "activeConversationId"
        | "setActiveConversation"
      >
    >
  ) => void;

  // ---- New global state ----
  conversations: Conversation[];
  updateConversation: (conv: Partial<Conversation> & { id: string }) => void;
  setConversations: (convs: Conversation[]) => void;
  activeConversationId?: string;
  setActiveConversation: (id: string) => void;

  // Optional handlers from outside
  onThreadNew?: (message: any) => void;
  onMessageNew?: (conversationId: string, message: any) => void;
  onThreadUpdate?: (patch: ThreadPatch) => void;
  onThreadRead?: (payload: {
    conversation_id: string;
    up_to?: string | null;
  }) => void;
};

// ---------------------- Context ----------------------

const Ctx = createContext<RTContext>({
  socket: null,
  ready: false,
  joinThread: () => {},
  leaveThread: () => {},
  setHandlers: () => {},

  conversations: [],
  updateConversation: () => {},
  setConversations: () => {},
  activeConversationId: undefined,
  setActiveConversation: () => {},
});

export function useRealtime() {
  return useContext(Ctx);
}

// ---------------------- Provider ----------------------

export function RealtimeProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Partial<RTContext>>({});
  const [ready, setReady] = useState(false);

  // Global conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);

  // --- Conversation updater ---
  const updateConversation = (conv: Partial<Conversation> & { id: string }) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conv.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...conv };
        return updated;
      }
      return [...prev, conv as Conversation];
    });
  };

  // ---------------------- Socket setup ----------------------

  useEffect(() => {
    const s = createMessengerSocket(userId);

    socketRef.current = s;

    const onConnect = () => {
      setReady(true);
      console.log("[ws] connected", s.id);
    };

    const onDisconnect = (reason: any) => {
      setReady(false);
      console.warn("[ws] disconnected:", reason);
    };

    s.on("connect", onConnect);
    s.on("connect_error", (err: any) =>
      console.error("[ws] connect_error:", err?.message, err)
    );
    s.on("disconnect", onDisconnect);

    // ---- Listeners push desde el backend ----

    s.on(
      "messenger:message:new",
      (p: { conversation_id: string; message: any }) => {
        handlersRef.current.onMessageNew = (conversationId, message) => {
          updateConversation({
            id: conversationId,
            lastMessage: message.text,
            lastMessageSender:
              message.direction === "out" ? "user" : "customer",
            lastMessageStatus: message.delivery_status,
            timestamp: message.sent_at ?? message.created_at,
            unreadCount:
              message.direction === "in"
                ? (conversations.find((c) => c.id === conversationId)
                    ?.unreadCount ?? 0) + 1
                : conversations.find((c) => c.id === conversationId)
                    ?.unreadCount ?? 0,
          });
        };
      }
    );

    s.on("messenger:thread:new", (p: { message: any }) => {
      handlersRef.current.onThreadNew?.(p.message);
    });

    s.on("messenger:thread:update", (patch: ThreadPatch) => {
      handlersRef.current.onThreadUpdate?.(patch);
    });

    s.on(
      "messenger:thread:read",
      (payload: { conversation_id: string; up_to?: string | null }) => {
        handlersRef.current.onThreadRead?.(payload);
      }
    );

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error");
      s.off("messenger:message:new");
      s.off("messenger:thread:new");
      s.off("messenger:thread:update");
      s.off("messenger:thread:read");

      s.disconnect();
      socketRef.current = null;
      setReady(false);
    };
  }, [userId]);

  // ---------------------- API sencilla para unirse/dejar hilos ----------------------

  const joinThread = (conversationId: string) =>
    socketRef.current?.emit("thread:join", { conversation_id: conversationId });

  const leaveThread = (conversationId: string) =>
    socketRef.current?.emit("thread:leave", {
      conversation_id: conversationId,
    });

  const setHandlers = (h: Partial<RTContext>) => {
    handlersRef.current = { ...handlersRef.current, ...h };
  };

  // ---------------------- Provide context ----------------------

  return (
    <Ctx.Provider
      value={{
        socket: socketRef.current,
        ready,
        joinThread,
        leaveThread,
        setHandlers,

        conversations,
        updateConversation,
        setConversations,
        activeConversationId,
        setActiveConversation: setActiveConversationId,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
