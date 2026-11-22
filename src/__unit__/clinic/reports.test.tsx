/** FE-12 Clinic Reports / BF-10 Monitoring Dashboard: ReportsPage and MonitoringDashboard. Report-5.1, sheet FE_ClinicScreens2. */
import { fireEvent, screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MonitoringDashboard, ReportsPage } from "@/features/clinic/reports";
import { access, api, notify, screen, sent, type Reply } from "./harness";

const patients = {
  kind: "patients", clinicId: "a", from: "2026-11-01", to: "2026-11-22",
  summary: { patients: 2, newPatients: 1, monitored: 1, visits: 3 },
  rows: [
    { customerCode: "KH001", fullName: "Trần Thị Bích", dateOfBirth: "1990-05-01", visits: 2, lastVisit: "2026-11-20", monitored: true, readings: 1200, alerts: 3, criticalAlerts: 1 },
    { customerCode: "KH002", fullName: "Bé Na", dateOfBirth: null, visits: 1, lastVisit: null, monitored: false, readings: 0, alerts: 0, criticalAlerts: 0 },
  ],
};
const dashboard = {
  clinicId: "a", generatedAt: "2026-11-22T02:00:00Z", monitoredPatients: 12,
  devices: { total: 20, online: 15, offline: 5, assigned: 12, available: 8, lowBattery: 2 },
  alerts: { openCritical: 3, openWarning: 4, acknowledged: 1, raisedToday: 6 },
  appointmentsToday: { total: 30, scheduled: 10, awaitingPayment: 2, waiting: 5, inExam: 3, awaitingResults: 1, completed: 8, cancelled: 1 },
  sync: { openFailures: 7, batchesToday: 40, rejectedToday: 2, lastSyncAt: "2026-11-22T01:59:00Z" },
  intake: { lastHour: 88, lastDay: 1500, invalidLastDay: 4, lastReadingAt: "2026-11-22T01:59:00Z" },
  alertsByDay: [{ date: "2026-11-22", critical: 1, warning: 2 }],
  recentCritical: [{ id: 41, customerId: 1, customerName: "Trần Thị Bích", metric: "SPO2", measuredValue: 86, status: "OPEN", triggeredAt: "2026-11-22T01:00:00Z" }],
};

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("ReportsPage (/reports) — Clinic Summary Reports", () => {
  const open = (extra: Record<string, Reply> = {}) => {
    api({ "GET /reports/patients*": { status: 200, body: patients }, "GET /reports/devices*": { status: 200, body: { ...patients, kind: "devices", summary: { devices: 4 }, rows: [] } }, ...extra });
    return screen("/reports", "/reports", <ReportsPage />);
  };

  it("RP1 the patients report for this month: figures and a row per patient, yes/no and dates in Vietnamese", async () => {
    open();
    await waitFor(() => expect(within(view.getByTestId("figure-patients")).getByText("2")).toBeInTheDocument());
    expect(within(view.getByTestId("figure-visits")).getByText("3")).toBeInTheDocument();
    const table = view.getByTestId("report-table");
    expect(within(table).getByText("Trần Thị Bích")).toBeInTheDocument();
    expect(within(table).getByText("01/05/1990")).toBeInTheDocument();
    expect(within(table).getByText("Có")).toBeInTheDocument();
    expect(within(table).getByText("1.200")).toBeInTheDocument();
    expect(sent("GET", "/reports/patients")[0].path).toMatch(/from=\d{4}-\d{2}-01&to=\d{4}-\d{2}-\d{2}/);
  });

  it("RP2 another tab asks for that report", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("tab", { name: "Thiết bị" }));
    expect(view.getByRole("tab", { name: "Thiết bị" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(sent("GET", "/reports/devices").length).toBeGreaterThan(0));
    expect(await view.findByText("Không có dữ liệu trong khoảng ngày này.")).toBeInTheDocument();
  });

  it("RP3 an end before the start is said and not asked; export is off", async () => {
    open();
    await view.findByTestId("report-table");
    const before = sent("GET", "/reports/patients").length;
    fireEvent.change(view.getByLabelText("Từ ngày"), { target: { value: "2026-12-31" } });
    fireEvent.change(view.getByLabelText("Đến ngày"), { target: { value: "2026-12-01" } });
    expect(await view.findByText("Ngày bắt đầu phải trước ngày kết thúc.")).toBeInTheDocument();
    expect(view.getByRole("button", { name: /Xuất Excel/ })).toBeDisabled();
    expect(sent("GET", "/reports/patients").filter((c) => /from=2026-12-31/.test(c.path))).toHaveLength(0);
    expect(sent("GET", "/reports/patients").length).toBeGreaterThanOrEqual(before);
  });

  it("RP4 an account with no clinic is told so in Vietnamese", async () => {
    open({ "GET /reports/patients*": { status: 409, body: { status: 409, message: "These figures are a clinic's; your account has no clinic" } } });
    expect(await view.findByRole("alert")).toHaveTextContent("Tài khoản của bạn chưa gắn với cơ sở nào.");
  });

  it("RP5 boundary: a period of a single day is accepted and asked", async () => {
    open();
    await view.findByTestId("report-table");
    fireEvent.change(view.getByLabelText("Từ ngày"), { target: { value: "2026-11-22" } });
    fireEvent.change(view.getByLabelText("Đến ngày"), { target: { value: "2026-11-22" } });
    await waitFor(() => expect(sent("GET", "/reports/patients").some((c) => /from=2026-11-22&to=2026-11-22/.test(c.path))).toBe(true));
    expect(view.queryByText("Ngày bắt đầu phải trước ngày kết thúc.")).toBeNull();
  });

  it("RP6 without the export right there is no Excel button", async () => {
    access.can = false;
    open();
    await view.findByTestId("report-table");
    expect(view.queryByRole("button", { name: /Xuất Excel/ })).toBeNull();
  });
});

