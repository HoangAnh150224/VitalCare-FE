"use client";

import { useState } from "react";
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
import { InputPassword } from "@/shared/components/form/input-password";
import { translateRegistrationMessage as translate } from "@/shared/api/registration";
import { cn } from "@/shared/lib/utils";

/**
 * Self-registration, in one step: phone number (what the account signs in
 * with, and where a password-recovery code is texted), name and password.
 * The API creates the account and signs it in.
 *
 * A new account is a customer that is not yet a patient: it can register for
 * an examination, and becomes a patient when it checks in at the clinic.
 */
export const SignUpForm = () => {
  const { title } = useRefineOptions();
  const { mutate: register, isPending: isRegistering } = useRegister();

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Hai mật khẩu không khớp." });
      return;
    }

    register(
      { phone, fullName, password },
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
              Đăng nhập bằng số điện thoại. Khi quên mật khẩu, mã khôi phục được gửi qua SMS tới số này.
            </CardDescription>
          </CardHeader>

          <CardContent className={cn("px-0")}>
            <form onSubmit={handleRegister}>
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
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {fieldError("confirmPassword")}
              </div>

              {error && Object.keys(fieldErrors).length === 0 && (
                <p className="text-destructive mt-4 text-sm">{error}</p>
              )}

              <Button type="submit" size="lg" className="mt-7 w-full" disabled={isRegistering}>
                {isRegistering ? "Đang tạo tài khoản…" : "Đăng ký"}
              </Button>
            </form>

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
