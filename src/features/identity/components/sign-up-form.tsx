"use client";

import { useEffect, useRef, useState } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { Link } from "react-router";

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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp";
import { InputPassword } from "@/shared/components/form/input-password";
import {
  requestRegistrationCode,
  translateRegistrationMessage,
} from "@/shared/api/registration";
import { confirmFirebaseCode, sendFirebaseCode, translateFirebaseError } from "@/shared/api/firebase-phone";
import { cn } from "@/shared/lib/utils";

const CODE_LENGTH = 6;

const freshToken = (held: { value: string; at: number } | null) =>
  held && Date.now() - held.at < 9 * 60 * 1000 ? held.value : null;

const translate = translateRegistrationMessage;

/**
 * Self-registration, in two steps on one screen.
 *
 * First the phone number, which receives a one-time code; then the code
 * together with a name and a password. The account is created only when the
 * code checks out — the API takes all of it in one request, so there is no
 * half-made account if somebody walks away after the first step.
 *
 * A new account is a customer that is not yet a patient: it can book an
 * appointment, and becomes a patient when it checks in at the clinic.
 */
export const SignUpForm = () => {
  const { title } = useRefineOptions();
  const { mutate: register, isPending: isRegistering } = useRegister();

  const [step, setStep] = useState<"phone" | "details">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Set when Firebase sent the code: the typed code is then checked by Firebase.
  const firebaseCode = useRef<ConfirmationResult | null>(null);
  // Firebase confirms a code once; the token it gave is kept for a retry
  // (a server error after confirming) for a few minutes, as the API allows.
  const firebaseToken = useRef<{ value: string; at: number } | null>(null);

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
    const result = await requestRegistrationCode(phone);

    if (!result.ok) {
      setSending(false);
      setError(translate(result.error.message));
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }
    if (result.value.channel === "firebase") {
      try {
        // Replaced only once the new code is on its way: a failed resend
        // leaves the earlier code usable.
        firebaseCode.current = await sendFirebaseCode(phone);
        firebaseToken.current = null;
      } catch (failure) {
        setSending(false);
        setResendIn(result.value.resendAfter);
        setError(translateFirebaseError(failure));
        return;
      }
    } else {
      firebaseCode.current = null;
    }
    setSending(false);
    setResendIn(result.value.resendAfter);
    setOtp("");
    setStep("details");
  };

  const handlePhone = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendCode();
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Hai mật khẩu không khớp." });
      return;
    }

    let proof: { otp?: string; firebaseToken?: string } = { otp };
    if (firebaseCode.current) {
      setChecking(true);
      try {
        const token = freshToken(firebaseToken.current) ?? (await confirmFirebaseCode(firebaseCode.current, otp));
        firebaseToken.current = { value: token, at: firebaseToken.current?.value === token ? firebaseToken.current.at : Date.now() };
        proof = { firebaseToken: token };
      } catch (failure) {
        setFieldErrors({ otp: translateFirebaseError(failure) });
        return;
      } finally {
        setChecking(false);
      }
    }

    register(
      { phone, ...proof, fullName, password },
      {
        onSuccess: (data) => {
          if (data.success) return;
          const failure = data.error as (Error & { fieldErrors?: Record<string, string> }) | undefined;
          setError(failure?.message ? translate(failure.message) : null);
          setFieldErrors(failure?.fieldErrors ?? {});
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
            <CardTitle className={cn("text-2xl font-semibold")}>Đăng ký</CardTitle>
            <CardDescription>
              {step === "phone"
                ? "Nhập số điện thoại để nhận mã xác thực."
                : `Nhập mã ${CODE_LENGTH} số đã gửi tới ${phone}.`}
            </CardDescription>
          </CardHeader>

          <CardContent className={cn("px-0")}>
            {step === "phone" ? (
              <form onSubmit={handlePhone}>
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

                {error && !fieldErrors.phone && (
                  <p className="text-destructive mt-4 text-sm">{error}</p>
                )}

                <Button type="submit" size="lg" className="mt-7 w-full" disabled={sending}>
                  {sending ? "Đang gửi mã…" : "Gửi mã xác thực"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="otp">Mã xác thực</Label>
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
                        firebaseCode.current = null;
                        firebaseToken.current = null;
                        setError(null);
                        setFieldErrors({});
                      }}
                    >
                      Đổi số điện thoại
                    </button>
                  </div>
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
                  disabled={isRegistering || checking || otp.length !== CODE_LENGTH}
                >
                  {checking ? "Đang kiểm tra mã…" : isRegistering ? "Đang tạo tài khoản…" : "Đăng ký"}
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
