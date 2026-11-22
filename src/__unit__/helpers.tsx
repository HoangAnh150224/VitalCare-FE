import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { vi } from "vitest";

/** What the mocked @refinedev/core hooks answer; each test sets what it needs. */
export const refine = {
  authenticated: false,
  login: vi.fn(),
  loginPending: false,
  register: vi.fn(),
  registerPending: false,
  logout: vi.fn(),
  logoutPending: false,
  identity: null as null | { fullName?: string; phone?: string },
  customMutate: vi.fn(),
  customPending: false,
  go: vi.fn(),
  notify: vi.fn(),
  can: false,
};

export const refineMock = () => ({
  useLogin: () => ({ mutate: refine.login, isPending: refine.loginPending }),
  useRegister: () => ({ mutate: refine.register, isPending: refine.registerPending }),
  useLogout: () => ({ mutate: refine.logout, isPending: refine.logoutPending }),
  useGetIdentity: () => ({ data: refine.identity }),
  useCustomMutation: () => ({ mutate: refine.customMutate, mutation: { isPending: refine.customPending } }),
  useGo: () => refine.go,
  useBreadcrumb: () => ({ breadcrumbs: [] }),
  useRefineOptions: () => ({ title: { text: "VitalCare" } }),
  useIsAuthenticated: () => ({ data: { authenticated: refine.authenticated } }),
  useNotification: () => ({ open: refine.notify }),
  useCan: () => ({ data: { can: refine.can } }),
  usePermissions: () => ({ data: [] as string[] }),
});

export type Reply = { status: number; body: unknown };
export const calls: { url: string; init?: RequestInit }[] = [];

/** Answers fetch by URL suffix; anything unlisted is a 404. */
export function mockApi(routes: Record<string, Reply | (() => Reply)>) {
  calls.length = 0;
  globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const path = String(url).replace("http://api.test/api", "");
    const entry = routes[`${init?.method ?? "GET"} ${path}`] ?? routes[path];
    const reply = typeof entry === "function" ? entry() : entry;
    if (!reply) return new Response(JSON.stringify({ message: "not found" }), { status: 404 });
    if (reply.status === 0) throw new TypeError("Failed to fetch");
    return new Response(typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body), {
      status: reply.status,
    });
  }) as unknown as typeof fetch;
}

function Where() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

export function renderAt(path: string, pattern: string, element: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={<>{element}<Where /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export const clinicA = {
  id: "a",
  name: "VitalCare Test A",
  address: "1 Lê Lợi, Q1",
  phone: "+84900000000",
  email: "a@vitalcare.vn",
  openingHours: [1, 2, 3, 4, 5, 6].flatMap((d) => [
    { dayOfWeek: d, openTime: "07:30:00", closeTime: "11:30:00" },
    { dayOfWeek: d, openTime: "13:30:00", closeTime: "16:30:00" },
  ]),
};
export const clinicB = { id: "b", name: "VitalCare Test B", address: null, phone: null, email: null, openingHours: [] };
