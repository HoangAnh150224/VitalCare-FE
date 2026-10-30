/**
 * Support chat (SRS 3.16) between a clinic and the people writing to it:
 * customers signed in, and guests holding a token for their conversation.
 */

export type ChatSenderKind = "guest" | "customer" | "staff";
export type ConversationStatus = "OPEN" | "CLOSED";

/** One message, from the reader's side. */
export type ChatLine = {
  id: number;
  senderKind: ChatSenderKind;
  senderName: string | null;
  /** Written by the side reading it. */
  mine: boolean;
  text: string | null;
  /** An image, fetched from the conversation's `images/{id}` endpoint. */
  image: boolean;
  sentAt: string;
  /** For one's own message: the other side has opened the conversation since. */
  read: boolean;
};

/** A conversation as its customer or guest sees it. */
export type OwnConversation = {
  id: number;
  clinicId: string;
  clinicName: string | null;
  clinicPhone: string | null;
  status: ConversationStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastSenderKind: ChatSenderKind | null;
  unread: number;
};

/** A conversation in the clinic's inbox. */
export type InboxConversation = {
  id: number;
  clinicId: string;
  clinicName: string | null;
  kind: "guest" | "customer";
  contactName: string | null;
  contactPhone: string | null;
  status: ConversationStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastSenderKind: ChatSenderKind | null;
  unread: number;
  _can?: { read?: boolean; write?: boolean };
};

export type ChatThread<C> = { conversation: C; messages: ChatLine[] };

export type GuestStarted = { conversation: OwnConversation; token: string };

/** BR-30: shown on every chat screen, and nothing can hide it. */
export const CHAT_EMERGENCY_NOTICE =
  "Trò chuyện không dùng cho tình huống khẩn cấp. Nếu nguy hiểm đến tính mạng, hãy gọi 115 ngay.";

export const CHAT_IMAGE_ACCEPT = "image/png,image/jpeg";
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_TEXT_MAX = 2000;

export const CHAT_KIND_LABELS: Record<InboxConversation["kind"], string> = {
  guest: "Khách vãng lai",
  customer: "Bệnh nhân",
};

/** The API's chat messages, said again in Vietnamese; matched by how they start. */
const MESSAGES: [string, string][] = [
  [
    "Too many conversations have been started from this network",
    "Đã mở quá nhiều cuộc trò chuyện từ mạng này. Vui lòng thử lại sau.",
  ],
  [
    "Too many messages from this network",
    "Gửi quá nhiều tin nhắn. Vui lòng đợi vài phút.",
  ],
  ["Give a valid phone number", "Số điện thoại không hợp lệ."],
  [
    "Give a phone number the clinic can call back",
    "Nhập số điện thoại để phòng khám liên hệ lại.",
  ],
  ["Give your name", "Nhập họ tên."],
  ["The name must be at most", "Họ tên tối đa 100 ký tự."],
  ["Pick a clinic", "Chọn cơ sở."],
  ["Pick one of the clinics", "Chọn một cơ sở trong danh sách."],
  [
    "That clinic is not taking messages",
    "Cơ sở này tạm thời không nhận tin nhắn.",
  ],
  ["Write a message", "Nhập nội dung tin nhắn."],
  ["A message must be at most", "Tin nhắn tối đa 2.000 ký tự."],
  ["An image can be at most 5 MB", "Ảnh tối đa 5 MB."],
  ["Only PNG and JPEG images are accepted", "Chỉ gửi được ảnh PNG hoặc JPEG."],
  [
    "The file's content does not match its type",
    "Nội dung file không đúng định dạng ảnh.",
  ],
  ["Choose a file", "Chọn một ảnh."],
  [
    "Conversation with id",
    "Không tìm thấy cuộc trò chuyện. Có thể nó đã bị xoá.",
  ],
];

export function translateChatMessage(message: string): string {
  return (
    MESSAGES.find(([prefix]) => message.startsWith(prefix))?.[1] ?? message
  );
}

/** The error as one Vietnamese sentence: a 422's field message first, else the message. */
export function chatErrorText(
  error:
    | { message?: string; errors?: Record<string, unknown> }
    | null
    | undefined
) {
  const field = error?.errors
    ? Object.values(error.errors).find((value) => typeof value === "string")
    : undefined;
  const message = (field as string | undefined) ?? error?.message;
  return message
    ? translateChatMessage(message)
    : "Không gửi được. Vui lòng thử lại.";
}
