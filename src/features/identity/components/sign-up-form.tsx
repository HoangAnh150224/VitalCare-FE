"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useRefineOptions, useRegister } from "@refinedev/core";
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
import { InputPassword } from "@/shared/components/form/input-password";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp";
import {
  requestRegistrationCode,
  translateRegistrationMessage as translate,
} from "@/shared/api/registration";
import { cn } from "@/shared/lib/utils";

const CODE_LENGTH = 6;

/**
 * Self-registration verifies the phone by SMS before the API creates the
 * account and its customer record.
 *
 * A new account is a customer that is not yet a patient: it can register for
 * an examination, and becomes a patient when it checks in at the clinic.
 */
export const SignUpForm = () => {
  const { title } = useRefineOptions();
  // "always": offline, the request fails now with "cannot reach the server" instead of waiting
  // unseen and creating the account later, when the connection is back (ST-REG-073).
  const navigate = useNavigate();
  const { mutate: register, isPending: isRegistering } = useRegister({ mutationOptions: { networkMode: "always" } });

  const [step, setStep] = useState<"details" | "otp">("details");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setSending(true);
    setError(null);
    setFieldErrors({});
    const result = await requestRegistrationCode(phone);
    setSending(false);

    if (!result.ok) {
      setError(translate(result.error.message));
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }
    setResendIn(result.value.resendAfter);
    setCodeSentTo(phone);
    setOtp("");
    setStep("otp");
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // The browser's own checks are off (noValidate): their bubbles follow the browser's language
    // and sit apart from every other message. The same rules, said in Vietnamese under the field.
    const missing: Record<string, string> = {};
    if (!phone.trim()) missing.phone = "Vui lòng nhập số điện thoại.";
    if (!fullName.trim()) missing.fullName = "Vui lòng nhập họ và tên.";
    if (!password) missing.password = "Vui lòng nhập mật khẩu.";
    else if (password.length < 8) missing.password = "Mật khẩu phải có từ 8 đến 72 ký tự.";
    if (!confirmPassword) missing.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      document.getElementById(Object.keys(missing)[0])?.focus();
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Hai mật khẩu không khớp." });
      return;
    }

    if (codeSentTo === phone) {
      setStep("otp");
      return;
    }

    void sendCode();
  };

  const handleVerifyAndRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (otp.length !== CODE_LENGTH) {
      setFieldErrors({ otp: "Vui lòng xác thực số điện thoại để tiếp tục." });
      document.getElementById("otp")?.focus();
      return;
    }

    register(
      { phone, fullName, password, otp },
      {
        onSuccess: (data) => {
          if (data.success) {
            // Router state, not the address bar: the number stays out of history and logs.
            navigate("/login", { state: { registeredPhone: phone.trim() } });
            return;
          }
          const failure = data.error as (Error & { fieldErrors?: Record<string, string> }) | undefined;
          setError(failure?.message ? translate(failure.message) : null);
          setFieldErrors(failure?.fieldErrors ?? {});
          if (failure?.fieldErrors?.otp) setOtp("");
        },
      }
    );
  };

  const fieldError = (name: string) =>
    fieldErrors[name] ? (
      <p className="text-destructive text-sm">{translate(fieldErrors[name])}</p>
    ) : null;

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
              {step === "details" ? "Đăng ký" : "Xác thực số điện thoại"}
            </CardTitle>
            <CardDescription>
              {step === "details"
                ? "Mã xác thực sẽ được gửi qua SMS tới số điện thoại bạn đăng ký."
                : `Mã xác thực đã được gửi qua SMS tới ${phone}.`}
            </CardDescription>
          </CardHeader>

          <CardContent className={cn("px-0")}>
            {step === "details" && (
              <form onSubmit={handleRegister} noValidate>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0901234567"
                    autoFocus
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {fieldError("phone")}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    required
                    maxLength={255}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  {fieldError("fullName")}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  {/* The phone number is the sign-in identifier, so a hidden
                      username field tells password managers which account the
                      new password belongs to. */}
                  <input type="hidden" name="username" autoComplete="username" value={phone} readOnly />
                  <InputPassword
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {fieldError("password")}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                  <InputPassword
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu để xác nhận"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {fieldError("confirmPassword")}
                </div>

                {error && Object.keys(fieldErrors).length === 0 && (
                  <p role="alert" className="text-destructive mt-4 text-sm">{error}</p>
                )}

                <Button type="submit" size="lg" className="mt-7 w-full" disabled={sending}>
                  {sending ? "Đang gửi mã…" : "Đăng ký"}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyAndRegister} noValidate>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="otp">Mã xác thực SMS</Label>
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
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldErrors.otp && (
                    <p role="alert" className="text-destructive text-sm">
                      {translate(fieldErrors.otp)}
                    </p>
                  )}
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
                        setStep("details");
                        setError(null);
                        setFieldErrors({});
                      }}
                    >
                      Sửa thông tin
                    </button>
                  </div>
                </div>

                {error && Object.keys(fieldErrors).length === 0 && (
                  <p role="alert" className="text-destructive mt-4 text-sm">{error}</p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-7 w-full"
                  disabled={isRegistering || sending}
                >
                  {isRegistering ? "Đang xác thực…" : "Xác thực và đăng ký"}
                </Button>
              </form>
            )}

            <p
              className={cn(
                "text-muted-foreground mt-6 border-t border-border pt-4",
                "text-center text-sm"
              )}
            >
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-link font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

SignUpForm.displayName = "SignUpForm";
