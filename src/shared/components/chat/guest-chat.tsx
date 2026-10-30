import { useIsAuthenticated, useNotification } from "@refinedev/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleIcon } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";

import {
  guestChat,
  publicGet,
  publicRetry,
  type PublicApiError,
} from "@/shared/api/public";
import {
  ChatComposer,
  ChatEmergencyNotice,
  ChatThread,
} from "@/shared/components/chat/chat";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Textarea } from "@/shared/ui/textarea";
import type {
  ChatLine,
  ChatThread as Thread,
  GuestStarted,
  OwnConversation,
} from "@/domains/chat/types";
import { CHAT_TEXT_MAX, chatErrorText } from "@/domains/chat/types";
import type { PublicClinic } from "@/domains/public-site/types";

/** Where a guest's conversation is remembered: in this browser only, so they can come back to it. */
const STORAGE_KEY = "vitalcare.guest-chat";
/** Asks any page to open the chat, optionally on one clinic: `openGuestChat(clinicId)`. */
const OPEN_EVENT = "vitalcare:open-chat";

type Session = { id: number; token: string };

const readSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed &&
      typeof parsed.id === "number" &&
      typeof parsed.token === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const writeSession = (session: Session | null) => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the conversation lasts until the tab closes.
  }
};

export function openGuestChat(clinicId?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { clinicId } }));
}

/**
 * "Chat với phòng khám" for somebody who has not signed in (the guest use
 * case): a round button in the corner, opening a panel where they give their
 * name and number and write to a clinic. The conversation is kept in this
 * browser by its token; while the panel is open it is re-read every five
 * seconds, since a guest has no live connection. Somebody signed in is sent
 * to their own messages instead.
 */
