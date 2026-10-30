import { useNotification } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  PhoneIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { subscribe } from "@/shared/api/live";
import { publicGet } from "@/shared/api/public";
import {
  ChatComposer,
  ChatEmergencyNotice,
  ChatThread,
} from "@/shared/components/chat/chat";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { formatDateTime } from "@/shared/lib/format";
import type {
  ChatThread as Thread,
  OwnConversation,
} from "@/domains/chat/types";
import { CHAT_TEXT_MAX, chatErrorText } from "@/domains/chat/types";
import type { PublicClinic } from "@/domains/public-site/types";
import { displayPhone } from "@/domains/public-site/types";
import { fetchThread, threadKey, threadRetry, useChatSend } from "./api";

/** Where the API nudges a customer that one of their conversations moved. */
const MY_CONVERSATIONS = "/user/queue/my_conversations";

/**
 * The patient's messages (SRS 3.16.1–3.16.2): their conversations with
 * clinics, and writing to a clinic — which continues the conversation with
 * it if there is one. Follows the clinic's replies live.
 */
export function PortalConversations() {
  const navigate = useNavigate();
  const { open } = useNotification();
  const {
    data: list,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-conversations"],
    queryFn: () => kyInstance.get("my_conversations").json<OwnConversation[]>(),
  });
  const { data: clinics } = useQuery({
    queryKey: ["public", "clinics"],
    queryFn: () => publicGet<PublicClinic[]>("clinics"),
    staleTime: 60_000,
  });
  const [clinicId, setClinicId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = clinicId || (clinics?.length === 1 ? clinics[0].id : "");

  useEffect(() => subscribe(MY_CONVERSATIONS, () => void refetch()), [refetch]);

  const start = async () => {
    if (!chosen || !text.trim()) return;
    setBusy(true);
    try {
      const thread = await kyInstance
        .post("my_conversations", {
          json: { clinicId: chosen, text: text.trim() },
        })
        .json<Thread<OwnConversation>>();
      navigate(`/my-conversations/${thread.conversation.id}`);
    } catch (error) {
      open?.({
        type: "error",
        message: chatErrorText(error as { message?: string }),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Tin nhắn
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Hỏi phòng khám về lịch khám, kết quả hay hướng dẫn sau khám.
        </p>
      </div>
      <ChatEmergencyNotice />

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-3">
          <h2 className="font-semibold">Nhắn cho phòng khám</h2>
          <Select value={chosen} onValueChange={setClinicId}>
            <SelectTrigger className="w-full" aria-label="Cơ sở">
              <SelectValue placeholder="Chọn cơ sở" />
            </SelectTrigger>
            <SelectContent>
              {clinics?.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={CHAT_TEXT_MAX}
            placeholder="Bạn cần phòng khám hỗ trợ gì?"
            aria-label="Nội dung tin nhắn"
          />
          <Button
            onClick={() => void start()}
            disabled={busy || !chosen || !text.trim()}
            className="self-start"
          >
            <MessageCircleIcon />
            {busy ? "Đang gửi..." : "Gửi tin nhắn"}
          </Button>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Cuộc trò chuyện</h2>
        {isLoading && <Skeleton className="h-20 rounded-2xl" />}
        {list?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Bạn chưa nhắn cho phòng khám nào.
          </p>
        )}
        {list?.map((conversation) => (
          <Link
            key={conversation.id}
            to={`/my-conversations/${conversation.id}`}
            className="bg-card hover:border-primary/40 flex items-center gap-3 rounded-2xl border p-4 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">
                  {conversation.clinicName}
                </p>
                {conversation.unread > 0 && (
                  <Badge>{conversation.unread} mới</Badge>
                )}
              </div>
              <p className="text-muted-foreground truncate text-sm">
                {conversation.lastSenderKind === "staff"
                  ? "Phòng khám: "
                  : "Bạn: "}
                {conversation.lastMessagePreview}
              </p>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {formatDateTime(conversation.lastMessageAt)}
            </span>
            <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
          </Link>
        ))}
      </section>
    </div>
  );
}

/** SRS 3.16.3 on the patient's side: one conversation, live. */
export function PortalConversationShow() {
  const id = Number(useParams().id);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: threadKey("own", id),
    queryFn: () => fetchThread<OwnConversation>("own", id),
    retry: threadRetry,
    enabled: Number.isFinite(id),
    // Live through the socket; the poll only covers a dropped connection.
    refetchInterval: 30_000,
  });
  const send = useChatSend("own", id);

  useEffect(
    () =>
      subscribe(MY_CONVERSATIONS, (body) => {
        if (
          (body as { conversationId?: number } | undefined)?.conversationId ===
          id
        )
          void refetch();
      }),
    [id, refetch]
  );

  const conversation = data?.conversation;
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/my-conversations">
          <ArrowLeftIcon />
          Tin nhắn
        </Link>
      </Button>
      <Card className="flex h-[calc(100svh-15rem)] min-h-[28rem] flex-col gap-0 overflow-hidden rounded-2xl py-0">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {conversation?.clinicName ?? "Phòng khám"}
            </p>
            <p className="text-muted-foreground text-xs">
              Trò chuyện riêng với nhân viên phòng khám
            </p>
          </div>
          {conversation?.clinicPhone && (
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${conversation.clinicPhone}`}>
                <PhoneIcon />
                {displayPhone(conversation.clinicPhone)}
              </a>
            </Button>
          )}
        </div>
        <div className="px-4 pt-3">
          <ChatEmergencyNotice />
        </div>
        {isLoading ? (
          <Skeleton className="m-4 flex-1" />
        ) : error ? (
          <p className="text-destructive m-4 text-sm">
            Không mở được cuộc trò chuyện này.
          </p>
        ) : (
          <ChatThread
            messages={data?.messages ?? []}
            loadImage={send.loadImage}
          />
        )}
        <ChatComposer
          onSend={send.sendText}
          onImage={send.sendImage}
          onReject={send.reject}
          disabled={!data}
        />
      </Card>
    </div>
  );
}
