/** FE-10 Appointment Check-in at the front desk: QuickCheckIn. Report-5.1, sheet FE_ClinicScreens3. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clinicToday } from "@/features/clinic/appointments/clinic-day";
import { QuickCheckIn } from "@/features/clinic/appointments";
import { api, notify, screen, sent, type Reply } from "./harness";

vi.mock("@/shared/api/live", () => ({ subscribe: () => () => undefined }));
// The camera scanner needs a real browser; the desk types or uses a hand scanner in these tests.
vi.mock("@yudiel/react-qr-scanner", () => ({ Scanner: () => null }));

const visit = (over: Record<string, unknown> = {}) => ({
  id: 10, bookingCode: "K7M29QXA", appointmentDate: clinicToday(), startTime: "08:00:00", endTime: "08:30:00", status: "booked",
  customer: { id: 1, fullName: "Trần Thị Bích", phone: "0912345678", customerCode: "KH001", status: "neutral" },
  clinic: { id: "a", name: "VitalCare Hà Nội" }, doctor: { id: 9, fullName: "BS. Nguyễn An" }, reason: "Đau đầu",
  paidAt: null, deskPaymentChosenAt: null, queueNumber: null, examRoom: null, ...over,
});
const open = (routes: Record<string, Reply>) => {
  api({ "GET /doctors": { status: 200, body: [] }, ...routes });
  return screen("/appointments/check-in", "/appointments/check-in", <QuickCheckIn />);
};
const lookUp = async (text: string) => {
  const user = userEvent.setup();
  await user.type(await view.findByLabelText("Mã phiếu, số điện thoại hoặc CCCD"), text);
  await user.click(view.getByRole("button", { name: /Tra cứu/ }));
  return user;
};

beforeEach(() => notify.open.mockClear());

describe("QuickCheckIn (/appointments/check-in) — Appointment Check-in", () => {
  it("QC1 nothing typed: the screen says to scan or type a code, and Tra cứu is off", async () => {
    open({});
    expect(await view.findByText("Nhập hoặc quét mã để xem thông tin lượt đăng ký khám.")).toBeInTheDocument();
    expect(view.getByRole("button", { name: /Tra cứu/ })).toBeDisabled();
  });

  it("QC2 a slip's code (spaces trimmed) shows whose visit it is, when, where and why", async () => {
    open({ "GET /appointments/lookup*": { status: 200, body: visit() } });
    await lookUp("  K7M29QXA  ");
    expect(await view.findByRole("link", { name: "Trần Thị Bích" })).toHaveAttribute("href", "/customers/show/1");
    expect(view.getByText("K7M2-9QXA")).toBeInTheDocument();
    expect(view.getByText("Đau đầu")).toBeInTheDocument();
    expect(sent("GET", "/appointments/lookup")[0].path).toMatch(/code=K7M29QXA$/);
  });

  it("QC3 a customer not yet a patient, booked today, is told check-in will activate the patient record", async () => {
    open({ "GET /appointments/lookup*": { status: 200, body: visit() } });
    await lookUp("K7M29QXA");
    expect(await view.findByText(/kích hoạt hồ sơ bệnh nhân/)).toBeInTheDocument();
  });

  it("QC4 not a code: the same words are searched as phone, CCCD or name; picking a match shows it", async () => {
    open({
      "GET /appointments/lookup*": { status: 404, body: { message: "not found" } },
      "GET /appointments*": { status: 200, body: [visit()] },
    });
    const user = await lookUp("0912345678");
    const match = await view.findByRole("button", { name: /Trần Thị Bích · 0912345678/ });
    await waitFor(() => expect(sent("GET", "/appointments?").some((c) => /q=0912345678/.test(c.path))).toBe(true));
    await user.click(match);
    expect(await view.findByRole("link", { name: "Trần Thị Bích" })).toBeInTheDocument();
  });

  it("QC5 boundary: nothing found anywhere offers the walk-in screen", async () => {
    open({
      "GET /appointments/lookup*": { status: 404, body: { message: "not found" } },
      "GET /appointments*": { status: 200, body: [] },
    });
    await lookUp("zzz");
    expect(await view.findByRole("link", { name: "khám trực tiếp" })).toHaveAttribute("href", "/appointments/walk-in");
  });

  it("QC6 a lookup that fails for another reason says to try again, without a search", async () => {
    open({ "GET /appointments/lookup*": { status: 500, body: { message: "down" } } });
    await lookUp("K7M29QXA");
    expect(await view.findByText("Không tra cứu được lúc này. Vui lòng thử lại.")).toBeInTheDocument();
    expect(sent("GET", "/appointments?")).toHaveLength(0);
  });

  it("QC7 Tiếp nhận asks first, naming the patient", async () => {
    open({ "GET /appointments/lookup*": { status: 200, body: visit() } });
    const user = await lookUp("K7M29QXA");
    await user.click(await view.findByRole("button", { name: /^Tiếp nhận$/ }));
    expect(await view.findByText("Tiếp nhận Trần Thị Bích?")).toBeInTheDocument();
    expect(sent("POST", "/appointments/10")).toHaveLength(0);
  });
});
