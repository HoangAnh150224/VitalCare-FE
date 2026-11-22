import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { calls, mockApi, refine, refineMock, renderAt } from "./helpers";

vi.mock("@refinedev/core", () => refineMock());
// The OTP input asks where the caret is on screen; jsdom has no layout.
(document as any).elementFromPoint = () => null;
vi.mock("@/shared/components/layout/breadcrumb", () => ({ Breadcrumb: () => null }));

const { ForgotPasswordForm } = await import("@/features/identity/components/forgot-password-form");
const { Forbidden } = await import("@/shared/components/layout/forbidden");
const { Profile } = await import("@/features/identity/profile");

// ---------------------------------------------------------------- Forgot Password / Reset Password
describe("ForgotPasswordForm (/forgot-password)", () => {
  const show = () => renderAt("/forgot-password", "/forgot-password", <ForgotPasswordForm />);
  const sendCode = async () => {
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "0912345678");
    fireEvent.submit(screen.getByRole("button", { name: "Gửi mã khôi phục" }).closest("form")!);
    await screen.findByText("Nhập mã khôi phục");
  };
  const typeCode = async (code: string) => {
    const box = screen.getByLabelText("Mã khôi phục");
    await userEvent.type(box, code);
    fireEvent.submit(screen.getByRole("button", { name: "Tiếp tục" }).closest("form")!);
  };

  beforeEach(() => {
    mockApi({
      "POST /auth/password-reset/otp": { status: 200, body: { expiresIn: 300, resendAfter: 60 } },
      "POST /auth/password-reset/otp/check": { status: 200, body: { valid: true } },
      "POST /auth/password-reset": { status: 200, body: { success: true } },
    });
  });

  it("FP1 step 1: phone field, send button and a way back to sign-in", () => {
    show();
    expect(screen.getByText("Khôi phục mật khẩu")).toBeInTheDocument();
    expect(screen.getByLabelText("Số điện thoại")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi mã khôi phục" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về đăng nhập" })).toHaveAttribute("href", "/login");
  });

  it("FP2 sending the code: POST /otp with the phone, then the code step with a 60s resend countdown", async () => {
    show();
    await sendCode();
    expect(calls[0].url).toMatch(/\/auth\/password-reset\/otp$/);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ phone: "0912345678" });
    expect(screen.getByRole("button", { name: /Gửi lại mã sau 60s/ })).toBeDisabled();
  });

  it("FP3 asked again too soon (409): Vietnamese wait message, stays on step 1", async () => {
    mockApi({ "POST /auth/password-reset/otp": { status: 409, body: { message: "Please wait 40 seconds before asking for another code" } } });
    show();
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "0912345678");
    fireEvent.submit(screen.getByRole("button", { name: "Gửi mã khôi phục" }).closest("form")!);
    expect(await screen.findByText(/Vừa gửi mã cho số này/)).toBeInTheDocument();
    expect(screen.queryByText("Nhập mã khôi phục")).not.toBeInTheDocument();
  });

  it("RP1 wrong code (422 on otp): stays on the code step with a Vietnamese message", async () => {
    show();
    await sendCode();
    mockApi({ "POST /auth/password-reset/otp/check": { status: 422, body: { message: "Validation failed", errors: { otp: "The code is incorrect or has expired" } } } });
    await typeCode("000000");
    expect(await screen.findByText(/Mã xác thực không đúng hoặc đã hết hạn/)).toBeInTheDocument();
    expect(screen.queryByText("Đặt mật khẩu mới")).not.toBeInTheDocument();
  });

  it("RP2 right code then mismatching passwords: no reset request", async () => {
    show();
    await sendCode();
    await typeCode("123456");
    await screen.findByText("Đặt mật khẩu mới");
    const before = calls.length;
    await userEvent.type(screen.getByLabelText("Mật khẩu mới"), "NewPassw0rd!");
    await userEvent.type(screen.getByLabelText("Xác nhận mật khẩu"), "Different1!");
    fireEvent.submit(screen.getByRole("button", { name: "Đặt lại mật khẩu" }).closest("form")!);
    expect(await screen.findByText("Hai mật khẩu không khớp.")).toBeInTheDocument();
    expect(calls.length).toBe(before);
  });

  it("RP3 full flow: POST /password-reset with phone, code and new password, then Thành công", async () => {
    show();
    await sendCode();
    await typeCode("123456");
    await screen.findByText("Đặt mật khẩu mới");
    await userEvent.type(screen.getByLabelText("Mật khẩu mới"), "NewPassw0rd!");
    await userEvent.type(screen.getByLabelText("Xác nhận mật khẩu"), "NewPassw0rd!");
    fireEvent.submit(screen.getByRole("button", { name: "Đặt lại mật khẩu" }).closest("form")!);
    expect(await screen.findByText("Thành công")).toBeInTheDocument();
    const last = calls[calls.length - 1];
    expect(last.url).toMatch(/\/auth\/password-reset$/);
    expect(JSON.parse(String(last.init?.body))).toEqual({ phone: "0912345678", otp: "123456", newPassword: "NewPassw0rd!" });
    expect(screen.getByText(/Mọi phiên đăng nhập cũ đã kết thúc/)).toBeInTheDocument();
  });

  it("RP4 the code expired before saving: back to the code step", async () => {
    show();
    await sendCode();
    await typeCode("123456");
    await screen.findByText("Đặt mật khẩu mới");
    mockApi({ "POST /auth/password-reset": { status: 422, body: { message: "Validation failed", errors: { otp: "The code is incorrect or has expired" } } } });
    await userEvent.type(screen.getByLabelText("Mật khẩu mới"), "NewPassw0rd!");
    await userEvent.type(screen.getByLabelText("Xác nhận mật khẩu"), "NewPassw0rd!");
    fireEvent.submit(screen.getByRole("button", { name: "Đặt lại mật khẩu" }).closest("form")!);
    expect(await screen.findByText("Nhập mã khôi phục")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- Access Denied Page
describe("Forbidden — Access Denied Page", () => {
  beforeEach(() => { refine.go = vi.fn(); });

  it("AD1 says the page exists but the role lacks the permission, and whom to ask", () => {
    renderAt("/users", "/users", <Forbidden resource="users" />);
    expect(screen.getByRole("heading", { name: "Bạn không có quyền truy cập trang này" })).toBeInTheDocument();
    expect(screen.getByText(/Hãy liên hệ quản trị viên nếu bạn cần quyền này/)).toBeInTheDocument();
  });

  it("AD2 without a resource name: generic sentence", () => {
    renderAt("/x", "/x", <Forbidden />);
    expect(screen.getByText(/Các vai trò của bạn không có quyền xem trang này/)).toBeInTheDocument();
  });

  it("AD3 the button goes back to the overview", async () => {
    renderAt("/users", "/users", <Forbidden resource="users" />);
    await userEvent.click(screen.getByRole("button", { name: "Về trang Tổng quan" }));
    expect(refine.go).toHaveBeenCalledWith({ to: "/" });
  });
});

// ---------------------------------------------------------------- User Profile / Change Password
describe("Profile (/profile) — User Profile and Change Password", () => {
  beforeEach(() => {
    refine.identity = { fullName: "BS. Nguyễn Minh Khoa", phone: "+84900000011" };
    refine.customMutate = vi.fn();
    refine.customPending = false;
    refine.notify = vi.fn();
    refine.logout = vi.fn();
  });
  const show = () => renderAt("/profile", "/profile", <Profile />);
  const fill = async (current: string, next: string, confirm: string) => {
    if (current) await userEvent.type(screen.getByLabelText("Mật khẩu hiện tại"), current);
    if (next) await userEvent.type(screen.getByLabelText("Mật khẩu mới"), next);
    if (confirm) await userEvent.type(screen.getByLabelText("Nhập lại mật khẩu mới"), confirm);
  };

  it("PR1 shows the signed-in account's name and phone, read-only", () => {
    show();
    expect(screen.getAllByText("BS. Nguyễn Minh Khoa").length).toBeGreaterThan(0);
    expect(screen.getByText(/Hãy nhờ quản trị viên nếu bạn muốn thay đổi các thông tin này/)).toBeInTheDocument();
  });

  it("CP1 confirmation differs: pressing the button says so under the field, nothing is sent", async () => {
    show();
    await fill("OldPassw0rd!", "NewPassw0rd!", "Other1234!");
    await userEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(screen.getByText("Hai mật khẩu không khớp nhau.")).toBeInTheDocument();
    expect(refine.customMutate).not.toHaveBeenCalled();
  });

  it("CP2 new password under 8 characters: pressing the button says why, nothing is sent", async () => {
    show();
    await fill("OldPassw0rd!", "1234567", "1234567");
    await userEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(screen.getByText(/^Mật khẩu mới chưa phù hợp./)).toBeInTheDocument();
    expect(refine.customMutate).not.toHaveBeenCalled();
  });

  it("CP3 valid: POST /auth/change-password with current and new password", async () => {
    show();
    await fill("OldPassw0rd!", "NewPassw0rd!", "NewPassw0rd!");
    await userEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(refine.customMutate).toHaveBeenCalledTimes(1);
    const [vars] = refine.customMutate.mock.calls[0];
    expect(vars.url).toMatch(/\/auth\/change-password$/);
    expect(vars.method).toBe("post");
    expect(vars.values).toEqual({ currentPassword: "OldPassw0rd!", newPassword: "NewPassw0rd!" });
  });

  it("CP4 success: fields cleared and 'Đã đổi mật khẩu' notification", async () => {
    refine.customMutate = vi.fn((_v, opts) => opts.onSuccess({ data: { accessToken: "a", refreshToken: "r" } }));
    show();
    await fill("OldPassw0rd!", "NewPassw0rd!", "NewPassw0rd!");
    await userEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    await waitFor(() => expect(refine.notify).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã đổi mật khẩu" })));
    expect(screen.getByLabelText("Mật khẩu hiện tại")).toHaveValue("");
  });

  it("CP5 while saving the button says Đang đổi...", () => {
    refine.customPending = true;
    show();
    expect(screen.getByRole("button", { name: "Đang đổi..." })).toBeDisabled();
  });
});
