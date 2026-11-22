/** FE-23 Revenue Report / FE-12 Report Export: RevenueReportPage. Report-5.1, sheet FE_ClinicScreens. */
import { fireEvent, screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RevenueReportPage } from "@/features/clinic/invoices/report";
import { api, screen, sent } from "./harness";

const day = (date: string | null, paid: number) => ({
  date, invoices: 2, paidInvoices: 1, consultationRevenue: paid, serviceRevenue: 0, totalRevenue: paid, unpaidInvoices: 1, unpaidAmount: 50000,
});
const report = { from: "2026-11-01", to: "2026-11-30", days: [day("2026-11-02", 150000), day("2026-11-03", 300000)], total: day(null, 450000) };
const open = () => screen("/invoices/report", "/invoices/report", <RevenueReportPage />);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-22T03:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("RevenueReportPage (/invoices/report) — Revenue Report / Report Export", () => {
  it("RV1 by default this month in the clinic: the whole month is asked for and named", async () => {
    api({ "GET /invoices/report*": { status: 200, body: report } });
    open();
    await waitFor(() => expect(sent("GET", "/invoices/report").length).toBeGreaterThan(0));
    expect(sent("GET", "/invoices/report")[0].path).toBe("/invoices/report?from=2026-11-01&to=2026-11-30");
    expect(view.getByText(/^Từ \D*0?1\b.*2026 đến \D*30\b.*2026$/)).toBeInTheDocument();
  });

  it("RV2 another year: the same month of that year", async () => {
    api({ "GET /invoices/report*": { status: 200, body: report } });
    open();
    fireEvent.change(await view.findByLabelText("Năm"), { target: { value: "2025" } });
    await waitFor(() => expect(sent("GET", "/invoices/report").some((c) => c.path === "/invoices/report?from=2025-11-01&to=2025-11-30")).toBe(true));
  });

  it("RV3 a year that is not four digits asks for nothing and cannot be exported", async () => {
    api({ "GET /invoices/report*": { status: 200, body: report } });
    open();
    await waitFor(() => expect(sent("GET", "/invoices/report").length).toBe(1));
    fireEvent.change(view.getByLabelText("Năm"), { target: { value: "20" } });
    await new Promise((r) => setTimeout(r, 100));
    expect(sent("GET", "/invoices/report")).toHaveLength(1);
    expect(view.getByRole("button", { name: "Xuất Excel" })).toBeDisabled();
  });

  it("RV4 the report could not load: says so with Thử lại, and export is off", async () => {
    api({ "GET /invoices/report*": { status: 500, body: { message: "down" } } });
    open();
    expect((await view.findByRole("alert")).textContent).toContain("Không tải được dữ liệu báo cáo nên chưa thể xuất Excel.");
    expect(view.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Xuất Excel" })).toBeDisabled();
  });

  it("RV5 Xuất Excel builds the workbook and offers it by its period's name", async () => {
    const createObjectURL = vi.fn(() => "blob:report");
    URL.createObjectURL = createObjectURL as never;
    URL.revokeObjectURL = vi.fn();
    api({ "GET /invoices/report*": { status: 200, body: report } });
    const user = userEvent.setup();
    open();
    const button = await view.findByRole("button", { name: "Xuất Excel" });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    const link = await view.findByRole("link", { name: "Tải file đã tạo" }, { timeout: 10_000 });
    expect(link).toHaveAttribute("download", "doanh-thu-2026-11-01-2026-11-30.xlsx");
    expect(createObjectURL).toHaveBeenCalled();
  });
});