describe("MonitoringDashboard (/monitoring) — Clinic Monitoring Dashboard", () => {
  it("MD1 the tiles: monitored patients, devices online of all, open critical alerts with the rest, today's visits", async () => {
    api({ "GET /monitoring_dashboard*": { status: 200, body: dashboard } });
    screen("/monitoring", "/monitoring", <MonitoringDashboard />);
    expect(await view.findByText("Bệnh nhân đang theo dõi")).toBeInTheDocument();
    expect(view.getByText("15/20")).toBeInTheDocument();
    const alerts = view.getByTestId("tile-alerts");
    expect(within(alerts).getByText("3")).toBeInTheDocument();
    expect(within(alerts).getByText("4 mức cảnh báo · 1 đã tiếp nhận")).toBeInTheDocument();
    expect(alerts).toHaveAttribute("href", "/alerts");
  });

  it("MD2 open critical alerts are listed and link to the alert", async () => {
    api({ "GET /monitoring_dashboard*": { status: 200, body: dashboard } });
    screen("/monitoring", "/monitoring", <MonitoringDashboard />);
    const link = (await view.findByText("Trần Thị Bích")).closest("a");
    expect(link).toHaveAttribute("href", "/alerts/show/41");
    expect(view.getByText("Mới")).toBeInTheDocument();
  });

  it("MD3 boundary: no open critical alert says so", async () => {
    api({ "GET /monitoring_dashboard*": { status: 200, body: { ...dashboard, recentCritical: [] } } });
    screen("/monitoring", "/monitoring", <MonitoringDashboard />);
    expect(await view.findByText("Không có cảnh báo khẩn cấp nào đang mở.")).toBeInTheDocument();
  });

  it("MD4 figures that could not load say so", async () => {
    api({ "GET /monitoring_dashboard*": { status: 500, body: { message: "down" } } });
    screen("/monitoring", "/monitoring", <MonitoringDashboard />);
    expect(await view.findByText(/Không tải được số liệu/)).toBeInTheDocument();
  });

  it("MD5 a viewer who may not open the lists gets the figures without links (KAN-135)", async () => {
    access.can = false;
    api({ "GET /monitoring_dashboard*": { status: 200, body: dashboard } });
    screen("/monitoring", "/monitoring", <MonitoringDashboard />);
    expect((await view.findByText("Trần Thị Bích")).closest("a")).toBeNull();
    expect(view.getByTestId("tile-alerts")).not.toHaveAttribute("href");
    expect(within(view.getByTestId("tile-alerts")).getByText("3")).toBeInTheDocument();
  });
});
