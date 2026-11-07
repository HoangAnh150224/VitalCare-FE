"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router";

import { useLogin, useRefineOptions } from "@refinedev/core";
/** Which field a sign-in refusal is about; the auth provider sets it on the error (`app/providers/auth.ts`). */
type LoginField = "phone" | "password" | null;
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { InputPassword } from "@/shared/components/form/input-password";
import { cn } from "@/shared/lib/utils";

/**
 * The sign-in screen.
 *
 * The phone number is the sign-in identifier. Any spelling reaches the same
 * account -- 0901234567 and +84901234567 alike -- because the server
 * normalises before it looks anything up, so this form sends what was typed.
 *
 * Self-registration is linked from here. A forgotten password is recovered
 * with a code texted to the number, from "Quên mật khẩu?" under the button.
 *
 * The screen sits on `gradient-hero` rather than the page background, and that
 * is the one place in the application where a surface is a picture rather than
 * a token. It is doing a job: this is the only screen somebody sees before they
 * are inside anything, so it is the only one that has to say whose system this
 * is on its own.
 */
export const SignInForm = () => {
  // Just registered: the sign-up form sends the number here so it need not be typed again.
  const registeredPhone = (useLocation().state as { registeredPhone?: string } | null)?.registeredPhone;
  const [phone, setPhone] = useState(registeredPhone ?? "");
  const [password, setPassword] = useState("");

  const { title } = useRefineOptions();
  // "always", as on sign-up: offline, say so now rather than signing in later unseen.
  const { mutate: login, isPending } = useLogin({ mutationOptions: { networkMode: "always" } });

  // The refusal, said once under the field it is about (or under the form).
  const [error, setError] = useState<{ text: string; field: LoginField } | null>(null);

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    // The browser's own checks are off (noValidate): their bubbles follow the browser's language
    // and sit apart from every other message. The same rules, said in Vietnamese under the field.
    const missing: { text: string; field: LoginField } | null = !phone.trim()
      ? { text: "Vui lòng nhập số điện thoại.", field: "phone" }
      : !password
        ? { text: "Vui lòng nhập mật khẩu.", field: "password" }
        : null;
    if (missing) {
      setError(missing);
      document.getElementById(missing.field!)?.focus();
      return;
    }
    login(
      { phone, password },
      {
        onSuccess: (data) => {
          if (data.success) return;
          const failure = data.error as (Error & { field?: LoginField }) | undefined;
          setError({ text: failure?.message ?? "Đăng nhập không thành công.", field: failure?.field ?? null });
        },
      }
    );
  };
  const messageFor = (field: LoginField) =>
    error && error.field === field ? (
      <p role="alert" className="text-destructive text-sm">
        {error.text}
      </p>
    ) : null;

  return (
    <div
      className={cn(
        "gradient-hero relative flex min-h-svh flex-col items-center justify-center",
        "px-6 py-10"
      )}
    >
      {/* Texture, and nothing else — it must never intercept a click meant for
          the form sitting on top of it. */}
      <div
        aria-hidden
        className="grid-pattern pointer-events-none absolute inset-0"
      />

      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground absolute top-5 left-5 z-10 rounded-md text-sm font-medium"
      >
        ← Trang chủ
      </Link>

      <div
        className={cn(
          "relative flex w-full flex-col items-center",
          "screen-enter screen-enter-stagger"
        )}
      >
        {/* The brand leads home, as it does on every other page. */}
        <Link to="/" className="flex flex-col items-center gap-3 rounded-xl text-center">
          {title.icon && (
            <div
              className={cn(
                // The logo is drawn for a white ground; keep that ground here.
                "flex size-14 items-center justify-center rounded-xl",
                "bg-white p-1.5 shadow-e4"
              )}
            >
              {title.icon}
            </div>
          )}
          {title.text && (
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {title.text}
            </h1>
          )}
        </Link>

        <Card className={cn("mt-8 w-full p-8 shadow-e4", "sm:w-[420px]")}>
          <CardHeader className={cn("gap-1 px-0")}>
            <CardTitle className={cn("text-2xl font-semibold")}>
              Đăng nhập
            </CardTitle>
          </CardHeader>

          <CardContent className={cn("px-0")}>
            {registeredPhone && (
              <p role="status" className="mb-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                Tạo tài khoản thành công. Vui lòng đăng nhập để tiếp tục.
              </p>
            )}
            <form onSubmit={handleSignIn} noValidate>
              <div className={cn("flex flex-col gap-2")}>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  // "username", not "tel": password managers pair the saved
                  // password with the field marked as the sign-in identifier,
                  // whatever shape that identifier happens to have.
                  autoComplete="username"
                  placeholder="0901234567"
                  autoFocus
                  required
                  value={phone}
                  aria-invalid={error?.field === "phone" || undefined}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {messageFor("phone")}
              </div>

              <div className={cn("relative mt-5 flex flex-col gap-2")}>
                <Label htmlFor="password">Mật khẩu</Label>
                <InputPassword
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  aria-invalid={error?.field === "password" || undefined}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {messageFor("password")}
              </div>
              {messageFor(null) && <div className="mt-4">{messageFor(null)}</div>}

              <Button
                type="submit"
                size="lg"
                className={cn("mt-7 w-full")}
                disabled={isPending}
              >
                {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>

              <div className="mt-4 text-right">
                <Link to="/forgot-password" className="text-link text-sm font-medium hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            </form>

            <p
              className={cn(
                "text-muted-foreground mt-6 border-t border-border pt-4",
                "text-center text-xs"
              )}
            >
              Chưa có tài khoản?{" "}
              <Link to="/register" className="text-link font-medium hover:underline">
                Đăng ký bằng số điện thoại
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
