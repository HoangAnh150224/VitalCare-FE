import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheckIcon,
  CheckIcon,
  ImageIcon,
  ImagePlusIcon,
  Loader2Icon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import type { ChatLine } from "@/domains/chat/types";
import {
  CHAT_EMERGENCY_NOTICE,
  CHAT_IMAGE_ACCEPT,
  CHAT_IMAGE_MAX_BYTES,
  CHAT_TEXT_MAX,
} from "@/domains/chat/types";

/**
 * The parts every chat screen shares — the guest's, the patient's and the
 * clinic's — so the three read the same. Each screen brings its own way of
 * loading an image and of sending; nothing here talks to the API.
 */

/** BR-30: always on screen above the conversation, with no way to close it. */
export function ChatEmergencyNotice({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
        className
      )}
    >
      <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
      {CHAT_EMERGENCY_NOTICE}
    </p>
  );
}

/** Loads an image's bytes; each screen reaches its own endpoint with its own credentials. */
export type ImageLoader = (messageId: number) => Promise<Blob>;

/**
 * The messages, oldest at the top, scrolled to the newest whenever one
 * arrives. One's own on the right in the brand colour, the other side's on
 * the left with the writer's name.
 */
export function ChatThread({
  messages,
  loadImage,
  emptyText = "Chưa có tin nhắn nào.",
  className,
}: {
  messages: ChatLine[];
  loadImage: ImageLoader;
  emptyText?: string;
  className?: string;
}) {
  const bottom = useRef<HTMLDivElement | null>(null);
  const lastId = messages.at(-1)?.id;
  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4",
        className
      )}
      aria-live="polite"
    >
      {messages.length === 0 && (
        <p className="text-muted-foreground m-auto text-sm">{emptyText}</p>
      )}
      {messages.map((line) => (
        <div
          key={line.id}
          className={cn(
            "flex max-w-[85%] flex-col gap-1",
            line.mine ? "self-end items-end" : "self-start items-start"
          )}
        >
          {!line.mine && line.senderName && (
            <span className="text-muted-foreground px-1 text-xs">
              {line.senderName}
            </span>
          )}
          <div
            className={cn(
              "max-w-full rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap wrap-anywhere shadow-xs",
              line.mine
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted rounded-bl-md"
            )}
          >
            {line.image ? (
              <ChatImage id={line.id} load={loadImage} />
            ) : (
              line.text
            )}
          </div>
          <span className="text-muted-foreground flex items-center gap-1 px-1 text-[11px] tabular-nums">
            {formatDateTime(line.sentAt)}
            {line.mine &&
              (line.read ? (
                <span className="text-primary flex items-center gap-0.5">
                  <CheckCheckIcon className="size-3.5" />
                  Đã xem
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <CheckIcon className="size-3.5" />
                  Đã gửi
                </span>
              ))}
          </span>
        </div>
      ))}
      <div ref={bottom} />
    </div>
  );
}

/**
 * An image message, fetched with the reader's credentials and shown from an
 * object URL: an `<img src>` pointing at the API could not carry them.
 */
function ChatImage({ id, load }: { id: number; load: ImageLoader }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let created: string | null = null;
    let live = true;
    load(id)
      .then((blob) => {
        if (!live) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id, load]);

  if (failed) {
    return (
      <span className="flex items-center gap-1.5 text-xs opacity-80">
        <ImageIcon className="size-4" />
        Không tải được ảnh
      </span>
    );
  }
  if (!url)
    return (
      <Loader2Icon className="size-5 animate-spin" aria-label="Đang tải ảnh" />
    );
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Ảnh đính kèm" className="max-h-64 rounded-lg" />
    </a>
  );
}

/**
 * Where a message is written: Enter sends, Shift+Enter breaks the line. The
 * image button takes PNG or JPEG up to 5 MB, checked here before the API
 * checks it again.
 */
/** `true` sent; a string is why not, said beside the composer; `false` the caller said why itself. */
type SendResult = boolean | string;

export function ChatComposer({
  onSend,
  onImage,
  disabled,
  onReject,
  draftKey,
  placeholder = "Nhập tin nhắn...",
}: {
  onSend: (text: string) => Promise<SendResult>;
  onImage?: (file: File) => Promise<SendResult>;
  disabled?: boolean;
  /** Told why a picked image was refused before it was sent. */
  onReject?: (message: string) => void;
  /**
   * Keeps what is typed but not sent per conversation, so going to another one and back loses
   * nothing. Held in the query cache, which a sign-in clears: one account never sees another's.
   * The caller also keys the composer by conversation, so each starts from its own draft.
   */
  draftKey?: string;
  placeholder?: string;
}) {
  const queryClient = useQueryClient();
  const draft = ["chat-draft", draftKey ?? ""];
  // Only to keep the draft cached after the composer unmounts; the text itself lives in state.
  useQuery({ queryKey: draft, queryFn: () => "", enabled: false, staleTime: Infinity, gcTime: Infinity });
  const [text, setTextState] = useState(() => (draftKey && queryClient.getQueryData<string>(draft)) || "");
  const setText = (value: string) => {
    setTextState(value);
    if (draftKey) queryClient.setQueryData(draft, value);
  };
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const settle = (result: SendResult) => {
    setFailure(typeof result === "string" ? result : null);
    return result === true;
  };

  // What stops a second press, or Enter, from sending the same text twice. A ref, not `busy`:
  // two presses in one tick both still read the state from before the first.
  const sending = useRef(false);

  const send = async () => {
    const value = text.trim();
    if (!value || sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      if (settle(await onSend(value))) setText("");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file || !onImage) return;
    if (!CHAT_IMAGE_ACCEPT.split(",").includes(file.type)) {
      onReject?.("Chỉ gửi được ảnh PNG hoặc JPEG.");
      return;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      onReject?.("Ảnh tối đa 5 MB.");
      return;
    }
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      settle(await onImage(file));
    } finally {
      sending.current = false;
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t p-3">
      {failure && (
        <p role="alert" className="text-destructive flex items-start gap-1.5 text-xs">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Chưa gửi được: {failure}
            {text.trim() && " Nội dung vẫn còn trong ô nhập, bấm Gửi lại."}
          </span>
        </p>
      )}
      <div className="flex items-end gap-2">
        {onImage && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={CHAT_IMAGE_ACCEPT}
              className="hidden"
              onChange={(event) => void pick(event.target.files?.[0])}
              aria-label="Chọn ảnh"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || busy}
              onClick={() => fileRef.current?.click()}
              aria-label="Đính kèm ảnh"
            >
              <ImagePlusIcon />
            </Button>
          </>
        )}
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={CHAT_TEXT_MAX}
          placeholder={placeholder}
          aria-label="Tin nhắn"
          disabled={disabled}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button
          type="button"
          onClick={() => void send()}
          disabled={disabled || busy || !text.trim()}
          aria-label={failure && text.trim() ? "Gửi lại" : "Gửi"}
        >
          {busy ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          <span className="hidden sm:inline">{failure && text.trim() ? "Gửi lại" : "Gửi"}</span>
        </Button>
      </div>
    </div>
  );
}
