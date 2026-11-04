import { kyInstance } from "@/shared/api/data";

/** Sends a write; a refusal is thrown as the server's own answer, for the message to be read from. */
export async function send(method: "post" | "put" | "delete", url: string, json?: unknown) {
  const response = await kyInstance(url, { method, json, throwHttpErrors: false });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw { data: body };
  return body;
}

/** What a refusal said: `send` throws `{data}`, Refine and ky hand on the body itself. */
export const refusal = (e: unknown) => (e as { data?: unknown }).data ?? e;

/** "YYYY-MM-DDTHH:mm" from a datetime-local input, read as Vietnam time, as ISO. */
export const vnLocal = (value: string) => (value ? new Date(`${value}:00+07:00`).toISOString() : null);

/** Saves a file the API serves behind the caller's token. */
export async function download(url: string, name: string) {
  const blob = await kyInstance.get(url).blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}
