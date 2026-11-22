import { test, beforeEach, vi } from "vitest";
vi.mock("@/shared/api/session", () => import("./stubs/session"));
vi.mock("@/shared/api/live", () => import("./stubs/live"));
import assert from "node:assert/strict";
import { authProvider } from "@/app/providers/auth";
import { state } from "./stubs/session";
import { calls } from "./stubs/live";

// ---------- User_Logout: authProvider.logout / onError / check ----------
let sent: { url: string; init?: RequestInit }[] = [];
const respond = (status: number) => {
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    sent.push({ url, init });
    return new Response("{}", { status });
  }) as typeof fetch;
};
beforeEach(() => {
  state.saved = null; state.cleared = 0; state.access = null; state.refresh = null;
  calls.connect = 0; calls.disconnect = 0; sent = [];
});

test("LOGOUT-FE1 with a refresh token: POST /auth/logout with it, live channel closed, session cleared, to the home page /", async () => {
  state.access = "access.jwt"; state.refresh = "refresh-raw";
  respond(204);
  const result = await authProvider.logout({});
  assert.equal(sent.length, 1);
  assert.match(sent[0].url, /\/auth\/logout$/);
  assert.equal(sent[0].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(sent[0].init?.body)), { refreshToken: "refresh-raw" });
  assert.equal(calls.disconnect, 1);
  assert.equal(state.cleared, 1);
  assert.equal(state.refresh, null);
  assert.deepEqual(result, { success: true, redirectTo: "/" });
});

test("LOGOUT-FE2 no refresh token: no request, still cleared and sent to the home page /", async () => {
  respond(204);
  const result = await authProvider.logout({});
  assert.equal(sent.length, 0);
  assert.equal(state.cleared, 1);
  assert.equal(calls.disconnect, 1);
  assert.deepEqual(result, { success: true, redirectTo: "/" });
});

test("LOGOUT-FE3 server down (network error): signs out locally anyway", async () => {
  state.refresh = "refresh-raw";
  globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
  const result = await authProvider.logout({});
  assert.equal(state.cleared, 1);
  assert.equal(calls.disconnect, 1);
  assert.deepEqual(result, { success: true, redirectTo: "/" });
});

test("LOGOUT-FE4 server answers 500: signs out locally anyway", async () => {
  state.refresh = "refresh-raw";
  respond(500);
  const result = await authProvider.logout({});
  assert.equal(sent.length, 1);
  assert.equal(state.cleared, 1);
  assert.deepEqual(result, { success: true, redirectTo: "/" });
});

test("LOGOUT-FE5 onError 401 (refresh already failed): forced logout to /login", async () => {
  const result = await authProvider.onError!({ statusCode: 401 });
  assert.equal(result.logout, true);
  assert.equal(result.redirectTo, "/login");
  assert.equal(state.cleared, 1);
  assert.equal(calls.disconnect, 1);
});

test("LOGOUT-FE6 onError 403 (no permission): NOT a logout", async () => {
  const result = await authProvider.onError!({ statusCode: 403 });
  assert.deepEqual(result, {});
  assert.equal(state.cleared, 0);
  assert.equal(calls.disconnect, 0);
});

test("LOGOUT-FE7 check() after logout (no tokens): unauthenticated, redirect /login", async () => {
  const result = await authProvider.check();
  assert.equal(result.authenticated, false);
  assert.equal(result.redirectTo, "/login");
  assert.equal(result.logout, true);
});
