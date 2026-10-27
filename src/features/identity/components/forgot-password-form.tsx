"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router";

import { useRefineOptions } from "@refinedev/core";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp";
import { InputPassword } from "@/shared/components/form/input-password";
import {
  checkPasswordResetCode,
  requestPasswordResetCode,
  resetPassword,
  translateRegistrationMessage as translate,
} from "@/shared/api/registration";
import { cn } from "@/shared/lib/utils";

const CODE_LENGTH = 6;

/**
 * Recovering a forgotten password (SRS 3.2.5 – 3.2.6), in three steps on one
 * screen: the phone number the account signs in with, the code texted to it
 * (checked before going on), then the new password.
 *
 * The SRS draws a link sent by email; here it is a code by SMS, because the
 * person types the code on this same screen. The second step says the same
 * thing whether or not the number has an account — the API answers both
 * alike, and so does this form.
 */
export const ForgotPasswordForm = () => {
  const { title } = useRefineOptions();

  const [step, setStep] = useState<"phone" | "code" | "password" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Counts the resend cooldown down, so the button says when it will work
  // instead of failing when pressed.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setSending(true);
    setError(null);
    setFieldErrors({});
    const result = await requestPasswordResetCode(phone);
    setSending(false);

    if (!result.ok) {
      setError(translate(result.error.message));
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }
    setResendIn(result.value.resendAfter);
    setOtp("");
    setStep("code");
  };

  const handleCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    setChecking(true);
    const result = await checkPasswordResetCode({ phone, otp });
    setChecking(false);

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }
    setStep("password");
  };

  const handlePhone = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendCode();
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Hai mật khẩu không khớp." });
      return;
    }

    setSaving(true);
    const result = await resetPassword({ phone, otp, newPassword: password });
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
      // The code was right a moment ago; if it is not now, it has expired
      // meanwhile — back to the code step, where a new one can be sent.
      if (result.error.fieldErrors?.otp) {
        setOtp("");
        setStep("code");
      }
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setStep("done");
  };

  const fieldError = (name: string) =>
    fieldErrors[name] ? (
      <p className="text-destructive text-sm">
        {translate(fieldErrors[name])}
        {/* The doc's "link expired: ask for a new one". The API does not say
            whether the code was mistyped or has expired, so offer both. */}
        {name === "otp" && " Kiểm tra lại mã, hoặc gửi lại mã nếu mã đã hết hạn."}
      </p>
    ) : null;

  const description = {
    phone: "Nhập số điện thoại bạn dùng để đăng nhập. Mã khôi phục sẽ được gửi qua SMS tới số này.",
    code: `Nếu số ${phone} có tài khoản, mã khôi phục ${CODE_LENGTH} số đã được gửi qua SMS tới số đó.`,
    password: "Mã đúng. Đặt mật khẩu mới cho tài khoản.",
    done: "Đã đổi mật khẩu. Mọi phiên đăng nhập cũ đã kết thúc.",
  }[step];

  return (
    <div
      className={cn(
        "gradient-hero relative flex min-h-svh flex-col items-center justify-center",
        "px-6 py-10"
      )}
    >
      <div aria-hidden className="grid-pattern pointer-events-none absolute inset-0" />

      <div className={cn("relative flex w-full flex-col items-center", "screen-enter screen-enter-stagger")}>
        <div className="flex flex-col items-center gap-3 text-center">
          {title.icon && (
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-xl",
                "bg-white p-1.5 shadow-e4"
              )}
            >
              {title.icon}
            </div>
          )}
          {title.text && (
            <h1 className="text-xl font-bold tracking-tight text-foreground">{title.text}</h1>
          )}
        </div>

        <Card className={cn("mt-8 w-full p-8 shadow-e4", "sm:w-[420px]")}>
          <CardHeader className={cn("gap-1 px-0")}>
            <CardTitle className={cn("text-2xl font-semibold")}>
              {step === "phone"
                ? "Khôi phục mật khẩu"
                : step === "code"
                  ? "Nhập mã khôi phục"
                  : step === "password"
                    ? "Đặt mật khẩu mới"
                    : "Thành công"}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          <CardContent className={cn("px-0")}>
            {step === "phone" && (
              <form onSubmit={handlePhone}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="username"
                    placeholder="0901234567"
                    autoFocus
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {fieldError("phone")}
                </div>

                {error && !fieldErrors.phone && (
                  <p className="text-destructive mt-4 text-sm">{error}</p>
                )}

                <Button type="submit" size="lg" className="mt-7 w-full" disabled={sending}>
                  {sending ? "Đang gửi mã…" : "Gửi mã khôi phục"}
                </Button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleCode}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="otp">Mã khôi phục</Label>
                  <InputOTP
                    id="otp"
                    maxLength={CODE_LENGTH}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="^[0-9]*$"
                    autoFocus
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: CODE_LENGTH }, (_, index) => (
                        <InputOTPSlot key={index} index={index} aria-invalid={Boolean(fieldErrors.otp)} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldError("otp")}
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      className="hover:text-foreground underline-offset-4 hover:underline disabled:no-underline disabled:opacity-60"
                      disabled={resendIn > 0 || sending}
                      onClick={() => void sendCode()}
                    >
                      {resendIn > 0 ? `Gửi lại mã sau ${resendIn}s` : "Gửi lại mã"}
                    </button>
                    <span aria-hidden>·</span>
                    <button
                      type="button"
                      className="hover:text-foreground underline-offset-4 hover:underline"
                      onClick={() => {
                        setStep("phone");
                        setError(null);
                        setFieldErrors({});
                      }}
                    >
                      Đổi số điện thoại
                    </button>
                  </div>
                </div>

                {error && Object.keys(fieldErrors).length === 0 && (
                  <p className="text-destructive mt-4 text-sm">{error}</p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-7 w-full"
                  disabled={checking || otp.length !== CODE_LENGTH}
                >
                  {checking ? "Đang kiểm tra…" : "Tiếp tục"}
                </Button>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handleReset}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Mật khẩu mới</Label>
                  {/* Tells password managers which account the new password is for. */}
                  <input type="hidden" name="username" autoComplete="username" value={phone} readOnly />
                  <InputPassword
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    autoFocus
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {fieldError("newPassword")}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <InputPassword
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {fieldError("confirmPassword")}
                </div>

                {error && Object.keys(fieldErrors).length === 0 && (
                  <p className="text-destructive mt-4 text-sm">{error}</p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-7 w-full"
                  disabled={saving}
                >
                  {saving ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
                </Button>
              </form>
            )}

            {step === "done" && (
              <Button asChild size="lg" className="w-full">
                <Link to="/login">Về đăng nhập</Link>
              </Button>
            )}

            {step !== "done" && (
              <p
                className={cn(
                  "text-muted-foreground mt-6 border-t border-border pt-4",
                  "text-center text-sm"
                )}
              >
                Nhớ ra mật khẩu?{" "}
                <Link to="/login" className="text-link font-medium hover:underline">
                  Về đăng nhập
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

ForgotPasswordForm.displayName = "ForgotPasswordForm";
