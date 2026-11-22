import { test, beforeEach, vi } from "vitest";
vi.mock("@/shared/api/session", () => import("./stubs/session"));
vi.mock("@/shared/api/live", () => import("./stubs/live"));
import assert from "node:assert/strict";
import { authProvider } from "@/app/providers/auth";
import { state } from "./stubs/session";
import { calls } from "./stubs/live";
import { guestChat, publicGet, publicRetry, PublicError } from "@/shared/api/public";
import { displayPhone, openingLines } from "@/domains/public-site/types";
import {
  FIRST_AID_CATEGORY_OPTIONS,
  GUIDANCE_DISCLAIMER,
  NATIONAL_EMERGENCY_NUMBERS,
  NOT_AN_EMERGENCY_SERVICE,
  parseGuidance,
} from "@/domains/first-aid/types";
import { chatErrorText, translateChatMessage } from "@/domains/chat/types";
import { formatMoney } from "@/shared/lib/format";
import { formatMinutes } from "@/shared/lib/format";

let last: { url: string; init?: RequestInit } | null = null;
const respond = (status: number, body: unknown) => {
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    last = { url, init };
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
};
const offline = () => {
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
};
beforeEach(() => {
  state.saved = null; state.cleared = 0; state.authoritiesOk = true; calls.connect = 0; last = null;
});

// ---------- Guest_Login: authProvider.login ----------
const creds = { phone: "0912345678", password: "Passw0rd!" };

test("LOGIN-FE1 200 + authorities: session saved, live channel opened, to /dashboard", async () => {
  const tokens = { accessToken: "a", refreshToken: "r" };
  respond(200, tokens);
  const res = await authProvider.login(creds);
  assert.deepEqual(res, { success: true, redirectTo: "/dashboard" });
  assert.equal(last!.url, "http://api.test/api/auth/login");
  assert.equal(last!.init!.method, "POST");
  assert.deepEqual(JSON.parse(String(last!.init!.body)), creds);
  assert.deepEqual(state.saved, tokens);
  assert.equal(calls.connect, 1);
});
test("LOGIN-FE2 401: the API's refusal said in Vietnamese, under its field", async () => {
  respond(401, { status: 401, message: "Incorrect password" });
  const res = await authProvider.login(creds);
  assert.equal(res.success, false);
  assert.equal(res.error!.name, "Đăng nhập không thành công");
  assert.equal(res.error!.message, "Mật khẩu không đúng. Kiểm tra lại hoặc dùng “Quên mật khẩu?”.");
  assert.equal((res.error as Error & { field?: string }).field, "password");
  assert.equal(state.saved, null);
});
test("LOGIN-FE3 error body not JSON: 'Đăng nhập thất bại'", async () => {
  respond(502, "<html>Bad gateway</html>");
  const res = await authProvider.login(creds);
  assert.equal(res.error!.message, "Đăng nhập thất bại");
});
test("LOGIN-FE4 JSON error without message: default Vietnamese message", async () => {
  respond(500, { status: 500 });
  const res = await authProvider.login(creds);
  assert.equal(res.error!.message, "Đăng nhập không thành công. Vui lòng thử lại.");
});
test("LOGIN-FE5 network down", async () => {
  offline();
  const res = await authProvider.login(creds);
  assert.equal(res.success, false);
  assert.equal(res.error!.message, "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.");
});
test("LOGIN-FE6 200 but authorities fail: session cleared, no live channel", async () => {
  respond(200, { accessToken: "a", refreshToken: "r" });
  state.authoritiesOk = false;
  const res = await authProvider.login(creds);
  assert.equal(res.success, false);
  assert.equal(res.error!.message, "Đăng nhập thành công nhưng không tải được quyền của bạn. Vui lòng thử lại.");
  assert.equal(state.cleared, 1);
  assert.equal(calls.connect, 0);
});

// ---------- Guest_ClinicInfo: openingLines, displayPhone, publicGet, publicRetry ----------
const s = (dayOfWeek: number, openTime: string, closeTime: string) => ({ dayOfWeek, openTime, closeTime });

