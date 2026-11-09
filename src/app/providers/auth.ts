import type { AuthActionResponse, AuthProvider } from "@refinedev/core";

import { API_URL } from "@/shared/api/constants";
import { readRegistrationError, translateRegistrationMessage } from "@/shared/api/registration";
import { connect, disconnect } from "@/shared/api/live";
import {
  clearSession,
  getAccessToken,
  getAuthorities,
  getIdentity,
  getRefreshToken,
  loadAuthorities,
  refreshSession,
  revalidateAuthorities,
  saveSession,
  type Identity,
  type TokenPair,
} from "@/shared/api/session";

/**
 * Wires the `/api/auth` endpoints to the hooks Refine calls.
 *
 * This provider is the only place that talks to those endpoints; the token it
 * stores is picked up from `session.ts` by the data provider's request hooks,
 * so no page or resource ever handles a token itself.
 *
 * These calls deliberately use `fetch` rather than the shared ky instance.
 * That instance exists to attach an access token and to recover from a 401 by
 * refreshing — neither of which makes sense for the requests that produce the
 * token in the first place.
 */

/**
 * When the user last pressed "Đăng xuất". The shell's guard (`routes.tsx`) is what navigates once
 * the session is gone, racing Refine's own redirect; it reads this to send someone who left on
 * purpose home, and someone whose session expired to /login to carry on.
 */
let signedOutAt = 0;
// ponytail: 5 s window covers the guard's re-check; a flag the guard clears would need effect timing under StrictMode.
export const justSignedOut = () => Date.now() - signedOutAt < 5000;

/** The error shape `ApiExceptionHandler` produces for every non-2xx response. */
type ApiError = {
  status?: number;
  message?: string;
  errors?: Record<string, string>;
};

/**
 * The toast's heading for a failed sign-in: Refine shows the error's name as
 * the title, so it is a sentence for people, not the type of the error.
 */
const LOGIN_FAILED = "Đăng nhập không thành công";

/** Which field a sign-in refusal is about, for the form to say it there. */
export type LoginField = "phone" | "password" | null;

/**
 * The API's sign-in refusals, said again in Vietnamese, each with the field it
 * is about: the clinic wants every refusal to say exactly what is wrong.
 */
export function translateLoginMessage(message: string | undefined): { text: string; field: LoginField } {
  const m = message ?? "";
  // The same precise phone messages as registration (too few / too many digits, not digits).
  if (
    m.startsWith("Phone number has too few digits") ||
    m.startsWith("Phone number has too many digits") ||
    m.startsWith("Phone number may only contain digits")
  ) {
    return { text: translateRegistrationMessage(m), field: "phone" };
  }
  if (m.startsWith("Phone number must be a Vietnamese number") || m.startsWith("Not a valid Vietnamese phone number")) {
    return {
      text: "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam, ví dụ: 0901234567 hoặc +84901234567.",
      field: "phone",
    };
  }
  if (m.startsWith("Phone number is required")) return { text: "Vui lòng nhập số điện thoại.", field: "phone" };
  if (m.startsWith("No account uses this phone number")) {
    return { text: "Số điện thoại này chưa đăng ký tài khoản. Hãy đăng ký trước.", field: "phone" };
  }
  if (m.startsWith("Password is required")) return { text: "Vui lòng nhập mật khẩu.", field: "password" };
  if (m.startsWith("Incorrect password")) {
    return { text: "Mật khẩu không đúng. Kiểm tra lại hoặc dùng “Quên mật khẩu?”.", field: "password" };
  }
  if (m.startsWith("This account is locked")) {
    return { text: "Tài khoản đang bị khoá. Vui lòng liên hệ quản trị phòng khám để mở khoá.", field: null };
  }
  if (m.startsWith("This account is no longer active") || m.startsWith("This account no longer exists")) {
    return { text: "Tài khoản đã ngừng hoạt động. Vui lòng liên hệ phòng khám.", field: null };
  }
  if (m.startsWith("Too many")) return { text: "Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.", field: null };
  return { text: m || "Đăng nhập không thành công. Vui lòng thử lại.", field: null };
}

async function readError(response: Response, fallback: string): Promise<ApiError> {
  try {
    return (await response.json()) as ApiError;
  } catch {
    // The API always sends a body, so this only happens when something between
    // here and it did not — a proxy, or the server being down.
    return { status: response.status, message: fallback };
  }
}

/** Everything that follows receiving a token pair from a sign-in. */
async function startSession(tokens: TokenPair, errorName: string): Promise<AuthActionResponse> {
  saveSession(tokens);

  // The token says who you are and nothing more, so what this account may
  // do is a second call. Awaited rather than fired off, because the shell
  // renders its menu the moment this returns success — starting it and not
  // waiting would show every user an empty sidebar for a frame.
  if (!(await loadAuthorities(API_URL))) {
    clearSession();
    return {
      success: false,
      error: {
        name: errorName,
        message: "Đăng nhập thành công nhưng không tải được quyền của bạn. Vui lòng thử lại.",
      },
    };
  }

  // The live channel needs a token, so it cannot open before now. Opening
  // it here rather than from a component keeps it one connection for the
  // session instead of one per mount.
  connect();
  return { success: true, redirectTo: "/dashboard" };
}

