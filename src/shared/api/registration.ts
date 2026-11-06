import { API_URL } from "@/shared/api/constants";

/** What an OTP request answers: a code is on its way. */
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

const REGISTER_FAILED = "Không thể gửi mã xác thực";

/** Asks the API to text a one-time registration code to this number. */
export async function requestRegistrationCode(
  phone: string
): Promise<{ ok: true; value: OtpSent } | { ok: false; error: RegistrationError }> {
  return post(`${API_URL}/auth/register/otp`, { phone }, REGISTER_FAILED);
}

/**
 * Asks for a password-recovery code to be texted to this phone number.
 *
 * The API answers the same whether or not the number has an account, so a
 * success here means only that the request was accepted.
 *
 * Plain `fetch`, like the auth provider and for the same reason: this happens
 * before there is a token, so the shared ky instance — which exists to attach
 * one and to refresh it — has nothing to do here.
 */
export async function requestPasswordResetCode(
  phone: string
): Promise<{ ok: true; value: OtpSent } | { ok: false; error: RegistrationError }> {
  return post(`${API_URL}/auth/password-reset/otp`, { phone }, RESET_FAILED);
}

/**
 * Whether the recovery code is right, without spending it — the form checks
 * it before asking for the new password. A wrong one comes back as a field
 * error on `otp` and counts toward burning the code.
 */
export async function checkPasswordResetCode(body: {
  phone: string;
  otp: string;
}): Promise<{ ok: true; value: unknown } | { ok: false; error: RegistrationError }> {
  return post(`${API_URL}/auth/password-reset/otp/check`, body, RESET_FAILED);
}

/** Sets a new password with the recovery code. Signs nobody in. */
export async function resetPassword(body: {
  phone: string;
  otp: string;
  newPassword: string;
}): Promise<{ ok: true; value: unknown } | { ok: false; error: RegistrationError }> {
  return post(`${API_URL}/auth/password-reset`, body, RESET_FAILED);
}

const RESET_FAILED = "Không đặt lại được mật khẩu";

async function post<T>(
  url: string,
  body: unknown,
  fallback?: string
): Promise<{ ok: true; value: T } | { ok: false; error: RegistrationError }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      return { ok: true, value: (await response.json()) as T };
    }
    return { ok: false, error: await readRegistrationError(response, fallback) };
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
  if (message.startsWith("A matching patient profile already exists")) {
    return "Hồ sơ bệnh nhân phù hợp đã tồn tại. Hãy tìm và chọn hồ sơ đó thay vì tạo mới.";
  }
  if (message.startsWith("Enter your date of birth to securely link")) {
    return "Đã tìm thấy hồ sơ Walk-in có cùng họ tên và số điện thoại. Nhập đúng ngày sinh để liên kết tài khoản.";
  }
  if (message.startsWith("Date of birth must be in the past")) {
    return "Ngày sinh phải là một ngày trong quá khứ.";
  }
  if (message.startsWith("More than one patient profile matches")) {
    return "Có nhiều hồ sơ phù hợp. Vui lòng liên hệ phòng khám để xác minh và liên kết tài khoản.";
  }
  // Which way a phone number is wrong, as the server tells it (PhoneNumbers.problem).
  if (message.startsWith("Phone number has too few digits")) {
    return "Số điện thoại chưa đủ 10 chữ số. Vui lòng nhập số điện thoại di động Việt Nam bắt đầu bằng 03, 05, 07, 08 hoặc 09 (hoặc dạng +84 kèm 9 chữ số).";
  }
  if (message.startsWith("Phone number has too many digits")) {
    return "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09 (hoặc dạng +84 kèm 9 chữ số).";
  }
  if (message.startsWith("Phone number cannot be all zeros")) {
    return "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam đang sử dụng.";
  }
  if (message.startsWith("Phone number may only contain digits")) {
    return "Số điện thoại chứa ký tự không hợp lệ. Chỉ nhập chữ số và ký tự phân cách như khoảng trắng, dấu chấm, gạch ngang hoặc ngoặc đơn; dấu + chỉ dùng ở đầu số.";
  }
  if (message.startsWith("Full name may only contain letters")) {
    return "Họ và tên chỉ được chứa chữ cái và khoảng trắng; không được chứa số hoặc ký tự đặc biệt.";
  }
  if (message.startsWith("Full name must contain at least 2 characters")) {
    return "Họ và tên phải có ít nhất 2 ký tự.";
  }
  if (message.startsWith("Password cannot contain only spaces")) {
    return "Mật khẩu không được chỉ chứa khoảng trắng.";
  }
  if (
    message.startsWith("Phone number must be a Vietnamese number") ||
    message.startsWith("Not a valid Vietnamese phone number")
  ) {
    return "Mã vùng hoặc đầu số không hợp lệ. Vui lòng nhập số di động Việt Nam gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09; hoặc nhập dạng +84 kèm 9 chữ số.";
  }
  if (message.startsWith("Phone number is required")) {
    return "Vui lòng nhập số điện thoại.";
  }
  if (message.startsWith("Full name is required")) {
    return "Vui lòng nhập họ và tên.";
  }
  if (message.startsWith("Full name must be at most")) {
    return "Họ và tên không được vượt quá 255 ký tự.";
  }
  if (message.startsWith("Password is required") || message.startsWith("New password is required")) {
    return "Vui lòng nhập mật khẩu.";
  }
  if (message.startsWith("Password must be between")) {
    return "Mật khẩu phải có từ 8 đến 72 ký tự.";
  }
  if (message.startsWith("The code is required")) {
    return "Vui lòng nhập mã xác thực.";
  }
  if (message.startsWith("The code is the digits")) {
    return "Mã xác thực là dãy số trong tin nhắn SMS.";
  }
  if (message.startsWith("That phone number is already in use")) {
    return "Số điện thoại này đã được đăng ký. Hãy đăng nhập.";
  }
  if (message.startsWith("That email address is already in use")) {
    return "Email này đã được dùng cho tài khoản khác.";
  }
  if (message.startsWith("Email must be a valid address")) {
    return "Email không hợp lệ.";
  }
  if (message.startsWith("Email must be at most")) {
    return "Email quá dài.";
  }
  if (message.startsWith("Please wait")) {
    return "Vừa gửi mã cho số này. Vui lòng đợi một chút trước khi yêu cầu mã mới.";
  }
  if (message.startsWith("Too many codes have been requested from this network")) {
    return "Đã yêu cầu quá nhiều mã từ mạng này. Vui lòng thử lại sau.";
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
export async function readRegistrationError(
  response: Response,
  fallback = "Đăng ký thất bại"
): Promise<RegistrationError> {
  try {
    const body = (await response.json()) as { message?: string; errors?: Record<string, string> };
    const firstFieldMessage = body.errors ? Object.values(body.errors)[0] : undefined;
    const message = firstFieldMessage ?? body.message ?? fallback;
    return { message: translateRegistrationMessage(message), fieldErrors: body.errors };
  } catch {
    return { message: fallback };
  }
}
