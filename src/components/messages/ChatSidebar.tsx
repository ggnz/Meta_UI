import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useRealtime } from "@/api/realtime/RealtimeProvider";
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowDownUp,
  MessageSquarePlus,
  MessageSquareDot,
  ChevronDown,
  Check,
  CheckCheck,
  Loader2,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { getContacts } from "@/api/contacts";

const PLATFORMS = [
  {
    value: "facebook",
    label: "Facebook",
    icon: <FaFacebookF className="w-4 h-4 text-facebook-primary" />,
  },
  {
    value: "instagram",
    label: "Instagram",
    icon: <FaInstagram className="w-4 h-4 text-instagram-primary" />,
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: <FaWhatsapp className="w-4 h-4 text-whatsapp-primary" />,
  },
];

export type Conversation = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageSender: string;
  lastMessageStatus?: string;
  timestamp: string;
  unreadCount: number;
  platform: string;
  messages: any[];
};

function mergeById(
  base: Conversation[],
  incoming: Conversation[]
): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const b of base) map.set(String(b.id), b);
  for (const n of incoming) {
    const id = String(n.id);
    const prev = map.get(id);
    map.set(
      id,
      prev
        ? {
            ...prev,
            ...n,
            lastMessage: prev.lastMessage,
            lastMessageSender: prev.lastMessageSender,
            lastMessageStatus: prev.lastMessageStatus,
            unreadCount: prev.unreadCount,
          }
        : n
    );
  }
  return Array.from(map.values());
}

function applySort(list: Conversation[], order: "recent" | "old") {
  return [...list].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return order === "recent" ? tb - ta : ta - tb;
  });
}

function formatTimestamp(timestamp: string) {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Ayer";

  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffInDays < 7) {
    return capitalize(date.toLocaleDateString("es-ES", { weekday: "long" }));
  }
  return date.toLocaleDateString("es-ES");
}

function getMessageStatusIcon(status?: string) {
  switch (status) {
    case "queued":
      return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
    case "sent":
      return <Check className="w-3 h-3 text-gray-400" />;
    case "delivered":
      return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case "read":
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    default:
      return null;
  }
}

