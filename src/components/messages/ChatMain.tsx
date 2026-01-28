import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Check,
  CheckCheck,
  RotateCcw,
  Loader2,
  Paperclip,
  Images,
  FileText,
  Video,
  Send,
  Mic,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";

import { cn } from "../../lib/utils";
import { FaWhatsapp, FaInstagram, FaFacebookF } from "react-icons/fa";
import { getOlderMessengerMessages } from "@/api/messenger";
import { getTemplatesByPlatform } from "@/api/templates";
import chatWallpaper from "@/assets/chatWallpaper2.png";

const PLATFORM_CONFIG = {
  facebook: {
    base: "facebook",
    icon: FaFacebookF,
    bgColor: "bg-facebook-primary",
    borderColor: "border-l-facebook-primary",
  },
  instagram: {
    base: "instagram",
    icon: FaInstagram,
    bgColor: "bg-instagram-primary",
    borderColor: "border-l-instagram-primary",
  },
  whatsapp: {
    base: "whatsapp",
    icon: FaWhatsapp,
    bgColor: "bg-whatsapp-primary",
    borderColor: "border-l-whatsapp-primary",
  },
} as const;

export type Message = {
  id: string;
  content: string;
  conversation_id: string;
  timestamp: string;
  sender: "user" | "customer";
  senderName: string;
  avatar?: string;
  status?: "sent" | "read" | "failed" | "queued" | "delivered";
  content_type?: string;
  attachments?: any[];
};

export type Conversation = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageSender: string;
  lastMessageStatus?: string;
  timestamp: string;
  unreadCount: number;
  platform: keyof typeof PLATFORM_CONFIG;
  messages: Message[];
};

interface ChatMainProps {
  conversation?: Conversation;
  onRetryMessage: (messageId: string) => void;
  onNewMessage: (message: Message) => void;
  onSendMessage: (content: string, conversationId: string) => void;
  isLoading?: boolean;
  onLoadOlderMessages?: (
    olderMessages: Message[],
    nextBeforeId: string | null
  ) => void;
  onToggleUserInfo: () => void;
}

