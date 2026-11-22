import { test, beforeEach, vi } from "vitest";
vi.mock("@/shared/api/session", () => import("./stubs/session"));
vi.mock("@/shared/api/live", () => import("./stubs/live"));
import assert from "node:assert/strict";
import { authProvider } from "@/app/providers/auth";
import { readRegistrationError, translateRegistrationMessage as t } from "@/shared/api/registration";
import { state } from "./stubs/session";
import { calls } from "./stubs/live";

let lastRequest: { url: string; init: RequestInit } | null = null;
const respond = (status: number, body: unknown) => {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    lastRequest = { url, init };
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
};
const input = { phone: "0912345678", otp: "123456", fullName: "Nguyen Van A", password: "Passw0rd!" };
beforeEach(() => { state.saved = null; state.cleared = 0; state.authoritiesOk = true; calls.connect = 0; lastRequest = null; });

/** Every request register makes: the registration, then handing back the unused refresh token. */
const recordAll = (status: number, body: unknown) => {
  const sent: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    sent.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return sent;
};
test("R01 register 200: account created, no session kept, form goes on to sign-in", async () => {
  const sent = recordAll(200, { accessToken: "a", refreshToken: "r" });
  const res = await authProvider.register!(input);
  assert.deepEqual(res, { success: true });
  assert.equal(sent[0].url, "http://api.test/api/auth/register");
  assert.equal(sent[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(sent[0].init.body)), input);
  assert.equal(state.saved, null);
  assert.equal(calls.connect, 0);
});
test("R02 register 200: the unused refresh token is handed back to /auth/logout", async () => {
  const sent = recordAll(200, { accessToken: "a", refreshToken: "r" });
  await authProvider.register!(input);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(sent.length, 2);
  assert.equal(sent[1].url, "http://api.test/api/auth/logout");
  assert.deepEqual(JSON.parse(String(sent[1].init.body)), { refreshToken: "r" });
});
test("R03 register 409 phone in use: translated message", async () => {
  respond(409, { status: 409, message: "That phone number is already in use", errors: {} });
  const res = await authProvider.register!(input);
  assert.equal(res.success, false);
  assert.equal(res.error!.name, "RegisterError");
  assert.equal(res.error!.message, "Số điện thoại này đã được đăng ký. Hãy đăng nhập.");
});
test("R04 register 422: fieldErrors passed through", async () => {
  respond(422, { message: "Validation failed", errors: { password: "Password is too long; use fewer accented letters" } });
  const res = await authProvider.register!(input);
  assert.equal(res.success, false);
  assert.equal(res.error!.message, "Mật khẩu quá dài. Hãy dùng ít chữ có dấu hơn.");
  assert.deepEqual((res.error as any).fieldErrors, { password: "Password is too long; use fewer accented letters" });
});
test("R05 register network failure", async () => {
  globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
  const res = await authProvider.register!(input);
  assert.equal(res.success, false);
  assert.equal(res.error!.message, "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.");
});
test("R06 register 500 with non-JSON body: fallback", async () => {
  respond(500, "<html>Bad gateway</html>");
  const res = await authProvider.register!(input);
  assert.equal(res.success, false);
  assert.equal(res.error!.message, "Đăng ký thất bại");
});
test("E01 readRegistrationError: first field message wins", async () => {
  const r = await readRegistrationError(new Response(JSON.stringify({ message: "Validation failed", errors: { email: "Email must be a valid address", phone: "x" } }), { status: 422 }));
  assert.equal(r.message, "Email không hợp lệ.");
  assert.deepEqual(r.fieldErrors, { email: "Email must be a valid address", phone: "x" });
});
test("E02 readRegistrationError: message only", async () => {
  const r = await readRegistrationError(new Response(JSON.stringify({ message: "That email address is already in use" }), { status: 409 }));
  assert.equal(r.message, "Email này đã được dùng cho tài khoản khác.");
});
test("E03 readRegistrationError: unreadable body", async () => {
  const r = await readRegistrationError(new Response("not json", { status: 502 }));
  assert.deepEqual(r, { message: "Đăng ký thất bại" });
});
const messages: [string, string, string | null][] = [
  ["T01", "That phone number is already in use", "Số điện thoại này đã được đăng ký. Hãy đăng nhập."],
  ["T02", "That email address is already in use", "Email này đã được dùng cho tài khoản khác."],
  ["T03", "Password is too long; use fewer accented letters", "Mật khẩu quá dài. Hãy dùng ít chữ có dấu hơn."],
  ["T04", "Phone number is required", null],
  ["T05", "Phone number must be a Vietnamese number, such as 0901234567 or +84901234567", null],
  ["T06", "Full name is required", null],
  ["T07", "Full name must be at most 255 characters", null],
  ["T08", "Password must be between 8 and 72 characters", null],
  ["T09", "Password is required", null],
  ["T10", "This record is still referenced by other records", null],
];
for (const [id, msg, exp] of messages) {
  test(`${id} translate "${msg}"`, () => {
    const out = t(msg);
    if (exp) assert.equal(out, exp); else assert.notEqual(out, msg, "message returned untranslated");
  });
}