test("CLINIC-FE1 Mon–Sat same sessions fold into one line", () => {
  const hours = [1, 2, 3, 4, 5, 6].flatMap((d) => [s(d, "07:30:00", "11:30:00"), s(d, "13:30:00", "16:30:00")]);
  assert.deepEqual(openingLines(hours), [{ days: "Thứ 2 – Thứ 7", times: "07:30–11:30, 13:30–16:30" }]);
});
test("CLINIC-FE2 Mon–Tue together, Sunday apart", () => {
  assert.deepEqual(openingLines([s(1, "08:00:00", "12:00:00"), s(2, "08:00:00", "12:00:00"), s(7, "08:00:00", "10:00:00")]), [
    { days: "Thứ 2 – Thứ 3", times: "08:00–12:00" },
    { days: "Chủ nhật", times: "08:00–10:00" },
  ]);
});
test("CLINIC-FE3 Mon and Wed same times are not consecutive", () => {
  assert.deepEqual(openingLines([s(1, "08:00:00", "12:00:00"), s(3, "08:00:00", "12:00:00")]), [
    { days: "Thứ 2", times: "08:00–12:00" },
    { days: "Thứ 4", times: "08:00–12:00" },
  ]);
});
test("CLINIC-FE4 unsorted input is sorted by day then time", () => {
  assert.deepEqual(openingLines([s(2, "13:00:00", "17:00:00"), s(1, "08:00:00", "12:00:00"), s(2, "07:00:00", "11:00:00")]), [
    { days: "Thứ 2", times: "08:00–12:00" },
    { days: "Thứ 3", times: "07:00–11:00, 13:00–17:00" },
  ]);
});
test("CLINIC-FE5 no sessions", () => {
  assert.deepEqual(openingLines([]), []);
});
test("CLINIC-FE6 displayPhone +84 → 0xxx xxx xxx", () => {
  assert.equal(displayPhone("+84900000000"), "0900 000 000");
  assert.equal(displayPhone("0912345678"), "0912 345 678");
});
test("CLINIC-FE7 displayPhone null/empty", () => {
  assert.equal(displayPhone(null), "");
  assert.equal(displayPhone(undefined), "");
  assert.equal(displayPhone(""), "");
});
test("CLINIC-FE8 displayPhone not 10 digits is left as is", () => {
  assert.equal(displayPhone("+842838123456"), "02838123456");
  assert.equal(displayPhone("1900123"), "1900123");
});
test("CLINIC-FE9 publicGet 200 returns the body", async () => {
  respond(200, [{ id: "a" }]);
  assert.deepEqual(await publicGet("clinics"), [{ id: "a" }]);
  assert.equal(last!.url, "http://api.test/api/public/clinics");
});
test("CLINIC-FE10 publicGet 404", async () => {
  respond(404, { message: "Clinic with id x was not found" });
  await assert.rejects(publicGet("clinics/x"), (e: PublicError) =>
    e instanceof PublicError && e.status === 404 && e.message === "Không tìm thấy nội dung này. Có thể nó đã được gỡ xuống.");
});
test("CLINIC-FE11 publicGet 500", async () => {
  respond(500, {});
  await assert.rejects(publicGet("clinics"), (e: PublicError) =>
    e.status === 500 && e.message === "Không tải được dữ liệu. Vui lòng thử lại sau.");
});
test("CLINIC-FE12 publicGet offline", async () => {
  offline();
  await assert.rejects(publicGet("clinics"), (e: PublicError) =>
    e.status === null && e.message === "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
});
test("CLINIC-FE13 publicRetry: 404 never, others up to twice", () => {
  assert.equal(publicRetry(0, new PublicError("x", 404)), false);
  assert.equal(publicRetry(0, new PublicError("x", 500)), true);
  assert.equal(publicRetry(1, new Error("x")), true);
  assert.equal(publicRetry(2, new Error("x")), false);
});

// ---------- Guest_ClinicServices: formatMoney, formatMinutes ----------
test("SVC-FE1 formatMoney groups the Vietnamese way", () => {
  assert.equal(formatMoney(270000), "270.000 ₫");
  assert.equal(formatMoney(1500000), "1.500.000 ₫");
});
test("SVC-FE2 formatMoney 0", () => assert.equal(formatMoney(0), "0 ₫"));
test("SVC-FE3 formatMoney null/undefined", () => {
  assert.equal(formatMoney(null), "—");
  assert.equal(formatMoney(undefined), "—");
});
test("SVC-FE4 formatMoney rounds to whole đồng", () => assert.equal(formatMoney(150000.6), "150.001 ₫"));
test("SVC-FE5 formatMinutes under an hour", () => {
  assert.equal(formatMinutes(45), "45 phút");
  assert.equal(formatMinutes(59), "59 phút");
});
test("SVC-FE6 formatMinutes whole hours", () => {
  assert.equal(formatMinutes(60), "1 giờ");
  assert.equal(formatMinutes(120), "2 giờ");
});
test("SVC-FE7 formatMinutes hours and minutes", () => assert.equal(formatMinutes(90), "1 giờ 30 phút"));

// ---------- Guest_FirstAid ----------
test("FA-FE1 category chips: seven, in order, with labels", () => {
  assert.deepEqual(FIRST_AID_CATEGORY_OPTIONS.map((o) => o.value),
    ["respiratory", "fainting", "fever", "wound", "injury", "environment", "general"]);
  assert.deepEqual(FIRST_AID_CATEGORY_OPTIONS.map((o) => o.label),
    ["Hô hấp", "Ngất xỉu", "Sốt", "Vết thương", "Chấn thương", "Môi trường", "Tổng quát"]);
});
test("FA-FE2 list request: q and category on the query string", async () => {
  respond(200, []);
  const search = new URLSearchParams();
  search.set("q", "sốt");
  search.set("category", "fever");
  await publicGet(`first_aid?${search}`);
  assert.equal(last!.url, "http://api.test/api/public/first_aid?q=s%E1%BB%91t&category=fever");
});

// ---------- Guest_FirstAidDetail: parseGuidance ----------
test("FAD-FE1 heading", () => assert.deepEqual(parseGuidance("## Làm ngay"), [{ kind: "heading", text: "Làm ngay" }]));
test("FAD-FE2 numbered steps, '.' or ')'", () =>
  assert.deepEqual(parseGuidance("1. Cho nạn nhân nằm\n2) Nới lỏng quần áo"),
    [{ kind: "steps", items: ["Cho nạn nhân nằm", "Nới lỏng quần áo"] }]));
test("FAD-FE3 bullets with -, * and •", () =>
  assert.deepEqual(parseGuidance("- a\n* b\n• c"), [{ kind: "bullets", items: ["a", "b", "c"] }]));
test("FAD-FE4 lines of a paragraph join; a blank line splits", () =>
  assert.deepEqual(parseGuidance("Dòng một\nDòng hai\n\nĐoạn mới"), [
    { kind: "paragraph", text: "Dòng một Dòng hai" },
    { kind: "paragraph", text: "Đoạn mới" },
  ]));
test("FAD-FE5 a blank line between steps starts a new list", () =>
  assert.deepEqual(parseGuidance("1. a\n\n2. b"), [
    { kind: "steps", items: ["a"] },
    { kind: "steps", items: ["b"] },
  ]));
test("FAD-FE6 empty body", () => {
  assert.deepEqual(parseGuidance(""), []);
  assert.deepEqual(parseGuidance("\n  \n"), []);
});
test("FAD-FE7 HTML is kept as text", () =>
  assert.deepEqual(parseGuidance("<b>x</b><script>alert(1)</script>"),
    [{ kind: "paragraph", text: "<b>x</b><script>alert(1)</script>" }]));
test("FAD-FE8 Windows line endings", () =>
  assert.deepEqual(parseGuidance("## A\r\n1. b\r\n- c"), [
    { kind: "heading", text: "A" },
    { kind: "steps", items: ["b"] },
    { kind: "bullets", items: ["c"] },
  ]));
test("FAD-FE9 detail request and disclaimer", async () => {
  respond(200, { id: 5 });
  await publicGet("first_aid/5");
  assert.equal(last!.url, "http://api.test/api/public/first_aid/5");
  assert.equal(GUIDANCE_DISCLAIMER, "Hướng dẫn tham khảo, không dùng để chẩn đoán hoặc thay thế chăm sóc y tế.");
});

// ---------- Guest_Emergency ----------
test("EM-FE1 national numbers 115, 114, 113", () => {
  assert.deepEqual(NATIONAL_EMERGENCY_NUMBERS.map((n) => `${n.number} ${n.label}`),
    ["115 Cấp cứu y tế", "114 Cứu hoả, cứu nạn", "113 Công an"]);
});
test("EM-FE2 not an emergency service", () =>
  assert.equal(NOT_AN_EMERGENCY_SERVICE,
    "VitalCare không phải dịch vụ cấp cứu. Trong tình huống nguy hiểm đến tính mạng, hãy gọi 115 ngay."));

// ---------- Guest_Chat: chatErrorText, translateChatMessage, guestChat ----------
test("CHAT-FE1 field message first", () =>
  assert.equal(chatErrorText({ message: "Validation failed", errors: { phone: "Give a valid phone number" } }),
    "Số điện thoại không hợp lệ."));
test("CHAT-FE2 rate limit message", () =>
  assert.equal(chatErrorText({ message: "Too many conversations have been started from this network; try again later" }),
    "Đã mở quá nhiều cuộc trò chuyện từ mạng này. Vui lòng thử lại sau."));
test("CHAT-FE3 nothing to say", () => {
  assert.equal(chatErrorText(null), "Không gửi được. Vui lòng thử lại.");
  assert.equal(chatErrorText({ status: 500 } as never), "Không gửi được. Vui lòng thử lại.");
});
test("CHAT-FE4 unknown message passes through", () =>
  assert.equal(translateChatMessage("Something else"), "Something else"));
test("CHAT-FE5 lost conversation", () =>
  assert.equal(translateChatMessage("Conversation with id 9 was not found"),
    "Không tìm thấy cuộc trò chuyện. Có thể nó đã bị xoá."));
test("CHAT-FE6 start: POST JSON, no token", async () => {
  respond(201, { conversation: { id: 9 }, token: "t" });
  const body = { clinicId: "c", name: "Lan", phone: "0901234567", text: "hi" };
  assert.deepEqual(await guestChat.start(body), { conversation: { id: 9 }, token: "t" });
  assert.equal(last!.url, "http://api.test/api/public/chat");
  assert.equal(last!.init!.method, "POST");
  const headers = last!.init!.headers as Record<string, string>;
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["X-Chat-Token"], undefined);
  assert.deepEqual(JSON.parse(String(last!.init!.body)), body);
});
test("CHAT-FE7 send: X-Chat-Token and {text}", async () => {
  respond(200, { id: 2 });
  await guestChat.send(9, "tok", "Còn một câu");
  assert.equal(last!.url, "http://api.test/api/public/chat/9/messages");
  assert.equal((last!.init!.headers as Record<string, string>)["X-Chat-Token"], "tok");
  assert.deepEqual(JSON.parse(String(last!.init!.body)), { text: "Còn một câu" });
});
test("CHAT-FE8 422: rejects with status and the API body", async () => {
  respond(422, { message: "Validation failed", errors: { phone: "Give a valid phone number" } });
  await assert.rejects(guestChat.start({}), (e: any) =>
    e.status === 422 && e.errors.phone === "Give a valid phone number");
});
test("CHAT-FE9 error body not JSON: status only", async () => {
  respond(500, "oops");
  await assert.rejects(guestChat.thread(9, "tok"), (e: any) => JSON.stringify(e) === JSON.stringify({ status: 500 }));
});
test("CHAT-FE10 offline", async () => {
  offline();
  await assert.rejects(guestChat.send(9, "tok", "hi"), (e: any) =>
    e.status === null && e.message === "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
});
test("CHAT-FE11 image: multipart with file, token, no JSON content type", async () => {
  respond(200, { id: 3 });
  await guestChat.image(9, "tok", new File([new Uint8Array([0x89, 0x50])], "a.png", { type: "image/png" }));
  assert.equal(last!.url, "http://api.test/api/public/chat/9/images");
  assert.ok(last!.init!.body instanceof FormData);
  const headers = last!.init!.headers as Record<string, string>;
  assert.equal(headers["Content-Type"], undefined);
  assert.equal(headers["X-Chat-Token"], "tok");
});
