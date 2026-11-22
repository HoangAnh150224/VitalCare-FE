/** FE-15 Secure Support Chat, staff side: ConversationInbox. Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationInbox } from "@/features/clinic/conversations/inbox";
import { access, api, notify, screen, sent, type Reply } from "./harness";

// The live socket is not opened in a unit test; nudges are the server's job.
vi.mock("@/shared/api/live", () => ({ subscribe: () => () => undefined }));

const guest = {
  id: 3, clinicId: "a", clinicName: "VitalCare Hà Nội", kind: "guest", contactName: "Chị Lan", aboutCustomerId: null,
  aboutName: null, contactPhone: "+84912345678", status: "OPEN", lastMessageAt: "2026-11-22T02:00:00Z",
  lastMessagePreview: "Cho em hỏi giờ khám", lastSenderKind: "guest", unread: 2,
};
const caregiver = { ...guest, id: 4, kind: "caregiver", contactName: "Anh Minh", aboutName: "Bé Na", unread: 0,
  lastSenderKind: "staff", lastMessagePreview: "Dạ vâng", status: "CLOSED", contactPhone: null };
const line = { id: 1, senderKind: "guest", senderName: "Chị Lan", mine: false, text: "Cho em hỏi giờ khám", image: false, sentAt: "2026-11-22T02:00:00Z", read: true };

const routes = (extra: Record<string, Reply> = {}) => ({
  "GET /conversations*": { status: 200, body: [guest, caregiver] },
  "GET /conversations/clinics": { status: 200, body: [] },
  "GET /conversations/3": { status: 200, body: { conversation: guest, messages: [line] } },
  "GET /conversations/4": { status: 200, body: { conversation: caregiver, messages: [] } },
  ...extra,
}) as Record<string, Reply>;
const inbox = (path = "/conversations") =>
  screen(path, path === "/conversations" ? "/conversations" : "/conversations/show/:id", <ConversationInbox />);

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("ConversationInbox (/conversations) — Conversation List / Reply", () => {
  it("SI1 each conversation: contact, kind and whom it is about, unread count, the last line and who wrote it", async () => {
    api(routes());
    inbox();
    expect(await view.findByText("Chị Lan")).toBeInTheDocument();
    expect(view.getByText("2")).toBeInTheDocument();
    expect(view.getByText(/Người chăm sóc của Bé Na · Đã đóng/)).toBeInTheDocument();
    expect(view.getByText("Bạn: Dạ vâng")).toBeInTheDocument();
    expect(view.getByText("Chọn một hội thoại để xem và trả lời.")).toBeInTheDocument();
  });

  it("SI2 search is sent on Enter; Chưa đọc asks only unread ones", async () => {
    api(routes());
    const user = userEvent.setup();
    inbox();
    await user.type(await view.findByLabelText("Tìm hội thoại"), "Lan{Enter}");
    await waitFor(() => expect(sent("GET", "/conversations?").some((c) => /q=Lan/.test(c.path))).toBe(true));
    await user.click(view.getByRole("radio", { name: "Chưa đọc" }));
    await waitFor(() => expect(sent("GET", "/conversations?").some((c) => /read=unread/.test(c.path))).toBe(true));
  });

  it("SI3 boundary: no conversation says so", async () => {
    api(routes({ "GET /conversations*": { status: 200, body: [] } }));
    inbox();
    expect(await view.findByText("Không có hội thoại nào.")).toBeInTheDocument();
  });

  it("SI4 opening a conversation shows its messages and the contact's phone; a reply is sent trimmed", async () => {
    api(routes({ "POST /conversations/3/messages": { status: 200, body: { ...line, id: 2, senderKind: "staff", mine: true, text: "Dạ 7h ạ" } } }));
    const user = userEvent.setup();
    inbox("/conversations/show/3");
    expect(await view.findByRole("link", { name: /0912/ })).toHaveAttribute("href", "tel:+84912345678");
    await user.type(await view.findByLabelText("Tin nhắn"), "  Dạ 7h ạ  ");
    await user.click(view.getByRole("button", { name: "Gửi" }));
    await waitFor(() => expect(sent("POST", "/conversations/3/messages")).toHaveLength(1));
    expect(sent("POST", "/conversations/3/messages")[0].body).toEqual({ text: "Dạ 7h ạ" });
    expect(await view.findByText("Dạ 7h ạ")).toBeInTheDocument();
  });

  it("SI5 a refused reply is said beside the composer and the text is kept", async () => {
    api(routes({ "POST /conversations/3/messages": { status: 409, body: { status: 409, message: "This conversation is closed" } } }));
    const user = userEvent.setup();
    inbox("/conversations/show/3");
    await user.type(await view.findByLabelText("Tin nhắn"), "Xin chào");
    await user.click(view.getByRole("button", { name: "Gửi" }));
    expect(await view.findByRole("alert")).toHaveTextContent(/Chưa gửi được/);
    expect(view.getByLabelText("Tin nhắn")).toHaveValue("Xin chào");
  });

  it("SI6 closing an open conversation and reopening a closed one", async () => {
    api(routes({ "POST /conversations/3/close": { status: 200, body: {} }, "POST /conversations/4/reopen": { status: 200, body: {} } }));
    const user = userEvent.setup();
    const { unmount } = inbox("/conversations/show/3");
    await user.click(await view.findByRole("button", { name: /Đóng hội thoại/ }));
    await waitFor(() => expect(sent("POST", "/conversations/3/close")).toHaveLength(1));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã đóng hội thoại" })));
    unmount();
    inbox("/conversations/show/4");
    await user.click(await view.findByRole("button", { name: /Mở lại/ }));
    await waitFor(() => expect(sent("POST", "/conversations/4/reopen")).toHaveLength(1));
  });

  it("SI7 without the right to reply the conversation is only read", async () => {
    access.can = false;
    api(routes());
    inbox("/conversations/show/3");
    expect(await view.findByText("Bạn chỉ có quyền xem hội thoại này.")).toBeInTheDocument();
    expect(view.queryByLabelText("Tin nhắn")).toBeNull();
  });

  it("SI8 a conversation that cannot be opened says so", async () => {
    api(routes({ "GET /conversations/3": { status: 404, body: { message: "not found" } } }));
    inbox("/conversations/show/3");
    expect(await view.findByText("Không mở được hội thoại này.")).toBeInTheDocument();
  });
});
