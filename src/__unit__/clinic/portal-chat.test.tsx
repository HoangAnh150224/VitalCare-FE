/** FE-15 Conversation List / Start Conversation (patient portal): PortalConversations. Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { PortalConversations } from "@/features/clinic/conversations/portal";
import { api, notify, screen, sent, type Reply } from "./harness";

const clinicA = { id: "a", name: "VitalCare Hà Nội", address: null, phone: null, email: null, openingHours: [] };
const clinicB = { ...clinicA, id: "b", name: "VitalCare Đà Nẵng" };
const conv = {
  id: 3, clinicName: "VitalCare Hà Nội", aboutName: "Bé Na", unread: 2, lastSenderKind: "staff",
  lastMessagePreview: "Chị mang theo phiếu khám nhé", lastMessageAt: "2026-11-22T02:00:00Z",
};
const routes = (list: Reply, clinics = [clinicA], extra: Record<string, Reply> = {}) => ({
  "GET /my_conversations": list,
  "GET /public/clinics": { status: 200, body: clinics },
  ...extra,
});
const open = () => screen("/my-conversations", "/my-conversations", <PortalConversations />);

beforeEach(() => notify.open.mockClear());

describe("PortalConversations (/my-conversations) — Conversation List / Start Conversation", () => {
  it("PC1 each conversation: clinic, whom it is about, unread count, the last line and who wrote it", async () => {
    api(routes({ status: 200, body: [conv] }));
    open();
    expect(await view.findByText("2 mới")).toBeInTheDocument();
    expect(view.getByText(/· về Bé Na/)).toBeInTheDocument();
    expect(view.getByText(/Phòng khám: Chị mang theo phiếu khám nhé/)).toBeInTheDocument();
    expect(view.getByRole("link", { name: /VitalCare Hà Nội/ })).toHaveAttribute("href", "/my-conversations/3");
  });

  it("PC2 none yet says so; a list that could not load says that instead", async () => {
    api(routes({ status: 200, body: [] }));
    const { unmount } = open();
    expect(await view.findByText("Bạn chưa nhắn cho phòng khám nào.")).toBeInTheDocument();
    unmount();
    api(routes({ status: 500, body: { message: "down" } }));
    open();
    expect(await view.findByText("Không thể tải danh sách cuộc trò chuyện")).toBeInTheDocument();
    expect(view.queryByText("Bạn chưa nhắn cho phòng khám nào.")).toBeNull();
  });

  it("PC3 with one clinic it is chosen; the message is sent trimmed and the conversation opened", async () => {
    api(routes({ status: 200, body: [] }, [clinicA], {
      "POST /my_conversations": { status: 200, body: { conversation: { id: 9 }, messages: [] } },
    }));
    const user = userEvent.setup();
    open();
    const send = await view.findByRole("button", { name: "Gửi tin nhắn" });
    expect(send).toBeDisabled();
    await user.type(view.getByLabelText("Nội dung tin nhắn"), "  Cho em hỏi giờ khám  ");
    await user.click(send);
    await waitFor(() => expect(sent("POST", "/my_conversations")).toHaveLength(1));
    expect(sent("POST", "/my_conversations")[0].body).toEqual({ clinicId: "a", text: "Cho em hỏi giờ khám" });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/my-conversations/9"));
  });

  it("PC4 with several clinics one must be chosen before sending", async () => {
    api(routes({ status: 200, body: [] }, [clinicA, clinicB], {
      "POST /my_conversations": { status: 200, body: { conversation: { id: 10 }, messages: [] } },
    }));
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText("Nội dung tin nhắn"), "Xin chào");
    expect(view.getByRole("button", { name: "Gửi tin nhắn" })).toBeDisabled();
    await user.click(view.getByRole("combobox", { name: "Cơ sở" }));
    await user.click(await view.findByRole("option", { name: "VitalCare Đà Nẵng" }));
    await user.click(view.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() => expect(sent("POST", "/my_conversations")).toHaveLength(1));
    expect(sent("POST", "/my_conversations")[0].body).toEqual({ clinicId: "b", text: "Xin chào" });
  });

  it("PC5 a refused start is told in a toast; the text stays", async () => {
    api(routes({ status: 200, body: [] }, [clinicA], {
      "POST /my_conversations": { status: 429, body: { status: 429, message: "Too many conversations" } },
    }));
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText("Nội dung tin nhắn"), "Xin chào");
    await user.click(view.getByRole("button", { name: "Gửi tin nhắn" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
    expect(view.getByLabelText("Nội dung tin nhắn")).toHaveValue("Xin chào");
  });
});
