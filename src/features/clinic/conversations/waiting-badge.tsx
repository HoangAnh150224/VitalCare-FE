import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { kyInstance } from "@/shared/api/data";
import { subscribe } from "@/shared/api/live";

/** Where the API nudges a clinic's staff that one of its conversations moved. */
const topicOf = (clinicId: string) => `/topic/conversations/${clinicId}`;

export const WAITING_KEY = ["conversations", "waiting"];

/**
 * Nudges for the clinics the caller answers — their own, or every one for the
 * system administrator. The handler is read through a ref, so a new one on
 * every render does not close and reopen the subscriptions.
 */
export function useConversationNudges(
  onNudge: (conversationId: number) => void
) {
  const handler = useRef(onNudge);
  useEffect(() => {
    handler.current = onNudge;
  });
  const { data: clinicIds } = useQuery({
    queryKey: ["conversation-clinics"],
    queryFn: () => kyInstance.get("conversations/clinics").json<string[]>(),
    staleTime: 5 * 60_000,
  });
  const ids = clinicIds?.join(",") ?? "";
  useEffect(() => {
    if (!ids) return;
    const offs = ids
      .split(",")
      .map((clinicId) =>
        subscribe(topicOf(clinicId), (body) =>
          handler.current(
            (body as { conversationId?: number } | undefined)?.conversationId ??
              0
          )
        )
      );
    return () => offs.forEach((off) => off());
  }, [ids]);
}

/**
 * The "Tin nhắn" menu item's badge: how many conversations wait on the clinic.
 * Live over the same nudge as the inbox, with a slow poll behind it. Renders
 * nothing at zero. Only mounted for accounts that see the menu item.
 */
export function ConversationsWaitingBadge() {
  const { data, refetch } = useQuery({
    queryKey: WAITING_KEY,
    queryFn: () =>
      kyInstance.get("conversations/waiting").json<{ count: number }>(),
    refetchInterval: 60_000,
  });
  useConversationNudges(() => void refetch());
  const count = data?.count ?? 0;
  if (count === 0) return null;
  return (
    <span aria-label={`${count} hội thoại đang chờ trả lời`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
