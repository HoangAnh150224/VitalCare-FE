/** FE-17 Add Healthcare Staff (StaffCreate) and FE-13 Notification Details (NotificationShow). Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { StaffCreate } from "@/features/clinic/staff";
import { NotificationShow } from "@/features/notifications";
import { applyAuthorities } from "@/shared/api/session";
import { api, notify, screen, sent } from "./harness";

beforeEach(() => notify.open.mockClear());

describe("StaffCreate (/employees/create) — Add Healthcare Staff", () => {
  const open = () => {
    applyAuthorities({ roles: ["CLINIC_ADMIN"], permissions: ["employees:write"], version: "1" });
    return screen("/employees/create", "/employees/create", <StaffCreate />);
  };

  it("ST1 phone, full name and password are required", async () => {
    api({ "GET /clinics*": { status: 200, body: [] } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Tạo nhân viên" }));
    expect(await view.findByText("Vui lòng nhập số điện thoại")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập họ tên")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập mật khẩu")).toBeInTheDocument();
    expect(sent("POST", "/employees")).toHaveLength(0);
  });

  it("ST2 a phone that is not Vietnamese and a password under 8 characters are refused", async () => {
    api({ "GET /clinics*": { status: 200, body: [] } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText(/Số điện thoại/), "12345");
    await user.type(view.getByPlaceholderText("Nguyễn Văn A"), "Nguyễn Văn A");
    await user.type(view.getByPlaceholderText("Nhập mật khẩu ban đầu"), "1234567");
    await user.click(view.getByRole("button", { name: "Tạo nhân viên" }));
    expect(await view.findByText("Nhập số điện thoại Việt Nam, ví dụ 0901234567")).toBeInTheDocument();
    expect(view.getByText("Tối thiểu 8 ký tự")).toBeInTheDocument();
  });

  it("ST3 a doctor is created at the creator's clinic (no clinic sent) and opened", async () => {
    api({ "GET /clinics*": { status: 200, body: [] }, "POST /employees": { status: 200, body: { id: 40 } } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText(/Số điện thoại/), "0901234567");
    await user.type(view.getByPlaceholderText("Nguyễn Văn A"), "BS. Nguyễn An");
    await user.type(view.getByPlaceholderText("Nhập mật khẩu ban đầu"), "Matkhau#2026");
    await user.click(view.getByRole("button", { name: "Tạo nhân viên" }));
    await waitFor(() => expect(sent("POST", "/employees")).toHaveLength(1));
    expect(sent("POST", "/employees")[0].body).toMatchObject({
      phone: "0901234567", fullName: "BS. Nguyễn An", password: "Matkhau#2026", staffType: "doctor", clinicId: null,
    });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/employees/show/40"));
  });

  it("ST4 a licence number already held is said under its field only", async () => {
    api({
      "GET /clinics*": { status: 200, body: [] },
      "POST /employees": { status: 422, body: { status: 422, message: "Validation failed", errors: { licenseNo: "Số chứng chỉ hành nghề này đã được dùng." } } },
    });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText(/Số điện thoại/), "0901234567");
    await user.type(view.getByPlaceholderText("Nguyễn Văn A"), "BS. Nguyễn An");
    await user.type(view.getByPlaceholderText("Nhập mật khẩu ban đầu"), "Matkhau#2026");
    await user.type(view.getByPlaceholderText("Nhập số chứng chỉ hành nghề"), "CCHN-1");
    await user.click(view.getByRole("button", { name: "Tạo nhân viên" }));
    expect(await view.findByText("Số chứng chỉ hành nghề này đã được dùng.")).toBeInTheDocument();
    expect(notify.open.mock.calls.filter(([n]) => n?.type === "error")).toHaveLength(0);
  });

  it("ST5 a system administrator can only create a clinic administrator, at a chosen clinic", async () => {
    applyAuthorities({ roles: ["ADMIN"], permissions: ["clinics:write"], version: "2" });
    api({ "GET /clinics*": { status: 200, body: [] } });
    screen("/employees/create", "/employees/create", <StaffCreate />);
    expect(await view.findByRole("button", { name: "Tạo quản trị phòng khám" })).toBeInTheDocument();
    expect(view.getByText("Chọn phòng khám")).toBeInTheDocument();
  });
});

const note = (read: boolean) => ({
  id: 8, level: "WARNING", type: "device", title: "Thiết bị VC-BAND-01 mất kết nối", body: "Hãy kiểm tra pin.",
  link: "/my-devices", read, status: "SENT", createdAt: "2026-11-22T01:00:00Z", sentAt: "2026-11-22T01:00:00Z", readAt: null,
});

describe("NotificationShow (/notifications/show/:id) — Notification Details", () => {
  const open = () => screen("/notifications/show/8", "/notifications/show/:id", <NotificationShow />);

  it("NT1 level, type, title, content and the link to what it is about", async () => {
    api({ "GET /notifications/8": { status: 200, body: note(true) }, "POST /notifications/8/read": { status: 200, body: {} } });
    open();
    expect(await view.findByText("Thiết bị VC-BAND-01 mất kết nối")).toBeInTheDocument();
    expect(view.getByText("Cảnh báo")).toBeInTheDocument();
    expect(view.getByText("Thiết bị")).toBeInTheDocument();
    expect(view.getByText("Hãy kiểm tra pin.")).toBeInTheDocument();
    expect(view.getByRole("link", { name: /Xem chi tiết/ })).toHaveAttribute("href", "/my-devices");
  });

  it("NT2 opening an unread notification marks it read; a read one is not marked again", async () => {
    api({ "GET /notifications/8": { status: 200, body: note(false) }, "POST /notifications/8/read": { status: 200, body: {} } });
    const { unmount } = open();
    await waitFor(() => expect(sent("POST", "/notifications/8/read")).toHaveLength(1));
    unmount();
    api({ "GET /notifications/8": { status: 200, body: note(true) } });
    open();
    await view.findByText("Thiết bị VC-BAND-01 mất kết nối");
    expect(sent("POST", "/notifications/8/read")).toHaveLength(0);
  });

  it("NT3 another account's or a missing notification says it is not found", async () => {
    api({});
    open();
    expect(await view.findByText("Không tìm thấy thông báo này.")).toBeInTheDocument();
  });
});
