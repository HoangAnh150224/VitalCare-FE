import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { calls, clinicA, clinicB, mockApi, refine, refineMock, renderAt } from "./helpers";

vi.mock("@refinedev/core", () => refineMock());
const { GuestChatLauncher, openGuestChat } = await import("@/shared/components/chat/guest-chat");

const KEY = "vitalcare.guest-chat";
const thread = {
  conversation: { id: 9, clinicId: "a", clinicName: "VitalCare Test A", status: "open", unread: 0 },
  messages: [{ id: 1, senderKind: "guest", senderName: "Lan", mine: true, text: "Cho hỏi giờ khám", image: false, sentAt: "2026-10-30T03:00:00Z", read: false }],
};

const openPanel = async () => {
  renderAt("/", "/", <GuestChatLauncher />);
  await userEvent.click(screen.getByRole("button", { name: "Chat với phòng khám" }));
};

describe("GuestChatLauncher / GuestStartForm", () => {
  beforeEach(() => {
    refine.authenticated = false;
    refine.can = false;
    refine.notify = vi.fn();
  });

  it("CH1 opening the panel shows the not-an-emergency notice and the start form", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicA, clinicB] } });
    await openPanel();
    expect(await screen.findByRole("note")).toBeInTheDocument();
    expect(screen.getByLabelText("Họ tên")).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText("Nội dung tin nhắn")).toHaveAttribute("maxlength", "2000");
  });

  it("CH2 sending empty: four errors under the fields, nothing sent", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicA, clinicB] } });
    await openPanel();
    await userEvent.click(await screen.findByRole("button", { name: "Gửi tin nhắn" }));
    expect(screen.getByText("Chọn cơ sở.")).toBeInTheDocument();
    expect(screen.getByText("Nhập họ tên.")).toBeInTheDocument();
    expect(screen.getByText("Nhập số điện thoại để phòng khám liên hệ lại.")).toBeInTheDocument();
    expect(screen.getByText("Nhập nội dung tin nhắn.")).toBeInTheDocument();
    expect(calls.some((c) => c.init?.method === "POST")).toBe(false);
  });

  it("CH3 names and messages of only spaces count as empty", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicA] } });
    await openPanel();
    await userEvent.type(await screen.findByLabelText("Họ tên"), "   ");
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await userEvent.type(screen.getByLabelText("Nội dung tin nhắn"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    expect(screen.getByText("Nhập họ tên.")).toBeInTheDocument();
    expect(screen.getByText("Nhập nội dung tin nhắn.")).toBeInTheDocument();
    expect(screen.queryByText("Chọn cơ sở.")).toBeNull();
  });

  it("CH4 one clinic is picked by itself; a valid start is sent trimmed and remembered", async () => {
    mockApi({
      "/public/clinics": { status: 200, body: [clinicA] },
      "POST /public/chat": { status: 201, body: { conversation: thread.conversation, token: "tok" } },
      "/public/chat/9": { status: 200, body: thread },
    });
    await openPanel();
    await userEvent.type(await screen.findByLabelText("Họ tên"), "  Nguyễn Thị Lan ");
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await userEvent.type(screen.getByLabelText("Nội dung tin nhắn"), " Cho hỏi giờ khám ");
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(KEY) ?? "null")).toMatchObject({ id: 9, token: "tok" }));
    expect(typeof JSON.parse(localStorage.getItem(KEY)!).savedAt).toBe("number");
    const post = calls.find((c) => c.init?.method === "POST")!;
    expect(JSON.parse(String(post.init!.body))).toEqual({ clinicId: "a", name: "Nguyễn Thị Lan", phone: "0901234567", text: "Cho hỏi giờ khám" });
    expect(await screen.findByText("Cho hỏi giờ khám")).toBeInTheDocument();
  });

  it("CH5 a 422 from the API: Vietnamese message under the field and in a toast", async () => {
    mockApi({
      "/public/clinics": { status: 200, body: [clinicA] },
      "POST /public/chat": { status: 422, body: { message: "Validation failed", errors: { phone: "Give a valid phone number" } } },
    });
    await openPanel();
    await userEvent.type(await screen.findByLabelText("Họ tên"), "Lan");
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "12");
    await userEvent.type(screen.getByLabelText("Nội dung tin nhắn"), "hi");
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    expect(await screen.findByText("Số điện thoại không hợp lệ.")).toBeInTheDocument();
    expect(refine.notify).toHaveBeenCalledWith({ type: "error", message: "Số điện thoại không hợp lệ." });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("CH6 too many conversations: rate-limit toast", async () => {
    mockApi({
      "/public/clinics": { status: 200, body: [clinicA] },
      "POST /public/chat": { status: 409, body: { message: "Too many conversations have been started from this network; try again later" } },
    });
    await openPanel();
    await userEvent.type(await screen.findByLabelText("Họ tên"), "Lan");
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await userEvent.type(screen.getByLabelText("Nội dung tin nhắn"), "hi");
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() => expect(refine.notify).toHaveBeenCalledWith({
      type: "error", message: "Đã mở quá nhiều cuộc trò chuyện từ mạng này. Vui lòng thử lại sau.",
    }));
  });

  it("CH7 while sending the button is disabled", async () => {
    let release: (r: Response) => void = () => {};
    mockApi({ "/public/clinics": { status: 200, body: [clinicA] } });
    const base = globalThis.fetch;
    globalThis.fetch = vi.fn((url: string, init?: RequestInit) =>
      init?.method === "POST" ? new Promise<Response>((r) => { release = r; }) : base(url, init)) as unknown as typeof fetch;
    await openPanel();
    await userEvent.type(await screen.findByLabelText("Họ tên"), "Lan");
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await userEvent.type(screen.getByLabelText("Nội dung tin nhắn"), "hi");
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    expect(await screen.findByRole("button", { name: "Đang gửi..." })).toBeDisabled();
    await act(async () => release(new Response("{}", { status: 500 })));
  });

  it("CH8 a remembered conversation reopens with its token", async () => {
    localStorage.setItem(KEY, JSON.stringify({ id: 9, token: "tok", savedAt: Date.now() }));
    mockApi({ "/public/chat/9": { status: 200, body: thread } });
    await openPanel();
    expect(await screen.findByText("Cho hỏi giờ khám")).toBeInTheDocument();
    const read = calls.find((c) => c.url.endsWith("/public/chat/9"))!;
    expect((read.init!.headers as Record<string, string>)["X-Chat-Token"]).toBe("tok");
  });

  it("CH9 a token that no longer opens anything (404): forgotten, back to the form", async () => {
    localStorage.setItem(KEY, JSON.stringify({ id: 9, token: "old" }));
    mockApi({ "/public/clinics": { status: 200, body: [clinicA] } });
    await openPanel();
    expect(await screen.findByRole("button", { name: "Gửi tin nhắn" })).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("CH10 a broken stored value is ignored", async () => {
    localStorage.setItem(KEY, "{not json");
    mockApi({ "/public/clinics": { status: 200, body: [clinicA] } });
    await openPanel();
    expect(await screen.findByRole("button", { name: "Gửi tin nhắn" })).toBeInTheDocument();
  });

  it("CH11 signed in: pointed to their messages instead of the form", async () => {
    refine.authenticated = true;
    mockApi({});
    await openPanel();
    expect(screen.getByRole("link", { name: "Mở Tin nhắn" })).toHaveAttribute("href", "/my-conversations");
    expect(screen.queryByLabelText("Họ tên")).toBeNull();
  });

  it("CH12 openGuestChat(clinicId) opens the panel from anywhere", async () => {
    mockApi({ "/public/clinics": { status: 200, body: [clinicA, clinicB] } });
    renderAt("/", "/", <GuestChatLauncher />);
    expect(screen.queryByLabelText("Họ tên")).toBeNull();
    act(() => openGuestChat("b"));
    expect(await screen.findByLabelText("Họ tên")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    expect(screen.queryByText("Chọn cơ sở.")).toBeNull();
  });
});
