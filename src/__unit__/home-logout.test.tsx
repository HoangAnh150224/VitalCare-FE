import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { calls, mockApi, refine, refineMock, renderAt } from "./helpers";

vi.mock("@refinedev/core", () => refineMock());

// The film at the top of the page watches the scroll; jsdom has no layout, so give it the observers it asks for.
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
(globalThis as any).IntersectionObserver = IO;
window.scrollTo = (() => {}) as any;
// The charts measure their SVG; jsdom does not lay out, so answer the identity transform.
const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return identity; } };
(SVGElement.prototype as any).getCTM = () => identity;
(SVGElement.prototype as any).getScreenCTM = () => identity;

const { Landing } = await import("@/features/public/landing");
const { PortalLayout } = await import("@/shared/components/layout/portal-layout");

const home = () => renderAt("/", "/", <Landing />);
const header = () => screen.getAllByRole("banner")[0];

describe("Landing (/) — Home Page", () => {
  beforeEach(() => {
    refine.authenticated = false;
    mockApi({});
  });

  it("HP1 header: logo to /; Cơ sở, Dịch vụ & giá, Sơ cứu go to their sections on the page", () => {
    home();
    const h = within(header());
    expect(h.getByRole("link", { name: "VitalCare" })).toHaveAttribute("href", "/");
    for (const [label, id] of [["Cơ sở", "co-so"], ["Dịch vụ & giá", "dich-vu"], ["Sơ cứu", "so-cuu"]]) {
      expect(h.getAllByRole("button", { name: label }).length).toBeGreaterThan(0);
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("HP2 guest: header offers Đăng nhập (/login) and Tạo tài khoản (/register), not the app", () => {
    home();
    const h = within(header());
    expect(h.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/login");
    expect(h.getByRole("link", { name: "Tạo tài khoản" })).toHaveAttribute("href", "/register");
    expect(h.queryByRole("link", { name: "Vào trang của tôi" })).not.toBeInTheDocument();
  });

  it("HP3 signed in: header and final call say Vào trang của tôi (/dashboard), no sign-in or sign-up", () => {
    refine.authenticated = true;
    home();
    const toApp = screen.getAllByRole("link", { name: "Vào trang của tôi" });
    expect(toApp.length).toBeGreaterThanOrEqual(2);
    toApp.forEach((a) => expect(a).toHaveAttribute("href", "/dashboard"));
    expect(screen.queryByRole("link", { name: "Tạo tài khoản" })).not.toBeInTheDocument();
    expect(within(header()).queryByRole("link", { name: "Đăng nhập" })).not.toBeInTheDocument();
  });

  it("HP4 the sections are all there", () => {
    home();
    for (const title of [
      "Mọi việc của phòng khám, trên một nền tảng",
      "VitalCare hoạt động thế nào",
      "Cơ sở khám",
      "Dịch vụ & bảng giá",
      "Hai ứng dụng, một hồ sơ",
      "Sơ cứu",
      "Tương lai của theo dõi bệnh nhân là kết nối.",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("HP5 guest final call: Tạo tài khoản and Đăng nhập", () => {
    home();
    const signups = screen.getAllByRole("link", { name: "Tạo tài khoản" });
    expect(signups.length).toBeGreaterThanOrEqual(2);
    signups.forEach((a) => expect(a).toHaveAttribute("href", "/register"));
  });

  it("HP6 footer: simulated-data notice and staff sign-in link", () => {
    home();
    expect(screen.getByText(/Số liệu trên trang là dữ liệu mô phỏng/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nhân viên phòng khám đăng nhập tại đây" })).toHaveAttribute("href", "/login");
  });

  it("HP7 opening the page reads public data only: no account API, no token", async () => {
    home();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    for (const call of calls) {
      expect(call.url.startsWith("http://api.test/api/public/")).toBe(true);
      expect(new Headers(call.init?.headers).get("Authorization")).toBeNull();
    }
  });
});

describe("PortalLayout account menu — User Logout", () => {
  beforeEach(() => {
    refine.logout = vi.fn();
    refine.logoutPending = false;
    refine.identity = { fullName: "Nguyen An", phone: "0000000131" };
  });

  const portal = () => renderAt("/dashboard", "/dashboard", <PortalLayout><p>trang</p></PortalLayout>);

  it("LO1 the account menu shows who is signed in and a Đăng xuất item", async () => {
    portal();
    await userEvent.click(screen.getAllByRole("button", { name: "Tài khoản" })[0]);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Nguyen An")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Đăng xuất/ })).toBeInTheDocument();
  });

  it("LO2 choosing Đăng xuất calls logout once", async () => {
    portal();
    await userEvent.click(screen.getAllByRole("button", { name: "Tài khoản" })[0]);
    await userEvent.click(await screen.findByRole("menuitem", { name: /Đăng xuất/ }));
    expect(refine.logout).toHaveBeenCalledTimes(1);
  });

  it("LO3 while signing out the item says Đang đăng xuất…", async () => {
    refine.logoutPending = true;
    portal();
    await userEvent.click(screen.getAllByRole("button", { name: "Tài khoản" })[0]);
    expect(await screen.findByRole("menuitem", { name: /Đang đăng xuất…/ })).toBeInTheDocument();
  });
});