export const authProvider: AuthProvider = {
  async login({ phone, password }) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) {
        const error = await readError(response, "Đăng nhập thất bại");
        const fieldMessage = error.errors ? Object.values(error.errors).find((v) => typeof v === "string") : undefined;
        const { text, field } = translateLoginMessage((fieldMessage as string | undefined) ?? error.message);
        return {
          success: false,
          // `field` rides along for the form, which says the refusal under that field.
          error: Object.assign(new Error(text), { name: LOGIN_FAILED, field }),
        };
      }

      return await startSession((await response.json()) as TokenPair, LOGIN_FAILED);
    } catch {
      return {
        success: false,
        error: {
          name: LOGIN_FAILED,
          message: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
        },
      };
    }
  },

  /**
   * Creates an account and signs it in — the API answers a registration with
   * a token pair, like a sign-in.
   *
   * A 422 carries per-field messages; they ride along on the error as
   * `fieldErrors` so the form can put each under its field instead of only in
   * a toast.
   */
  async register({ phone, otp, email, fullName, dateOfBirth, password, claimProfileId }) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, email, fullName, dateOfBirth, password, claimProfileId }),
      });

      if (!response.ok) {
        const error = await readRegistrationError(response);
        return {
          success: false,
          error: Object.assign(new Error(error.message), {
            name: "RegisterError",
            fieldErrors: error.fieldErrors,
          }),
        };
      }

      // The API answers with a token pair, but the new account signs in itself on the
      // sign-in page: hand the refresh token back so no unused session is left behind.
      const { refreshToken } = (await response.json()) as TokenPair;
      fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
      // No redirectTo: the form goes to sign-in itself, carrying the number.
      return { success: true };
    } catch {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
        },
      };
    }
  },

  /**
   * Ends the session on the server, then locally.
   *
   * The local half runs whatever the server said. A logout that reports failure
   * would leave the user looking at a dashboard they believe they have left,
   * which is worse than a refresh token that outlives its use by a few days.
   */
  async logout(params?: { redirectPath?: string }) {
    // The buttons call this bare; an expired session arrives through Refine's onError with a redirectPath.
    if (!params?.redirectPath) signedOutAt = Date.now();
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Offline, or the server is down. Nothing here can fix that, and the
        // token expires on its own.
      }
    }

    // Before clearing the session, because the socket is authenticated as the
    // account that is leaving: left open, it would go on delivering to a page
    // that has signed out, and hand the next account somebody else's channel.
    disconnect();
    clearSession();
    // Home, where every visit starts: leaving on purpose is not a request to sign in again.
    // An expired session still goes to /login (check, onError) so the user can carry on.
    return { success: true, redirectTo: params?.redirectPath ?? "/" };
  },

  /**
   * Answers whether the app may render.
   *
   * An expired access token with a live refresh token counts as authenticated:
   * reloading the page after a coffee break should restore the session, not
   * demand the password again. Only a failed refresh signs the user out.
   *
   * This is also where the permissions are guaranteed to be present and
   * current. `<Authenticated>` calls it before rendering anything inside the
   * shell, so by the time the sidebar and the access control provider read
   * their cache it is populated — which is what keeps `can` a synchronous local
   * answer rather than a request per button.
   */
  async check() {
    const signedIn =
      Boolean(getAccessToken()) ||
      (Boolean(getRefreshToken()) && Boolean(await refreshSession(API_URL)));

    if (signedIn) {
      // Reads from the server once per page load and from the cache after
      // that — Refine runs `check` on every window focus, and a request per
      // focus would buy nothing that `X-Auth-Version` has not already
      // delivered. See `revalidateAuthorities` for why the first one still
      // matters.
      //
      // What this must never do is settle for an empty list, because every
      // menu item and every button would then be hidden, which looks exactly
      // like a revoked account.
      const authorities = await revalidateAuthorities(API_URL);
      if (authorities) {
        // Idempotent, and this is the one hook that runs on every page load,
        // so it is where a reloaded tab gets its connection back.
        connect();
        return { authenticated: true };
      }
    }

    clearSession();
    return {
      authenticated: false,
      redirectTo: "/login",
      logout: true,
    };
  },

  /**
   * What to do about an error raised by a data request.
   *
   * A 401 is not handled here: by the time Refine sees one, the ky hook in
   * `data.ts` has already tried to refresh and retry, so a 401 arriving at this
   * point means the refresh failed and the session really is over.
   *
   * A 403 is deliberately *not* a logout. The user is signed in correctly and
   * simply asked for something their role does not cover; signing them out
   * would turn a missing permission into a mysterious ejection.
   */
  async onError(error) {
    if (error?.statusCode === 401 || error?.status === 401) {
      disconnect();
      clearSession();
      return { logout: true, redirectTo: "/login", error };
    }
    return {};
  },

  /**
   * The signed-in identity, served from the cached copy.
   *
   * Cached rather than fetched because it is read on every render of the header
   * and the sidebar, and it is rewritten on every login and token refresh — so
   * it is never more than one access token lifetime stale.
   */
  async getIdentity(): Promise<Identity | null> {
    return getIdentity();
  },

  /**
   * The permission codes the access control provider answers `can` from.
   *
   * Served from the cache `check` filled, so this is a local read even though
   * the codes originally came from `/auth/permissions`.
   *
   * Roles are not returned: nothing in this app authorises on a role name, and
   * offering them here would invite a check that the API would not honour.
   */
  async getPermissions(): Promise<string[]> {
    return getAuthorities()?.permissions ?? [];
  },
};
