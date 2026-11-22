/** FE-06 Result return appointments (front desk): ResultReturnList. Report-5.1, sheet FE_ClinicScreens2. */
import { fireEvent, screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ResultReturnList } from "@/features/clinic/results";
import { access, api, notify, screen, sent, type Reply } from "./harness";

const due = { id: 4, appointmentId: 10, customerId: 1, customerName: "Trần Thị Bích", scheduledAt: "2026-11-22T07:00:00Z", status: "SCHEDULED", note: "Mang phim X-quang" };
const came = { ...due, id: 5, customerName: "Lê Văn Cường", status: "ARRIVED", note: null };

const open = (extra: Record<string, Reply> = {}) => {
  api({ "GET /result_returns*": { status: 200, body: [due, came] }, ...extra });
  return screen("/result-returns", "/result-returns", <ResultReturnList />);
};

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("ResultReturnList (/result-returns) — Result Return Appointments", () => {
  it("RR1 today's returns: time, patient, the visit linked, status and note; only a scheduled one has actions", async () => {
    open();
    const row = await view.findByTestId("return-4");
    expect(within(row).getByText("Đã hẹn")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "#10" })).toHaveAttribute("href", "/appointments/show/10");
    expect(within(row).getByText("Mang phim X-quang")).toBeInTheDocument();
    expect(await within(row).findByRole("button", { name: "Xác nhận đã đến" })).toBeInTheDocument();
    expect(within(view.getByTestId("return-5")).queryByRole("button")).toBeNull();
    expect(sent("GET", "/result_returns")[0].path).toMatch(/date=\d{4}-\d{2}-\d{2}/);
  });

  it("RR2 Lỡ hẹn asks every missed return whatever the day; another day asks that day", async () => {
    const user = userEvent.setup();
    open();
    await view.findByTestId("return-4");
    await user.click(view.getByRole("button", { name: "Lỡ hẹn" }));
    await waitFor(() => expect(sent("GET", "/result_returns").some((c) => /status=MISSED/.test(c.path) && !/date=/.test(c.path))).toBe(true));
    await user.click(view.getByRole("button", { name: "Tất cả" }));
    fireEvent.change(view.getByLabelText("Ngày"), { target: { value: "2026-11-25" } });
    await waitFor(() => expect(sent("GET", "/result_returns").some((c) => /date=2026-11-25/.test(c.path))).toBe(true));
  });

  it("RR3 the patient came: confirmed and said so", async () => {
    const user = userEvent.setup();
    open({ "POST /result_returns/4/arrive": { status: 200, body: { ...due, status: "ARRIVED" } } });
    await user.click(await view.findByRole("button", { name: "Xác nhận đã đến" }));
    await waitFor(() => expect(sent("POST", "/result_returns/4/arrive")).toHaveLength(1));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã xác nhận bệnh nhân đến nhận kết quả" })));
  });

  it("RR4 rescheduling needs a time; the new one is sent as Vietnam time", async () => {
    const user = userEvent.setup();
    open({ "POST /result_returns/4/reschedule": { status: 200, body: due } });
    await user.click(await view.findByRole("button", { name: "Đặt lại lịch" }));
    expect(view.getByRole("button", { name: "Lưu lịch mới" })).toBeDisabled();
    fireEvent.change(view.getByLabelText("Thời điểm mới"), { target: { value: "2026-11-25T09:30" } });
    await user.click(view.getByRole("button", { name: "Lưu lịch mới" }));
    await waitFor(() => expect(sent("POST", "/result_returns/4/reschedule")).toHaveLength(1));
    expect(sent("POST", "/result_returns/4/reschedule")[0].body).toEqual({ scheduledAt: "2026-11-25T02:30:00.000Z" });
  });

  it("RR5 cancelling asks first; a refusal is said in Vietnamese", async () => {
    const user = userEvent.setup();
    open({ "POST /result_returns/4/cancel": { status: 409, body: { status: 409, message: "This return is already closed" } } });
    await user.click(await view.findByRole("button", { name: "Huỷ" }));
    expect(await view.findByText("Huỷ hẹn trả kết quả của Trần Thị Bích?")).toBeInTheDocument();
    await user.click(within(view.getByRole("alertdialog")).getByRole("button", { name: "Huỷ hẹn" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error", message: "Lịch hẹn này đã đóng." })));
  });

  it("RR6 boundary: none that day says so; without the right there are no actions", async () => {
    api({ "GET /result_returns*": { status: 200, body: [] } });
    const { unmount } = screen("/result-returns", "/result-returns", <ResultReturnList />);
    expect(await view.findByText("Không có lịch hẹn trả kết quả.")).toBeInTheDocument();
    unmount();
    access.can = false;
    open();
    const row = await view.findByTestId("return-4");
    await waitFor(() => expect(within(row).queryByRole("button")).toBeNull());
  });
});
