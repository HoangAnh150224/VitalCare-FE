import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

/**
 * Firebase Phone Auth, for the two screens that prove a phone number:
 * registration and password recovery.
 *
 * Used only when the API answers a code request with `channel: "firebase"`.
 * Google then sends the SMS from the browser (behind an invisible reCAPTCHA),
 * checks the code the person types, and hands back an ID token; the API takes
 * that token in place of a code of its own. The Firebase session is signed
 * out at once — VitalCare's own session is the only one the app keeps.
 *
 * The SDK is imported on demand, so the landing page and sign-in never load it.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigured = () => Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

async function auth() {
  const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = getApps()[0] ?? initializeApp(config);
  const instance = getAuth(app);
  instance.languageCode = "vi";
  return instance;
}

let verifier: RecaptchaVerifier | null = null;

/** A Vietnamese number as typed (0968…, 84968…, +84 968…) in E.164, as Firebase wants it. */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+84${digits.slice(1)}`;
  return `+84${digits}`;
}

/** Has Google text a code to the number. Keep the result for {@link confirmFirebaseCode}. */
export async function sendFirebaseCode(phone: string): Promise<ConfirmationResult> {
  if (!firebaseConfigured()) {
    throw Object.assign(new Error("firebase-not-configured"), { code: "app/not-configured" });
  }
  const instance = await auth();
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  // A fresh invisible reCAPTCHA for every send: a resend on the old one fails
  // with "reCAPTCHA has already been rendered".
  verifier?.clear();
  let holder = document.getElementById("firebase-recaptcha");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "firebase-recaptcha";
    document.body.appendChild(holder);
  }
  holder.replaceChildren();
  verifier = new RecaptchaVerifier(instance, holder, { size: "invisible" });
  return signInWithPhoneNumber(instance, toE164(phone), verifier);
}

/** Checks the typed code with Firebase and returns the ID token that proves the number. */
export async function confirmFirebaseCode(result: ConfirmationResult, code: string): Promise<string> {
  const credential = await result.confirm(code);
  const token = await credential.user.getIdToken();
  const { signOut } = await import("firebase/auth");
  await signOut(await auth());
  return token;
}

/** What went wrong, in the interface's language. */
export function translateFirebaseError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code":
      return "Mã xác thực không đúng.";
    case "auth/code-expired":
    case "auth/session-expired":
      return "Mã đã hết hạn. Hãy bấm gửi lại mã.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "Đã gửi quá nhiều mã. Vui lòng thử lại sau.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Số điện thoại không hợp lệ.";
    case "auth/unauthorized-domain":
    case "auth/captcha-check-failed":
      return "Trang này chưa được phép gửi mã. Vui lòng liên hệ quản trị.";
    case "auth/operation-not-allowed":
    case "app/not-configured":
      return "Tính năng gửi mã chưa được cấu hình. Vui lòng liên hệ quản trị.";
    case "auth/network-request-failed":
      return "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.";
    default:
      return "Chưa gửi hoặc kiểm tra được mã. Vui lòng thử lại.";
  }
}
