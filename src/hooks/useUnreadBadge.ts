// src/hooks/useUnreadBadge.ts
import { useEffect } from "react";
import { useRealtime } from "@/api/realtime/RealtimeProvider";

export function useUnreadBadge() {
  const { conversations } = useRealtime();

  const totalUnread = conversations.reduce(
    (acc, conv) => acc + (conv.unreadCount || 0),
    0
  );

  // Update browser tab title
  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Vayne - Meta Integration`;
    } else {
      document.title = "Vayne - Meta Integration";
    }
  }, [totalUnread]);

  return totalUnread;
}
