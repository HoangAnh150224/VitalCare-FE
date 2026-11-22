/**
 * Renders a clinic screen inside the real Refine (the app's own dataProvider and
 * resources); only fetch is fake. A screen's hooks — useTable, useForm, useShow,
 * useList, useCustomMutation — then run as they do in the app, against the
 * replies a test lists.
 */
import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { vi } from "vitest";

import { resources } from "@/app/resources";
import { dataProvider } from "@/shared/api/data";

export type Reply = { status: number; body: unknown; headers?: Record<string, string> };
export type Call = { method: string; path: string; body: unknown };

export const calls: Call[] = [];
export const notify = { open: vi.fn(), close: vi.fn() };
export const access = { can: true };

/**
 * Answers fetch by "METHOD /path" (query string included) or by "METHOD /path*"
 * for any query; anything unlisted is a 404. A list reply gets x-total-count.
 */
export function api(routes: Record<string, Reply | ((call: Call) => Reply)>) {
  calls.length = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, "") + url.search;
    // A multipart upload is recorded as such: reading a FormData body back hangs under jsdom.
    const multipart = (request.headers.get("content-type") ?? "").startsWith("multipart/");
    const text = request.method === "GET" || request.method === "HEAD" || multipart ? "" : await request.clone().text();
    let body: unknown = multipart ? "multipart" : text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      /* not JSON */
    }
    const call = { method: request.method, path, body };
    calls.push(call);
    const key = `${request.method} ${path}`;
    const bare = `${request.method} ${url.pathname.replace(/^\/api/, "")}`;
    const entry = routes[key] ?? routes[`${bare}*`] ?? (url.search ? undefined : routes[bare]);
    const reply = typeof entry === "function" ? entry(call) : entry;
    if (!reply) return new Response(JSON.stringify({ message: "not found" }), { status: 404 });
    const headers = new Headers({ "content-type": "application/json", ...(reply.headers ?? {}) });
    if (Array.isArray(reply.body) && !headers.has("x-total-count")) headers.set("x-total-count", String(reply.body.length));
    return new Response(typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body), {
      status: reply.status,
      headers,
    });
  }) as unknown as typeof fetch;
}

export const sent = (method: string, prefix: string) => calls.filter((c) => c.method === method && c.path.startsWith(prefix));

function Where() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

/** The screen at `path`, mounted on `pattern`, with every other path showing only where it went. */
export function screen(path: string, pattern: string, element: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Refine
        dataProvider={dataProvider}
        routerProvider={routerProvider}
        resources={resources}
        notificationProvider={notify}
        accessControlProvider={{ can: async () => ({ can: access.can }) }}
        options={{ reactQuery: { clientConfig: client }, disableTelemetry: true, syncWithLocation: false }}
      >
        <Routes>
          <Route path={pattern} element={<>{element}<Where /></>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </Refine>
    </MemoryRouter>,
  );
}
