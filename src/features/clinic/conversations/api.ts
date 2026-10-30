import { useNotification } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { kyInstance } from "@/shared/api/data";
import type { ChatLine, ChatThread } from "@/domains/chat/types";
import { chatErrorText } from "@/domains/chat/types";

/** `staff` reads `/conversations`, `own` the customer's `/my_conversations`. */
export type ChatSide = "staff" | "own";

const BASE: Record<ChatSide, string> = {
  staff: "conversations",
  own: "my_conversations",
};

export const threadKey = (side: ChatSide, id: number) => [
  "chat-thread",
  side,
  id,
];

/** A conversation that is not there (or not the reader's) will not appear on a second try. */
export const threadRetry = (failures: number, error: unknown) =>
  (error as { statusCode?: number } | null)?.statusCode !== 404 && failures < 2;

export function fetchThread<C>(side: ChatSide, id: number) {
  return kyInstance.get(`${BASE[side]}/${id}`).json<ChatThread<C>>();
}

/**
 * Sending into a conversation from one side: text or an image. The line the
 * API returns is appended to the cached thread at once; the next read brings
 * the read marks up to date.
 */
export function useChatSend(side: ChatSide, id: number) {
  const queryClient = useQueryClient();
  const { open } = useNotification();

  const append = (line: ChatLine) =>
    queryClient.setQueryData<ChatThread<unknown>>(
      threadKey(side, id),
      (thread) =>
        thread ? { ...thread, messages: [...thread.messages, line] } : thread
    );

  const fail = (error: unknown) => {
    open?.({
      type: "error",
      message: chatErrorText(
        error as { message?: string; errors?: Record<string, unknown> }
      ),
    });
    return false;
  };

  const sendText = (text: string) =>
    kyInstance
      .post(`${BASE[side]}/${id}/messages`, { json: { text } })
      .json<ChatLine>()
      .then((line) => {
        append(line);
        return true;
      }, fail);

  const sendImage = (file: File) => {
    const body = new FormData();
    body.append("file", file);
    // The instance defaults to JSON; the multipart boundary is only set once that default is taken off.
    return kyInstance
      .post(`${BASE[side]}/${id}/images`, {
        body,
        headers: { "Content-Type": undefined },
      })
      .json<ChatLine>()
      .then((line) => {
        append(line);
        return true;
      }, fail);
  };

  const loadImage = useCallback(
    (messageId: number) =>
      kyInstance.get(`${BASE[side]}/${id}/images/${messageId}`).blob(),
    [side, id]
  );

  return {
    sendText,
    sendImage,
    loadImage,
    reject: (message: string) => open?.({ type: "error", message }),
  };
}
