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
