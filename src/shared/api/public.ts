import { API_URL } from "@/shared/api/constants";

/**
 * Reads from `/api/public`, the part of the API open to everybody.
 *
 * Plain `fetch`, like `registration.ts` and for the same reason: no token is
 * involved, and the shared ky instance would try to attach one, refresh it on
 * a 401 and sign the visitor out — none of which means anything here. A
 * signed-in visitor reads the same pages the same way.
 *
 * Throws a `PublicError` whose message is already Vietnamese, for `useQuery`.
 */
export class PublicError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.status = status;
  }
}

/**
 * For `useQuery`'s `retry`: a page that is not there will not appear on a
 * second try, so a 404 is shown at once; anything else is tried twice more.
 */
export const publicRetry = (failures: number, error: Error) =>
  !(error instanceof PublicError && error.status === 404) && failures < 2;

export async function publicGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/public/${path}`);
  } catch {
    throw new PublicError(
      "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
    );
  }
  if (response.status === 404) {
    throw new PublicError(
      "Không tìm thấy nội dung này. Có thể nó đã được gỡ xuống.",
      404
    );
  }
  if (!response.ok) {
    throw new PublicError(
      "Không tải được dữ liệu. Vui lòng thử lại sau.",
      response.status
    );
  }
  return (await response.json()) as T;
}

/** The API's own error body, kept on a guest-chat failure for the screen to word. */
export type PublicApiError = {
  status: number | null;
  message?: string;
  errors?: Record<string, unknown>;
};

/**
 * The guest chat, under `/api/public/chat`. A conversation is reached with the
 * token handed back when it was started, sent as `X-Chat-Token`; nothing else
 * identifies a guest. Every failure rejects with a `PublicApiError`.
 */
export const guestChat = {
  start: <T>(body: unknown) =>
    publicSend<T>("POST", "chat", null, { json: body }),
  thread: <T>(id: number, token: string) =>
    publicSend<T>("GET", `chat/${id}`, token),
  send: <T>(id: number, token: string, text: string) =>
    publicSend<T>("POST", `chat/${id}/messages`, token, { json: { text } }),
  image: <T>(id: number, token: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return publicSend<T>("POST", `chat/${id}/images`, token, { form });
  },
  loadImage: async (
    id: number,
    token: string,
    messageId: number
  ): Promise<Blob> => {
    const response = await fetch(
      `${API_URL}/public/chat/${id}/images/${messageId}`,
      {
        headers: { "X-Chat-Token": token },
      }
    );
    if (!response.ok)
      throw { status: response.status } satisfies PublicApiError;
    return response.blob();
  },
};

async function publicSend<T>(
  method: "GET" | "POST",
  path: string,
  token: string | null,
  body: { json?: unknown; form?: FormData } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["X-Chat-Token"] = token;
  if (body.json !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(`${API_URL}/public/${path}`, {
      method,
      headers,
      body:
        body.form ??
        (body.json !== undefined ? JSON.stringify(body.json) : undefined),
    });
  } catch {
    throw {
      status: null,
      message: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
    } satisfies PublicApiError;
  }
  if (!response.ok) {
    let error: PublicApiError = { status: response.status };
    try {
      error = {
        status: response.status,
        ...((await response.json()) as object),
      };
    } catch {
      // A body that is not JSON says nothing more than the status.
    }
    throw error;
  }
  return (await response.json()) as T;
}