export function GuestChatLauncher() {
  const [open, setOpen] = useState(false);
  const [clinicId, setClinicId] = useState<string | undefined>();

  useEffect(() => {
    const onOpen = (event: Event) => {
      setClinicId(
        (event as CustomEvent<{ clinicId?: string }>).detail?.clinicId
      );
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 h-12 rounded-full px-5 shadow-lg sm:right-6 sm:bottom-6"
      >
        <MessageCircleIcon />
        Chat với phòng khám
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Chat với phòng khám</SheetTitle>
            <SheetDescription>
              Phòng khám trả lời trong giờ làm việc.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pt-3">
            <ChatEmergencyNotice />
          </div>
          {open && <GuestChatBody preferredClinicId={clinicId} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function GuestChatBody({ preferredClinicId }: { preferredClinicId?: string }) {
  const { data: auth } = useIsAuthenticated();
  const [session, setSession] = useState<Session | null>(readSession);

  if (auth?.authenticated) {
    return (
      <div className="flex flex-col gap-3 p-4 text-sm">
        <p>
          Bạn đã đăng nhập. Tin nhắn với phòng khám nằm trong mục Tin nhắn của
          tài khoản.
        </p>
        <Button asChild>
          <Link to="/my-conversations">Mở Tin nhắn</Link>
        </Button>
      </div>
    );
  }
  if (!session) {
    return (
      <GuestStartForm
        preferredClinicId={preferredClinicId}
        onStarted={(next) => {
          writeSession(next);
          setSession(next);
        }}
      />
    );
  }
  return (
    <GuestConversation
      session={session}
      onLost={() => {
        writeSession(null);
        setSession(null);
      }}
    />
  );
}

function GuestStartForm({
  preferredClinicId,
  onStarted,
}: {
  preferredClinicId?: string;
  onStarted: (session: Session) => void;
}) {
  const { data: clinics } = useQuery({
    queryKey: ["public", "clinics"],
    queryFn: () => publicGet<PublicClinic[]>("clinics"),
    retry: publicRetry,
    staleTime: 60_000,
  });
  const [clinicId, setClinicId] = useState(preferredClinicId ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { open } = useNotification();
  const chosen = clinicId || (clinics?.length === 1 ? clinics[0].id : "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const missing: Record<string, string> = {};
    if (!chosen) missing.clinicId = "Chọn cơ sở.";
    if (!name.trim()) missing.name = "Nhập họ tên.";
    if (!phone.trim())
      missing.phone = "Nhập số điện thoại để phòng khám liên hệ lại.";
    if (!text.trim()) missing.text = "Nhập nội dung tin nhắn.";
    setErrors(missing);
    if (Object.keys(missing).length) return;
    setBusy(true);
    try {
      const started = await guestChat.start<GuestStarted>({
        clinicId: chosen,
        name: name.trim(),
        phone,
        text: text.trim(),
      });
      onStarted({ id: started.conversation.id, token: started.token });
    } catch (error) {
      const failure = error as PublicApiError;
      const fieldErrors: Record<string, string> = {};
      for (const [field, message] of Object.entries(failure.errors ?? {})) {
        if (typeof message === "string")
          fieldErrors[field] = chatErrorText({ message });
      }
      setErrors(fieldErrors);
      open?.({ type: "error", message: chatErrorText(failure) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 overflow-y-auto p-4"
      noValidate
    >
      <p className="text-muted-foreground text-sm">
        Để lại tên và số điện thoại, phòng khám sẽ trả lời tại đây hoặc gọi lại
        cho bạn.
      </p>
      <Field label="Cơ sở" error={errors.clinicId}>
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
      </Field>
      <Field label="Họ tên" error={errors.name}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          aria-label="Họ tên"
        />
      </Field>
      <Field label="Số điện thoại" error={errors.phone}>
        <Input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          placeholder="0901234567"
          aria-label="Số điện thoại"
        />
      </Field>
      <Field label="Tin nhắn" error={errors.text}>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          maxLength={CHAT_TEXT_MAX}
          placeholder="Bạn cần phòng khám hỗ trợ gì?"
          aria-label="Nội dung tin nhắn"
        />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Đang gửi..." : "Gửi tin nhắn"}
      </Button>
      <p className="text-muted-foreground text-xs">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Đăng nhập
        </Link>{" "}
        để xem lại tin nhắn trên mọi thiết bị.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function GuestConversation({
  session,
  onLost,
}: {
  session: Session;
  onLost: () => void;
}) {
  const queryClient = useQueryClient();
  const { open } = useNotification();
  const key = ["guest-chat", session.id];
  const { data, error } = useQuery({
    queryKey: key,
    queryFn: () =>
      guestChat.thread<Thread<OwnConversation>>(session.id, session.token),
    refetchInterval: 5_000,
    retry: (failures, failure) =>
      (failure as unknown as PublicApiError).status !== 404 && failures < 2,
  });

  // The token no longer opens anything (the conversation was removed): start afresh.
  useEffect(() => {
    if ((error as unknown as PublicApiError | null)?.status === 404) onLost();
  }, [error, onLost]);

  const append = (line: ChatLine) =>
    queryClient.setQueryData<Thread<OwnConversation>>(key, (thread) =>
      thread ? { ...thread, messages: [...thread.messages, line] } : thread
    );

  const fail = (failure: unknown) => {
    open?.({
      type: "error",
      message: chatErrorText(failure as PublicApiError),
    });
    return false;
  };

  const loadImage = useCallback(
    (messageId: number) =>
      guestChat.loadImage(session.id, session.token, messageId),
    [session.id, session.token]
  );

  return (
    <>
      <div className="text-muted-foreground flex items-center justify-between gap-2 px-4 pt-3 text-xs">
        <span className="truncate">{data?.conversation.clinicName}</span>
        <button
          type="button"
          className="text-primary shrink-0 hover:underline"
          onClick={onLost}
        >
          Cuộc trò chuyện mới
        </button>
      </div>
      <ChatThread
        messages={data?.messages ?? []}
        loadImage={loadImage}
        emptyText="Đang tải..."
      />
      <ChatComposer
        onSend={(text) =>
          guestChat
            .send<ChatLine>(session.id, session.token, text)
            .then((line) => {
              append(line);
              return true;
            }, fail)
        }
        onImage={(file) =>
          guestChat
            .image<ChatLine>(session.id, session.token, file)
            .then((line) => {
              append(line);
              return true;
            }, fail)
        }
        onReject={(message) => open?.({ type: "error", message })}
      />
    </>
  );
}