export function ChatMain({
  conversation,
  onRetryMessage,
  onSendMessage,
  onLoadOlderMessages,
  onToggleUserInfo,
  isLoading = false,
}: ChatMainProps) {
  const [message, setMessage] = useState("");
  const [stickyDate, setStickyDate] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [fileTypeDropdownOpen, setFileTypeDropdownOpen] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState<
    { name: string; content: string }[]
  >([]);
  const [templates, setTemplates] = useState<
    { name: string; content: string }[]
  >([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // --- Ref para sincronizar el estado ---
  const nextBeforeIdRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  // --- Platform Config ---
  const platformConfig = conversation
    ? PLATFORM_CONFIG[conversation.platform]
    : PLATFORM_CONFIG.facebook;
  const PlatformIcon = platformConfig.icon;

  // --- Scroll Management ---
  const scrollToBottom = useCallback(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages?.length, scrollToBottom]);

  useEffect(() => {
    messageInputRef.current?.focus();
  }, []);

  // --- Keep refs in sync ---
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    nextBeforeIdRef.current = nextBeforeId;
    hasMoreRef.current = !!nextBeforeId;
  }, [nextBeforeId]);

  // --- Load Older Messages ---
  const loadOlderMessages = useCallback(async () => {
    if (
      !nextBeforeIdRef.current ||
      !hasMoreRef.current ||
      isLoadingMoreRef.current
    )
      return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!scrollContainer) return;

    const prevScrollHeight = scrollContainer.scrollHeight;
    const prevScrollTop = scrollContainer.scrollTop;

    try {
      const res = await getOlderMessengerMessages(
        conversation!.id,
        nextBeforeIdRef.current
      );

      const olderMessages = res.items.reverse();

      // Actualiza la paginación
      setNextBeforeId(res.next_before_id || null);
      nextBeforeIdRef.current = res.next_before_id;
      hasMoreRef.current = !!res.next_before_id;

      // Notifica al parent para prepend
      if (onLoadOlderMessages) {
        onLoadOlderMessages(olderMessages, res.next_before_id || null);
      }

      // 🔑 Mantener la posición después del prepend
      requestAnimationFrame(() => {
        const newScrollHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTop =
          newScrollHeight - prevScrollHeight + prevScrollTop;
      });
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [conversation?.id, onLoadOlderMessages]);

  // --- Scroll handler (cargar + sticky date) ---
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Cargar más cuando se acerca al tope
      if (
        scrollContainer.scrollTop < 50 &&
        !isLoadingMoreRef.current &&
        hasMoreRef.current
      ) {
        loadOlderMessages();
      }

      // Sticky date
      const messageElements = scrollContainer.querySelectorAll("[data-msg-id]");
      for (const element of messageElements) {
        const rect = (element as HTMLElement).getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        if (rect.top >= containerRect.top) {
          const date = element.getAttribute("data-msg-date");
          if (date) setStickyDate(formatDateBubble(date));
          break;
        }
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [loadOlderMessages]);

  // --- Init pagination ---
  useEffect(() => {
    if (!conversation) return;
    setNextBeforeId(conversation.messages?.[0]?.id || null);
  }, [conversation]);

  // --- Utility Functions ---
  const getMessageStatusIcon = useCallback((status: Message["status"]) => {
    switch (status) {
      case "queued":
        return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
      case "sent":
        return <Check className="w-5 h-5 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-5 h-5 text-blue-500" />;
      case "delivered":
        return <CheckCheck className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  }, []);

  const formatTime = useCallback((isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatDateBubble = useCallback((isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";

    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays < 7) {
      return date
        .toLocaleDateString("es-ES", { weekday: "long" })
        .replace(/^\w/, (c) => c.toUpperCase());
    }

    return date.toLocaleDateString("es-ES");
  }, []);

  // --- Message Handling ---
  const handleSendMessage = useCallback(() => {
    if (!message.trim() || !conversation) return;

    onSendMessage(message, conversation.id);
    setMessage("");
    scrollToBottom();
  }, [message, conversation, onSendMessage, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSelectedFile(file);
      setUploadedFileUrl(URL.createObjectURL(file));
      setFileTypeDropdownOpen(false);
    },
    []
  );

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setUploadedFileUrl(null);
  }, []);

  // --- File Dropdown Management ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const dropdown = document.getElementById("file-type-dropdown");
      const button = document.getElementById("file-type-btn");

      if (
        dropdown &&
        button &&
        !dropdown.contains(target) &&
        !button.contains(target)
      ) {
        setFileTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const templatesData = await getTemplatesByPlatform(
          conversation.platform
        );
        setTemplates(templatesData);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-ajustar altura
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
      messageInputRef.current.style.height =
        Math.min(messageInputRef.current.scrollHeight, 128) + "px";
    }

    // Show templates when user types "/"
    if (value.startsWith("/")) {
      const query = value.slice(1).toLowerCase();
      const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(query)
      );
      setFilteredTemplates(filtered);
      setShowTemplateDropdown(true);
    } else {
      setShowTemplateDropdown(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[93%] bg-background-dark">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-background ps-14 lg:ps-6 hover:bg-background/90">
        <div className="flex items-center justify-between ">
          <div
            className="flex items-center space-x-3 cursor-pointer p-1 w-full "
            onClick={onToggleUserInfo}
            title="Información de Contacto"
          >
            <div className="relative me-3">
              <Avatar className="h-12 w-12 border border-background-light/20">
                <AvatarImage src={conversation.avatar} />
                <AvatarFallback >
                  {conversation.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="absolute top-7 left-7 w-7 h-7 rounded-full flex items-center justify-center">
                <div
                  className={`w-full h-full ${platformConfig.bgColor} rounded-full flex items-center justify-center`}
                >
                  <PlatformIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-muted">
                {conversation.name}
              </h2>
              <p className="text-sm text-muted/60 font-semibold capitalize">
                {conversation.platform}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 p-2 relative"
        style={{
          backgroundImage: `url(${chatWallpaper})`,
          backgroundSize: "100% 1000px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          opacity: 0.9,
        }}
      >
        <div className="absolute inset-0 bg-background pointer-events-none"></div>

        <div className="relative z-10">
          {stickyDate && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="px-3 py-1 bg-background-light/90 text-xs rounded-full shadow-md backdrop-blur-sm">
                {stickyDate}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {isLoadingMore && (
              <div className="flex justify-center mb-2">
                <span className="px-3 py-1 bg-background/90 text-sm rounded-full z-10 backdrop-blur-sm">
                  Cargando..
                </span>
              </div>
            )}
            {conversation.messages?.map((msg, index) => {
              const prevMsg = conversation.messages[index - 1];
              const showDateBubble =
                !prevMsg ||
                new Date(prevMsg.timestamp).toDateString() !==
                  new Date(msg.timestamp).toDateString();

              return (
                <div
                  key={msg.id}
                  data-msg-id={msg.id}
                  data-msg-date={msg.timestamp}
                >
                  {showDateBubble && (
                    <div className="flex justify-center mb-2">
                      <span className="px-3 py-1 bg-background-light/90 text-xs text-muted rounded-full backdrop-blur-sm">
                        {formatDateBubble(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex",
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center space-x-2",
                        msg.sender === "user"
                          ? "flex-row-reverse space-x-reverse"
                          : "flex-row"
                      )}
                    >
                      {/* Status and retry container */}
                      <div
                        title={msg.status}
                        className="flex flex-col justify-center items-center space-y-1"
                      >
                        {msg.sender === "user" &&
                          getMessageStatusIcon(msg.status)}
                        {msg.status === "failed" && msg.sender === "user" && (
                          <button
                            onClick={() => onRetryMessage(msg.id)}
                            aria-label="Reintentar"
                            title="Reintentar"
                            className="text-red-500 hover:text-red-700"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Message bubble */}
                      <div
                        className={cn(
                          "px-4 py-2 rounded-sm shadow-sm max-w-[600px] min-w-[100px] break-words",
                          msg.sender === "user"
                            ? cn(platformConfig.bgColor, "text-white")
                            : cn(
                                "bg-background-light text-muted",
                                platformConfig.borderColor,
                                "border-l-4"
                              ),
                          msg.status === "failed" &&
                            msg.sender === "user" &&
                            "bg-red-500/80"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="flex justify-end items-center space-x-2">
                          <p
                            className={cn(
                              "text-xs mt-1",
                              msg.sender === "user"
                                ? "text-white/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* File Preview */}
      {selectedFile && (
        <div className="flex items-start space-x-2 h-auto border p-4 bg-background px-4">
          {selectedFile.type.startsWith("image/") && (
            <img
              src={uploadedFileUrl!}
              alt="preview"
              className="max-h-60 max-w-60 object-contain rounded-md border border-gray-300"
            />
          )}
          {selectedFile.type.startsWith("video/") && (
            <video
              src={uploadedFileUrl!}
              className="max-h-80 max-w-80 rounded-md border border-gray-300"
              controls
              muted
            />
          )}
          {(selectedFile.type.startsWith("application/") ||
            selectedFile.type === "text/plain") && (
            <div className="flex items-center space-x-2 rounded-md border p-2">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <span className="text-md pr-4">{selectedFile.name}</span>
            </div>
          )}
          <button
            className="text-gray-500 hover:text-red-600 ml-auto self-start"
            onClick={removeSelectedFile}
          >
            <strong className="text-xl">×</strong>
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="px-4 py-4 pt-6 bg-background flex flex-col space-y-2">
        <div className="flex items-center gap-2 relative">
          {" "}
          {/* ← Agregar gap-2 aquí */}
          <Button
            variant="ghost"
            size="sm"
            id="file-type-btn"
            onClick={() => setFileTypeDropdownOpen(!fileTypeDropdownOpen)}
            className={cn(
              "transition-colors flex-shrink-0", // ← Cambiar me-2 por flex-shrink-0
              fileTypeDropdownOpen
                ? "bg-background-light text-foreground"
                : "hover:bg-background-light"
            )}
          >
            <Paperclip className="h-4 w-4 text-muted" />
          </Button>
          {fileTypeDropdownOpen && (
            <div
              className="absolute bottom-full mb-2 left-0 bg-background border rounded-md shadow-lg w-48 z-50 p-2"
              id="file-type-dropdown"
            >
              <label className="flex items-center rounded-md gap-2 px-3 py-2 cursor-pointer hover:bg-background-light text-muted">
                <Images className="h-4 w-4 mr-2" />
                Imagen
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              <label className="flex items-center rounded-md gap-2 px-3 py-2 cursor-pointer hover:bg-background-light text-muted">
                <Video className="h-4 w-4 mr-2" />
                Video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              <label className="flex items-center rounded-md gap-2 px-3 py-2 cursor-pointer hover:bg-background-light text-muted">
                <FileText className="h-4 w-4 mr-2" />
                Documento
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          )}
          {/* Contenedor del textarea que ocupa el espacio disponible */}
          <div className="flex-1 relative">
            <p className="text-muted text-xs ps-3 absolute -top-5 left-0">
              Usa <strong>/</strong> para abrir plantillas
            </p>

            <Textarea
              ref={messageInputRef}
              placeholder="Escribir mensaje..."
              className="w-full ps-6 pr-6 py-3 border-secondary bg-background text-muted placeholder:text-muted/60 rounded-2xl focus:outline-none resize-none min-h-[44px] max-h-[100px]" 
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              maxLength={200}
              rows={1}
            />
          </div>

          {showTemplateDropdown && filteredTemplates.length > 0 && (
            <ul className="w-full lg:w-[600px] max-h-[300px] min-h-[80px] scrollbar-thin absolute bottom-full mb-2 bg-background border rounded-md p-2 overflow-y-auto z-50">
              {filteredTemplates.map((t, index) => (
                <li
                  key={index}
                  className="p-2 rounded-md cursor-pointer break-words"
                  onClick={() => {
                    setMessage(t.content);
                    setShowTemplateDropdown(false);
                  }}
                >
                  <div className="p-2 rounded-md cursor-pointer hover:bg-background-light break-words">
                    <p className=" text-sm text-secondary font-semibold pe-5">/{t.name}</p>
                    <p className=" text-xs text-muted/70 whitespace-pre-wrap">
                      {t.content}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!message.trim() ? (
            <button
              onClick={() => {
                // TODO: Implement microphone functionality
                console.log("Microphone clicked");
              }}
              disabled={isLoading}
              title="Grabar audio"
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-background-light flex-shrink-0", 
                platformConfig.bgColor,
                "hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Mic className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              title="Enviar"
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-background-light flex-shrink-0", 
                platformConfig.bgColor,
                "hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
