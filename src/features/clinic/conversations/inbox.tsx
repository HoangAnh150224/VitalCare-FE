import {
  useCan,
  useInvalidate,
  useList,
  useNotification,
} from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import {
  LockIcon,
  LockOpenIcon,
  MessagesSquareIcon,
  PhoneIcon,
  SearchIcon,
} from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { subscribe } from "@/shared/api/live";
import { publicGet } from "@/shared/api/public";
import {
  ChatComposer,
  ChatEmergencyNotice,
  ChatThread,
} from "@/shared/components/chat/chat";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import type { InboxConversation } from "@/domains/chat/types";
import { CHAT_KIND_LABELS, chatErrorText } from "@/domains/chat/types";
import type { PublicClinic } from "@/domains/public-site/types";
import { displayPhone } from "@/domains/public-site/types";
import { fetchThread, threadKey, threadRetry, useChatSend } from "./api";

/** Where the API nudges a clinic's staff that one of its conversations moved. */
const topicOf = (clinicId: string) => `/topic/conversations/${clinicId}`;

/**
 * Nudges for every clinic: the inbox's own scope decides which conversations
 * a member of staff then reads, so listening to a clinic not theirs only
 * costs a re-read that comes back the same.
 */
function useConversationNudges(onNudge: (conversationId: number) => void) {
  const { data: clinics } = useQuery({
    queryKey: ["public", "clinics"],
    queryFn: () => publicGet<PublicClinic[]>("clinics"),
    staleTime: 60_000,
  });
  const ids = clinics?.map((clinic) => clinic.id).join(",") ?? "";
  useEffect(() => {
    if (!ids) return;
    const offs = ids
      .split(",")
      .map((clinicId) =>
        subscribe(topicOf(clinicId), (body) =>
          onNudge(
            (body as { conversationId?: number } | undefined)?.conversationId ??
              0
          )
        )
      );
    return () => offs.forEach((off) => off());
  }, [ids, onNudge]);
}

/**
 * The clinic's support inbox (SRS 3.16.1, 3.16.3): conversations on the
 * left, newest first, the open one on the right. Opening one marks it read
 * for the whole clinic. Live over the socket, with a slow poll behind it.
 */
