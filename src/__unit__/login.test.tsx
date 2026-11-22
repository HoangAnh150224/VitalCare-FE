import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { refine, refineMock, renderAt } from "./helpers";

vi.mock("@refinedev/core", () => refineMock());
const { SignInForm } = await import("@/features/identity/components/sign-in-form");

const show = () => renderAt("/login", "/login", <SignInForm />);

describe("SignInForm", () => {
  beforeEach(() => {
    refine.login = vi.fn();
    refine.loginPending = false;
  });

  it("UI1 fields: phone is tel and required, password hidden and required", () => {
    show();
    const phone = screen.getByLabelText("Số điện thoại");
    const password = screen.getByLabelText("Mật khẩu");
    expect(phone).toHaveAttribute("type", "tel");
    expect(phone).toBeRequired();
    expect(password).toHaveAttribute("type", "password");
    expect(password).toBeRequired();
  });

  it("UI2 the eye button shows and hides the password", async () => {
    show();
    const password = screen.getByLabelText("Mật khẩu");
    await userEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(password).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("UI3 submitting calls login with what was typed", async () => {
    show();
    await userEvent.type(screen.getByLabelText("Số điện thoại"), "0912345678");
    await userEvent.type(screen.getByLabelText("Mật khẩu"), "Passw0rd!");
    fireEvent.submit(screen.getByRole("button", { name: "Đăng nhập" }).closest("form")!);
    expect(refine.login).toHaveBeenCalledWith({ phone: "0912345678", password: "Passw0rd!" }, expect.anything());
  });

  it("UI4 empty fields: the browser blocks the submit (required)", () => {
    show();
    const form = screen.getByRole("button", { name: "Đăng nhập" }).closest("form")!;
    expect(form.checkValidity()).toBe(false);
    expect((screen.getByLabelText("Số điện thoại") as HTMLInputElement).validity.valueMissing).toBe(true);
  });

  it("UI5 while signing in the button is disabled and says so", () => {
    refine.loginPending = true;
    show();
    const button = screen.getByRole("button", { name: "Đang đăng nhập…" });
    expect(button).toBeDisabled();
  });

  it("UI6 links to forgot-password and register", () => {
    show();
    expect(screen.getByRole("link", { name: "Quên mật khẩu?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "Đăng ký bằng số điện thoại" })).toHaveAttribute("href", "/register");
  });
});