// ================= Component =================
interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  isLoading?: boolean;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onConversationSelect,
  isLoading = false,
}: ChatSidebarProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"recent" | "old">("recent");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");
  const seenInboundRef = useRef<Map<string, Set<string>>>(new Map());

  const {
    socket,
    ready,
    conversations: realtimeConversations,
    setConversations: setRealtimeConversations,
  } = useRealtime();

  // Ensure items always match the local Conversation type
  const [items, setItems] = useState<Conversation[]>([]);

  // Fetch contacts when modal opens
  const fetchContacts = async () => {
    try {
      setIsLoadingContacts(true);
      const contactsData = await getContacts();
      setContacts(contactsData);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      setContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!contactsSearchQuery.trim()) return contacts;

    const query = contactsSearchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.name?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query)
    );
  }, [contacts, contactsSearchQuery]);

  const handleOpenContactsModal = () => {
    setIsContactsModalOpen(true);
    fetchContacts();
  };

  useEffect(() => {
    if (!realtimeConversations) return;
    setItems((prev: Conversation[]) => {
      // Map realtimeConversations to local Conversation type if needed
      return realtimeConversations.map((c: any) => ({
        id: c.id,
        name: c.name ?? "Sin nombre",
        avatar: c.avatar ?? "",
        lastMessage: c.lastMessage ?? "",
        lastMessageSender: c.lastMessageSender ?? "customer",
        lastMessageStatus: c.lastMessageStatus,
        timestamp: c.timestamp ?? new Date().toISOString(),
        unreadCount: c.unreadCount ?? 0,
        platform: c.platform ?? "facebook",
        messages: c.messages ?? [],
      }));
    });
  }, [realtimeConversations]);

  // Merge initial props
  useEffect(() => {
    if (!conversations) return;
    setItems((prev: Conversation[]) => mergeById(prev, conversations));
  }, [conversations, setItems]);

  // Handlers
  const onUserMessageNew = useCallback(
    (evt: { conversation_id: string; message: any }) => {
      const { conversation_id, message } = evt;
      const threadId = String(conversation_id);

      const ts =
        message?.sent_at ?? message?.created_at ?? new Date().toISOString();
      const fingerprint = String(
        message?.id ??
          message?.external_id ??
          `${threadId}::${String(message?.text ?? "")}::${ts}`
      );

      setItems((prev) => {
        const seenForThread =
          seenInboundRef.current.get(threadId) ?? new Set<string>();
        if (seenForThread.has(fingerprint)) return prev;

        const idx = prev.findIndex((c) => String(c.id) === threadId);
        const isOut = message?.direction === "out";
        const isIn = message?.direction === "in";

        if (isIn) {
          seenForThread.add(fingerprint);
          seenInboundRef.current.set(threadId, seenForThread);
        }

        const patch = {
          lastMessage: message?.text ?? prev[idx]?.lastMessage ?? "",
          lastMessageSender: isOut ? "user" : "customer",
          lastMessageStatus:
            message?.delivery_status ?? prev[idx]?.lastMessageStatus,
          timestamp: ts,
          unreadCount:
            isIn && String(activeConversationId) !== threadId
              ? (prev[idx]?.unreadCount ?? 0) + 1
              : prev[idx]?.unreadCount ?? 0,
        };

        if (idx === -1) {
          const newbie: Conversation = {
            id: threadId,
            name: "Nuevo contacto",
            avatar: "",
            platform: "facebook",
            messages: [],
            lastMessage: patch.lastMessage,
            lastMessageSender: patch.lastMessageSender,
            lastMessageStatus: patch.lastMessageStatus,
            timestamp: patch.timestamp,
            unreadCount: patch.unreadCount ?? 0,
          };
          return [...prev, newbie];
        }

        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...patch };
        return updated;
      });
    },
    [setItems, activeConversationId]
  );

  const onUserThreadUpdate = useCallback(
    (payload: any) => {
      setItems((prev) => {
        const idx = prev.findIndex((c) => String(c.id) === String(payload.id));
        if (idx === -1) return prev;

        const unreadFromPayload =
          typeof payload.unread === "number"
            ? payload.unread
            : typeof payload.unread_count === "number"
            ? payload.unread_count
            : undefined;

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          timestamp: payload.last_message_at ?? updated[idx].timestamp,
          unreadCount:
            typeof unreadFromPayload === "number"
              ? unreadFromPayload
              : updated[idx].unreadCount,
        };
        return updated;
      });
    },
    [setItems]
  );

  // Subscribe
  useEffect(() => {
    if (!ready || !socket) return;
    socket.on("messenger:message:new", onUserMessageNew);
    socket.on("messenger:thread:update", onUserThreadUpdate);
    return () => {
      socket.off("messenger:message:new", onUserMessageNew);
      socket.off("messenger:thread:update", onUserThreadUpdate);
    };
  }, [socket, ready, onUserMessageNew, onUserThreadUpdate]);

  // Clear unread on active change
  useEffect(() => {
    if (!activeConversationId) return;
    const id = String(activeConversationId);
    seenInboundRef.current.delete(id);
    setItems((prev) => {
      const idx = prev.findIndex((c) => String(c.id) === id);
      if (idx === -1 || prev[idx].unreadCount === 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], unreadCount: 0 };
      return updated;
    });
  }, [activeConversationId, setItems]);

  // Filtered list
  const filteredConversations = useMemo(() => {
    let result = [...items];
    if (selectedPlatforms.length) {
      result = result.filter((c) => selectedPlatforms.includes(c.platform));
    }
    if (unreadOnly) {
      result = result.filter((c) => c.unreadCount > 0);
    }
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.lastMessage || "").toLowerCase().includes(query)
      );
    }
    return applySort(result, sortOrder);
  }, [items, selectedPlatforms, unreadOnly, sortOrder, searchQuery]);

  return (
    <div className="w-full md:w-1/4 max-height bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-background-light">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">Mensajes</h2>
          <div className="flex items-center space-x-3">
            {items.some((c) => c.unreadCount > 0) && (
              <Button
                variant="ghost"
                size="sm"
                title="Sin leer"
                className="flex items-center cursor-pointer hover:bg-background-dark"
                onClick={() => setUnreadOnly((prev) => !prev)}
              >
                <MessageSquareDot
                  className={cn(
                    "h-4 w-4",
                    unreadOnly ? "text-primary" : "text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium ml-0",
                    unreadOnly ? "text-primary" : "text-foreground"
                  )}
                >
                  {items.filter((c) => c.unreadCount > 0).length}
                </span>
              </Button>
            )}
            {/* Contacts Modal Trigger */}
            <Dialog
              open={isContactsModalOpen}
              onOpenChange={setIsContactsModalOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center cursor-pointer text-foreground/60 hover:bg-background-dark"
                  title="Iniciar Chat"
                  onClick={handleOpenContactsModal}
                >
                  <MessageSquarePlus className="w-4 h-4 text-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[50vh] max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Iniciar Chat</DialogTitle>
                </DialogHeader>

                {/* Contacts Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60 h-4 w-4" />
                  <Input
                    value={contactsSearchQuery}
                    onChange={(e) => setContactsSearchQuery(e.target.value)}
                    placeholder="Buscar contactos..."
                    className=" bg-background-light text-foreground placeholder:text-foreground/60"
                  />
                </div>

                {/* Contacts List */}
                <div className="flex-1 overflow-y-auto border rounded-lg">
                  {isLoadingContacts ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2 text-foreground">
                        Cargando contactos...
                      </span>
                    </div>
                  ) : filteredContacts.length > 0 ? (
                    <div className="divide-y">
                      {filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="p-4 cursor-pointer hover:bg-background-light transition-colors"
                          onClick={() => {
                            console.log("Starting chat with:", contact);
                            setIsContactsModalOpen(false);
                            // You might want to call a function here to start a new conversation
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={contact.avatar} />
                              <AvatarFallback className="bg-background text-dark-foreground">
                                {contact.name
                                  ?.split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-foreground truncate">
                                {contact.name || "Sin nombre"}
                              </h3>
                              <div className="flex flex-col text-xs text-foreground/60 mt-1">
                                {contact.phone && (
                                  <span className="truncate">
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-foreground/60">
                        {contactsSearchQuery
                          ? "No se encontraron contactos"
                          : "No hay contactos disponibles"}
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60 h-4 w-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="bg-background-light text-foreground placeholder:text-foreground/60"
          />
        </div>
      </div>

      {/* Filtros / Orden */}
      <div className="px-4 py-2 flex justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-60 justify-between text-foreground/60 hover:bg-background-dark flex items-center"
            >
              <div className="flex max-w-[120px] min-w-[160px]">
                <Filter className="h-4 w-4 mr-1" />
                <span className="truncate ml-1">
                  {selectedPlatforms.length === 0
                    ? "Filtros"
                    : selectedPlatforms.length === PLATFORMS.length
                    ? "Todos"
                    : selectedPlatforms
                        .map(
                          (ch) => PLATFORMS.find((c) => c.value === ch)?.label
                        )
                        .join(", ")}
                </span>
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 py-2 px-2 bg-background space-y-2">
            {PLATFORMS.map((ch) => (
              <div
                key={ch.value}
                className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-background-dark"
                onClick={() =>
                  setSelectedPlatforms((prev) =>
                    prev.includes(ch.value)
                      ? prev.filter((v) => v !== ch.value)
                      : [...prev, ch.value]
                  )
                }
              >
                <Checkbox
                  className="me-2"
                  checked={selectedPlatforms.includes(ch.value)}
                />
                {ch.icon}
                <span className="text-sm ">{ch.label}</span>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          className="w-40 text-foreground/60 hover:bg-background-dark"
          onClick={() =>
            setSortOrder((prev) => (prev === "recent" ? "old" : "recent"))
          }
        >
          {sortOrder === "recent" ? (
            <ArrowUpDown className="h-4 w-4" />
          ) : (
            <ArrowDownUp className="h-4 w-4" />
          )}
          <span className="ml-1">
            {sortOrder === "recent" ? "Recientes" : "Antiguos"}
          </span>
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        // Loading state
        <div className="flex flex-col h-full bg-background items-center justify-top mt-10">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando conversaciones...</p>
        </div>
      </div>
      ) : conversations.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center h-32 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No tienes conversaciones
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => {
                onConversationSelect(conversation.id);
              }}
              className={cn(
                "p-4 cursor-pointer hover:bg-background-dark",
                activeConversationId === conversation.id &&
                  "bg-background-light"
              )}
            >
              <div className="flex items-start space-x-3">
                <div className="relative me-2">
                  <Avatar className="h-10 w-10 border border-background-ligh">
                    <AvatarImage src={conversation.avatar} />
                    <AvatarFallback className="bg-background-dark text-dark-foreground">
                      {conversation.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {/* Indicador canal */}
                  <div className="absolute top-6 left-6 w-6 h-6 rounded-full flex items-center justify-center">
                    {conversation.platform === "facebook" && (
                      <div className="w-full h-full bg-facebook-primary rounded-full flex items-center justify-center relative">
                        <FaFacebookF className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {conversation.platform === "instagram" && (
                      <div className="w-full h-full bg-instagram-primary rounded-full flex items-center justify-center">
                        <FaInstagram className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {conversation.platform === "whatsapp" && (
                      <div className="w-full h-full bg-whatsapp-primary rounded-full flex items-center justify-center relative">
                        <FaWhatsapp className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {conversation.name}
                    </h3>
                    <span className="text-xs text-foreground/60">
                      {formatTimestamp(conversation.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <p className="text-sm text-foreground/70 truncate pr-2 flex-1">
                        {conversation.lastMessage}
                      </p>
                      {/* Show status icon if last message was sent by user */}
                      {conversation.lastMessageSender === "user" && (
                        <div className="flex-shrink-0">
                          {getMessageStatusIcon(conversation.lastMessageStatus)}
                        </div>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary rounded-full">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