export function ConversationInbox() {
  const params = useParams();
  const navigate = useNavigate();
  const selected = params.id ? Number(params.id) : null;
  const invalidate = useInvalidate();
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<"all" | "unread">("all");
  const term = useDeferredValue(query.trim());

  const { result, query: listQuery } = useList<InboxConversation>({
    resource: "conversations",
    filters: [
      ...(term ? [{ field: "q", operator: "eq" as const, value: term }] : []),
      ...(only === "unread"
        ? [{ field: "read", operator: "eq" as const, value: "unread" }]
        : []),
    ],
    pagination: { pageSize: 50 },
    queryOptions: { refetchInterval: 30_000 },
  });
  const conversations = result?.data ?? [];

  const thread = useQuery({
    queryKey: threadKey("staff", selected ?? 0),
    queryFn: () => fetchThread<InboxConversation>("staff", selected!),
    retry: threadRetry,
    enabled: selected !== null,
    refetchInterval: 30_000,
  });

  useConversationNudges((conversationId) => {
    void listQuery.refetch();
    invalidate({ resource: "conversations", invalidates: ["list"] });
    if (conversationId === selected) void thread.refetch();
  });

  // Opening a conversation marks it read: the list's unread counts follow.
  useEffect(() => {
    if (thread.dataUpdatedAt) void listQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.dataUpdatedAt]);

  return (
    <ListView>
      <ListViewHeader
        resource="conversations"
        canCreate={false}
        description="Trò chuyện hỗ trợ với bệnh nhân và khách. Không dùng cho tình huống khẩn cấp."
      />
      <div className="grid min-h-[34rem] min-w-0 gap-4 lg:h-[calc(100svh-13rem)] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="bg-card flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <div className="flex flex-col gap-2 border-b p-3">
            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tên hoặc số điện thoại"
                aria-label="Tìm hội thoại"
                className="pl-8"
              />
            </div>
            <ToggleGroup
              type="single"
              value={only}
              onValueChange={(value) =>
                value && setOnly(value as "all" | "unread")
              }
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="all">Tất cả</ToggleGroupItem>
              <ToggleGroupItem value="unread">Chưa đọc</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {listQuery.isLoading && <Skeleton className="m-3 h-16" />}
            {!listQuery.isLoading && conversations.length === 0 && (
              <li className="text-muted-foreground p-4 text-sm">
                Không có hội thoại nào.
              </li>
            )}
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/conversations/show/${conversation.id}`)
                  }
                  className={cn(
                    "hover:bg-muted/60 flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors",
                    conversation.id === selected && "bg-primary/8"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        conversation.unread > 0
                          ? "font-semibold"
                          : "font-medium"
                      )}
                    >
                      {conversation.contactName}
                    </span>
                    {conversation.unread > 0 && (
                      <Badge className="h-5 min-w-5 justify-center px-1.5">
                        {conversation.unread}
                      </Badge>
                    )}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {CHAT_KIND_LABELS[conversation.kind]}
                    {conversation.status === "CLOSED" && " · Đã đóng"} ·{" "}
                    {formatDateTime(conversation.lastMessageAt)}
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm",
                      conversation.unread > 0
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {conversation.lastSenderKind === "staff" ? "Bạn: " : ""}
                    {conversation.lastMessagePreview}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card flex min-h-[28rem] flex-col overflow-hidden rounded-lg border">
          {selected === null ? (
            <div className="text-muted-foreground m-auto flex flex-col items-center gap-2 p-8 text-center text-sm">
              <MessagesSquareIcon className="size-8" />
              Chọn một hội thoại để xem và trả lời.
            </div>
          ) : (
            <OpenConversation
              id={selected}
              data={thread.data}
              loading={thread.isLoading}
              failed={thread.isError}
            />
          )}
        </section>
      </div>
    </ListView>
  );
}

function OpenConversation({
  id,
  data,
  loading,
  failed,
}: {
  id: number;
  data: Awaited<ReturnType<typeof fetchThread<InboxConversation>>> | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const send = useChatSend("staff", id);
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { data: canWrite } = useCan({
    resource: "conversations",
    action: "edit",
  });
  const conversation = data?.conversation;
  const writable =
    (canWrite?.can ?? false) && conversation?._can?.write !== false;

  const toggle = async () => {
    if (!conversation) return;
    try {
      await kyInstance
        .post(
          `conversations/${id}/${
            conversation.status === "CLOSED" ? "reopen" : "close"
          }`
        )
        .json();
      invalidate({ resource: "conversations", invalidates: ["list"] });
      open?.({
        type: "success",
        message:
          conversation.status === "CLOSED"
            ? "Đã mở lại hội thoại"
            : "Đã đóng hội thoại",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: chatErrorText(error as { message?: string }),
      });
    }
  };

  if (loading) return <Skeleton className="m-4 flex-1" />;
  if (failed || !conversation)
    return (
      <p className="text-destructive m-4 text-sm">
        Không mở được hội thoại này.
      </p>
    );

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{conversation.contactName}</span>
            <Badge
              variant={conversation.kind === "guest" ? "secondary" : "info"}
            >
              {CHAT_KIND_LABELS[conversation.kind]}
            </Badge>
            {conversation.status === "CLOSED" && (
              <Badge variant="neutral">Đã đóng</Badge>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {conversation.clinicName}
          </p>
        </div>
        {conversation.contactPhone && (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${conversation.contactPhone}`}>
              <PhoneIcon />
              {displayPhone(conversation.contactPhone)}
            </a>
          </Button>
        )}
        {writable && (
          <Button variant="ghost" size="sm" onClick={() => void toggle()}>
            {conversation.status === "CLOSED" ? <LockOpenIcon /> : <LockIcon />}
            {conversation.status === "CLOSED" ? "Mở lại" : "Đóng hội thoại"}
          </Button>
        )}
      </header>
      <div className="px-4 pt-3">
        <ChatEmergencyNotice />
      </div>
      <ChatThread messages={data.messages} loadImage={send.loadImage} />
      {writable ? (
        <ChatComposer
          onSend={send.sendText}
          onImage={send.sendImage}
          onReject={send.reject}
          placeholder="Trả lời..."
        />
      ) : (
        <p className="text-muted-foreground border-t p-3 text-sm">
          Bạn chỉ có quyền xem hội thoại này.
        </p>
      )}
    </>
  );
}
