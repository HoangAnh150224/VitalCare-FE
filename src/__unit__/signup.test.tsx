import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { calls, mockApi, refine, refineMock, renderAt } from "./helpers";

vi.mock("@refinedev/core", () => refineMock());
const { SignUpForm } = await import("@/features/identity/components/sign-up-form");
const { translateRegistrationMessage } = await import("@/shared/api/registration");

const show = () => renderAt("/register", "/register", <SignUpForm />);

/** Types a full form; confirm defaults to the same password. */
async function fill(confirm = "Passw0rd!") {
  await userEvent.type(screen.getByLabelText("Số điện thoại"), "0912345678");
  await userEvent.type(screen.getByLabelText("Họ và tên"), "Nguyen Van A");
  await userEvent.type(screen.getByLabelText("Mật khẩu"), "Passw0rd!");
  await userEvent.type(screen.getByLabelText("Nhập lại mật khẩu"), confirm);
}

const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Đăng ký" }).closest("form")!);

describe("SignUpForm", () => {
  beforeEach(() => {
    refine.register = vi.fn();
    refine.registerPending = false;
  });

  it("SU1 confirm password differs: error under the field, register not called", async () => {
    show();
    await fill("Passw0rd!x");
    submit();
    expect(screen.getByText("Hai mật khẩu không khớp.")).toBeInTheDocument();
    expect(refine.register).not.toHaveBeenCalled();
  });

  it("SU2 valid form: a code is sent, then register once with phone, fullName, password and the code", async () => {
    mockApi({
      "POST /auth/register/otp": { status: 200, body: { expiresIn: 300, resendAfter: 60 } },
      "POST /auth/register/otp/check": { status: 200, body: [] },
    });
    show();
    await fill();
    submit();
    const code = await screen.findByLabelText("Mã xác thực SMS");
    expect(JSON.parse(String(calls[0].init!.body))).toEqual({ phone: "0912345678" });
    await userEvent.type(code, "123456");
    await userEvent.click(screen.getByRole("button", { name: "Xác thực và đăng ký" }));
    await waitFor(() => expect(refine.register).toHaveBeenCalledTimes(1));
    expect(refine.register.mock.calls[0][0]).toEqual({
      phone: "0912345678",
      fullName: "Nguyen Van A",
      password: "Passw0rd!",
      otp: "123456",
      claimProfileId: null,
    });
    expect(screen.queryByText("Hai mật khẩu không khớp.")).not.toBeInTheDocument();
  });

  it("SU3 phone already registered (409 on sending the code): 'Số này đã đăng ký' with a link to Quên mật khẩu, no code step", async () => {
    mockApi({ "POST /auth/register/otp": { status: 409, body: { status: 409, message: "Số điện thoại đã được sử dụng. Xin vui lòng nhập một số khác." } } });
    show();
    await fill();
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Số này đã đăng ký. Quên mật khẩu?");
    expect(screen.getByRole("link", { name: "Quên mật khẩu?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText("Mã xác thực SMS")).not.toBeInTheDocument();
    expect(refine.register).not.toHaveBeenCalled();
  });

  it("SU4 422 on phone: the Vietnamese message appears under the phone field", async () => {
    const apiMsg = "Phone number has too few digits";
    mockApi({ "POST /auth/register/otp": { status: 422, body: { status: 422, message: "Validation failed", errors: { phone: apiMsg } } } });
    show();
    await fill();
    submit();
    const said = translateRegistrationMessage(apiMsg);
    expect(said).not.toBe(apiMsg);
    const msgs = await screen.findAllByText(said);
    expect(msgs.some((m) => m.parentElement?.contains(screen.getByLabelText("Số điện thoại")))).toBe(true);
  });

  it("SU5 while the code is being sent the button is disabled and says so", async () => {
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    show();
    await fill();
    submit();
    expect(await screen.findByRole("button", { name: "Đang gửi mã…" })).toBeDisabled();
  });

  it("SU6 field attributes: tel/required, name max 255, password 8–72, confirm required", () => {
    show();
    const phone = screen.getByLabelText("Số điện thoại");
    const name = screen.getByLabelText("Họ và tên");
    const password = screen.getByLabelText("Mật khẩu");
    const confirm = screen.getByLabelText("Nhập lại mật khẩu");
    expect(phone).toHaveAttribute("type", "tel");
    expect(phone).toBeRequired();
    expect(name).toBeRequired();
    expect(name).toHaveAttribute("maxLength", "255");
    expect(password).toBeRequired();
    expect(password).toHaveAttribute("minLength", "8");
    expect(password).toHaveAttribute("maxLength", "72");
    expect(confirm).toBeRequired();
  });
});
