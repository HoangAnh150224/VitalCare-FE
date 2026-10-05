import { API_URL } from "@/shared/api/constants";

/** What `POST /auth/register/otp` answers: a code is on its way. */
export type OtpSent = {
  /** Seconds the code stays usable. */
  expiresIn: number;
  /** Seconds before another code may be requested. */
  resendAfter: number;
};

export type RegistrationError = {
  message: string;
  /** Per-field messages from a 422, keyed by request field (`phone`, `otp`, ...). */
  fieldErrors?: Record<string, string>;
};

/**
 * Asks for a registration code to be sent to a phone number.
 *
 * Plain `fetch`, like the auth provider and for the same reason: this happens
 * before there is a token, so the shared ky instance — which exists to attach
 * one and to refresh it — has nothing to do here.
 */
export async function requestRegistrationCode(
  phone: string
): Promise<{ ok: true; value: OtpSent } | { ok: false; error: RegistrationError }> {
  try {
    const response = await fetch(`${API_URL}/auth/register/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (response.ok) {
      return { ok: true, value: (await response.json()) as OtpSent };
    }
    return { ok: false, error: await readRegistrationError(response) };
  } catch {
    return {
      ok: false,
      error: { message: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại." },
    };
  }
}

/**
 * The API's messages are English and meant for logs as much as for people;
 * the ones a person registering will actually meet are said again here in the
 * interface's language. Anything else is shown as the API wrote it.
 */
export function translateRegistrationMessage(message: string): string {
  if (message.startsWith("That phone number is already in use")) {
    return "Số điện thoại này đã được đăng ký. Hãy đăng nhập.";
  }
  if (message.startsWith("Please wait")) {
    return "Vừa gửi mã cho số này. Vui lòng đợi một chút trước khi yêu cầu mã mới.";
  }
  if (message.startsWith("Too many codes")) {
    return "Đã gửi quá nhiều mã tới số này. Vui lòng thử lại sau.";
  }
  if (message.startsWith("The code is incorrect")) {
    return "Mã xác thực không đúng hoặc đã hết hạn.";
  }
  if (message.startsWith("Password is too long")) {
    return "Mật khẩu quá dài. Hãy dùng ít chữ có dấu hơn.";
  }
  return message;
}

/**
 * The API's error body, reduced to what the registration form shows.
 *
 * A 422's own message is the generic "Validation failed"; the field message
 * underneath is the one that says what to fix, so it becomes the headline —
 * that is what a toast built from this error will show.
 */
export async function readRegistrationError(response: Response): Promise<RegistrationError> {
  try {
    const body = (await response.json()) as { message?: string; errors?: Record<string, string> };
    const firstFieldMessage = body.errors ? Object.values(body.errors)[0] : undefined;
    const message = firstFieldMessage ?? body.message ?? "Đăng ký thất bại";
    return { message: translateRegistrationMessage(message), fieldErrors: body.errors };
  } catch {
    return { message: "Đăng ký thất bại" };
  }
}
