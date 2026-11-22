/** FE-16 Create First-Aid Content: FirstAidCreate. Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { FirstAidCreate } from "@/features/clinic/first-aid";
import { api, notify, screen, sent } from "./harness";

const open = () => screen("/first-aid-articles/create", "/first-aid-articles/create", <FirstAidCreate />);

async function fill(user: ReturnType<typeof userEvent.setup>, video = "") {
  await user.type(await view.findByPlaceholderText("Khó thở"), "Khó thở");
  await user.type(view.getByPlaceholderText("Tóm tắt ngắn gọn, dễ hiểu cho ứng dụng bệnh nhân."), "Ngồi thẳng, nới lỏng áo");
  await user.type(view.getByPlaceholderText(/Nhập nội dung hướng dẫn tại đây/), "Bước 1: giữ bình tĩnh");
  await user.type(view.getByPlaceholderText("Dấu hiệu nào thì gọi 115 ngay."), "Môi tím tái");
  if (video) await user.type(view.getByPlaceholderText(/drive.google.com/), video);
}

beforeEach(() => notify.open.mockClear());

describe("FirstAidCreate (/first-aid-articles/create) — Create First-Aid Content", () => {
  it("FC1 title, summary, content and the emergency warning are required", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Lưu nháp" }));
    expect(await view.findByText("Nhập tiêu đề")).toBeInTheDocument();
    expect(view.getByText("Nhập tóm tắt")).toBeInTheDocument();
    expect(view.getByText("Nhập nội dung hướng dẫn")).toBeInTheDocument();
    expect(view.getByText("Nhập cảnh báo khẩn cấp")).toBeInTheDocument();
    expect(sent("POST", "/first_aid_articles")).toHaveLength(0);
  });

  it("FC2 only a Google Drive or YouTube link is taken as the video", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await fill(user, "https://example.com/video.mp4");
    await user.click(view.getByRole("button", { name: "Lưu nháp" }));
    expect(await view.findByText("Chỉ nhận link video Google Drive hoặc YouTube.")).toBeInTheDocument();
    expect(sent("POST", "/first_aid_articles")).toHaveLength(0);
  });

  it("FC3 the preview follows what is typed", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("Khó thở"), "Bỏng nhẹ");
    expect((await view.findAllByText("Bỏng nhẹ")).length).toBeGreaterThan(0);
  });

  it("FC4 Lưu nháp creates the draft and opens it, without submitting it", async () => {
    api({ "POST /first_aid_articles": { status: 200, body: { id: 31 } } });
    const user = userEvent.setup();
    open();
    await fill(user, "https://youtu.be/dQw4w9WgXcQ");
    await user.click(view.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(sent("POST", "/first_aid_articles")).toHaveLength(1));
    expect(sent("POST", "/first_aid_articles")[0].body).toEqual({
      title: "Khó thở", category: "general", summary: "Ngồi thẳng, nới lỏng áo", body: "Bước 1: giữ bình tĩnh",
      emergencyWarning: "Môi tím tái", videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/first-aid-articles/show/31"));
    expect(sent("POST", "/first_aid_articles/31/submit")).toHaveLength(0);
  });

  it("FC5 Lưu & gửi duyệt saves, then sends it for review", async () => {
    api({
      "POST /first_aid_articles": { status: 200, body: { id: 32 } },
      "POST /first_aid_articles/32/submit": { status: 200, body: { id: 32, status: "pending_review" } },
    });
    const user = userEvent.setup();
    open();
    await fill(user);
    await user.click(view.getByRole("button", { name: "Lưu & gửi duyệt" }));
    await waitFor(() => expect(sent("POST", "/first_aid_articles/32/submit")).toHaveLength(1));
    expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã lưu và gửi duyệt" }));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/first-aid-articles/show/32"));
  });

  it("FC6 saved but the review request refused: the reason is told, the draft is still opened", async () => {
    api({
      "POST /first_aid_articles": { status: 200, body: { id: 33 } },
      "POST /first_aid_articles/33/submit": { status: 409, body: { message: "boom" } },
    });
    const user = userEvent.setup();
    open();
    await fill(user);
    await user.click(view.getByRole("button", { name: "Lưu & gửi duyệt" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/first-aid-articles/show/33"));
  });
});
