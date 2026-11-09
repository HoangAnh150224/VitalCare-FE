"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon } from "lucide-react";

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
  checkRegistrationCode,
  requestRegistrationCode,
  translateRegistrationMessage as translate,
  type ProfileMatch,
} from "@/shared/api/registration";
import { cn } from "@/shared/lib/utils";

const CODE_LENGTH = 6;

const isAllZeroPhone = (phone: string) => {
  const compact = phone.replace(/[\s().-]/g, "");
  const hasCountryCode = compact.startsWith("+84") || compact.startsWith("84");
  const national = compact.startsWith("+84")
    ? compact.slice(3)
    : compact.startsWith("84")
      ? compact.slice(2)
      : compact;
  const significant = !hasCountryCode && national.startsWith("0") ? national.slice(1) : national;
  return /^0{9}$/.test(significant);
};

/** The API's answer to a number that already has an account (UC-04 D2). */
const PHONE_TAKEN = "Số điện thoại đã được sử dụng";

/** "Nguyễn V*** A – 1985": how a matching profile is shown (BR-14). */
const matchLabel = (match: ProfileMatch) =>
  match.birthYear ? `${match.maskedName} – ${match.birthYear}` : match.maskedName;

/**
 * Self-registration (UC-04) verifies the phone by SMS before the API creates
 * the account and its customer record. Once the code is right, the profiles
 * the clinic already has with that number (walk-ins) are offered masked: the
 * person picks their own, or "not me" for a new one; the others join the
 * account as relatives.
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

  const [step, setStep] = useState<"details" | "otp" | "profile">("details");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [matches, setMatches] = useState<ProfileMatch[]>([]);
  /** The match picked as the person's own; "none" for "not me". */
  const [claim, setClaim] = useState<string>("");
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
    if (phone.trim() && isAllZeroPhone(phone)) {
      missing.phone = translate("Phone number cannot be all zeros");
    }
    if (fullName.trim() && fullName.trim().length < 2) {
      missing.fullName = translate("Full name must contain at least 2 characters");
    }
    if (fullName.length > 255) {
      missing.fullName = translate("Full name must be at most 255 characters");
    }
    if (
      fullName.trim() &&
      fullName.length <= 255 &&
      !/^[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*$/u.test(fullName.trim())
    ) {
      missing.fullName = translate("Full name may only contain letters and spaces");
    }
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

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (otp.length !== CODE_LENGTH) {
      setFieldErrors({ otp: "Vui lòng xác thực số điện thoại để tiếp tục." });
      document.getElementById("otp")?.focus();
      return;
    }

    setChecking(true);
    const result = await checkRegistrationCode({ phone, otp });
    setChecking(false);
    if (!result.ok) {
      setError(translate(result.error.message));
      setFieldErrors(result.error.fieldErrors ?? {});
      if (result.error.fieldErrors?.otp) setOtp("");
      return;
    }
    // No profile with this number yet: nothing to choose, the account gets a new one.
    if (result.value.length === 0) {
      createAccount(null);
      return;
    }
    setMatches(result.value);
    setClaim("");
    setStep("profile");
  };

  const handleClaim = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!claim) {
      setError("Vui lòng chọn hồ sơ của bạn, hoặc chọn \"Không phải tôi\".");
      return;
    }
    createAccount(claim === "none" ? null : Number(claim));
  };

  const createAccount = (claimProfileId: number | null) => {
    register(
      { phone, fullName, password, otp, claimProfileId },
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
          // The code is spent or wrong: back to it, to ask for a new one.
          if (failure?.fieldErrors?.otp) {
            setOtp("");
            setStep("otp");
          }
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
        "px-6 pt-24 pb-10 sm:py-10"
      )}
    >
      {/* A solid pill so it reads on both the dark and the mint ground. */}
      <Link
        to="/"
        className={cn(
          "absolute top-5 left-5 z-10 inline-flex items-center gap-2 rounded-full",
          "border border-black/5 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-e4",
          "transition hover:-translate-x-0.5 hover:bg-slate-50",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
        )}
      >
        <ArrowLeftIcon className="size-4" />
        Về trang chủ
      </Link>

      <div className={cn("relative flex w-full flex-col items-center", "screen-enter screen-enter-stagger")}>
        {/* The brand leads home, as it does on every other page. */}
        <Link to="/" className="flex flex-col items-center gap-3 rounded-xl text-center">
          {title.icon && (
            <div
              className={cn(
                "flex size-20 items-center justify-center rounded-2xl",
                "bg-white p-2 shadow-e4"
              )}
            >
              {title.icon}
            </div>
          )}
          {title.text && (
            <h1 className="text-auth-title text-2xl font-bold tracking-tight">{title.text}</h1>
          )}
        </Link>

        <Card className={cn("mt-8 w-full p-8 shadow-e4", "sm:w-[420px]")}>
          <CardHeader className={cn("gap-1 px-0")}>
            <CardTitle className={cn("text-2xl font-semibold")}>
              {step === "details"
                ? "Đăng ký"
                : step === "otp"
                  ? "Xác thực số điện thoại"
                  : "Chọn hồ sơ của bạn"}
            </CardTitle>
            <CardDescription>
              {step === "details"
                ? "Mã xác thực sẽ được gửi qua SMS tới số điện thoại bạn đăng ký."
                : step === "otp"
                  ? `Mã xác thực đã được gửi qua SMS tới ${phone}.`
                  : "Phòng khám đã có hồ sơ với số điện thoại này. Chọn hồ sơ của chính bạn; các hồ sơ còn lại sẽ được thêm vào tài khoản là người thân."}
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
                  <p role="alert" className="text-destructive mt-4 text-sm">
                    {error.startsWith(PHONE_TAKEN) ? (
                      <>
                        Số này đã đăng ký.{" "}
                        <Link to="/forgot-password" className="text-link font-medium underline">
                          Quên mật khẩu?
                        </Link>
                      </>
                    ) : (
                      error
                    )}
                  </p>
                )}

                <Button type="submit" size="lg" className="mt-7 w-full" disabled={sending}>
                  {sending ? "Đang gửi mã…" : "Đăng ký"}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={(e) => void handleVerify(e)} noValidate>
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
                  disabled={checking || isRegistering || sending}
                >
                  {checking || isRegistering ? "Đang xác thực…" : "Xác thực và đăng ký"}
                </Button>
              </form>
            )}

            {step === "profile" && (
              <form onSubmit={handleClaim} noValidate>
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">Hồ sơ của bạn</legend>
                  {[...matches.map((match) => ({ value: String(match.id), label: matchLabel(match) })),
                    { value: "none", label: "Không phải tôi — tạo hồ sơ mới" }].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                        claim === option.value && "border-primary bg-primary/5"
                      )}
                    >
                      <input
                        type="radio"
                        name="claim"
                        value={option.value}
                        checked={claim === option.value}
                        onChange={() => setClaim(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>

                {error && (
                  <p role="alert" className="text-destructive mt-4 text-sm">{error}</p>
                )}

                <Button type="submit" size="lg" className="mt-7 w-full" disabled={isRegistering}>
                  {isRegistering ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
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
