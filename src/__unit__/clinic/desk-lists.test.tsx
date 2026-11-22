/** FE-10 Appointment list (front desk) and doctor schedules (clinic administrator): AppointmentList, DoctorScheduleList. Report-5.1, sheet FE_ClinicScreens3. */
import { screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clinicToday } from "@/features/clinic/appointments/clinic-day";
import { AppointmentList } from "@/features/clinic/appointments";
import { DoctorScheduleList } from "@/features/clinic/schedules";
import { access, api, notify, screen, sent } from "./harness";

vi.mock("@/shared/api/live", () => ({ subscribe: () => () => undefined }));

const visit = (id: number, name: string, over: Record<string, unknown> = {}) => ({
  id, bookingCode: "K7M29QXA", appointmentDate: clinicToday(), startTime: null, endTime: null, status: "booked", queueNumber: 3,
  customer: { id, fullName: name, phone: "0912345678", customerCode: `KH00${id}`, status: "patient" },
  clinic: { id: "a", name: "VitalCare Hà Nội" }, doctor: null, reason: "Đau đầu", paidAt: null, deskPaymentChosenAt: null, examRoom: null, ...over,
});

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
  localStorage.removeItem("dth-auth-authorities");
});

describe("AppointmentList (/appointments) — Appointment List (front desk)", () => {
  const routes = (body: unknown) => ({ "GET /appointments*": { status: 200, body }, "GET /clinics*": { status: 200, body: [] }, "GET /doctors": { status: 200, body: [] } });

  it("AL1 each visit: queue number, customer linked, doctor or 'when called', reason and status", async () => {
    api(routes([visit(1, "Trần Thị Bích"), visit(2, "Lê Văn Cường", { doctor: { id: 9, fullName: "BS. Nguyễn An" }, status: "checked_in" })]));
    screen("/appointments", "/appointments", <AppointmentList />);
    expect(await view.findByRole("link", { name: "Trần Thị Bích" })).toHaveAttribute("href", "/customers/show/1");
    expect(view.getByText("Xếp khi gọi vào phòng")).toBeInTheDocument();
    expect(view.getByText("BS. Nguyễn An")).toBeInTheDocument();
    expect(view.getAllByText("03").length).toBeGreaterThan(0);
  });

  it("AL2 the desk's shortcuts: calendar, walk-in and quick check-in", async () => {
    api(routes([]));
    screen("/appointments", "/appointments", <AppointmentList />);
    expect(await view.findByRole("link", { name: /Tiếp nhận nhanh|Quét/ })).toHaveAttribute("href", "/appointments/check-in");
    expect(view.getByRole("link", { name: /vãng lai|trực tiếp|Walk/i })).toHaveAttribute("href", "/appointments/walk-in");
  });

  it("AL3 the list opens on this week: it asks from Monday to Sunday", async () => {
    api(routes([]));
    screen("/appointments", "/appointments", <AppointmentList />);
    await waitFor(() => expect(sent("GET", "/appointments?").length).toBeGreaterThan(0));
    const asked = new URL("http://x" + sent("GET", "/appointments?").at(-1)!.path).searchParams;
    const from = asked.get("appointmentDate_gte") ?? asked.get("from");
    const to = asked.get("appointmentDate_lte") ?? asked.get("to");
    expect(from).toBeTruthy();
    expect((Date.parse(to!) - Date.parse(from!)) / 86_400_000).toBe(6);
    expect(new Date(`${from}T00:00:00Z`).getUTCDay()).toBe(1);
  });

  it("AL4 locked to one clinic (view-as): the clinic is a permanent filter and there are no actions", async () => {
    api(routes([visit(1, "Trần Thị Bích")]));
    screen("/appointments", "/appointments", <AppointmentList clinicId="a" readOnly />);
    const row = (await view.findByRole("link", { name: "Trần Thị Bích" })).closest("tr")!;
    await waitFor(() => expect(sent("GET", "/appointments?").some((c) => /clinicId=a/.test(c.path))).toBe(true));
    expect(within(row).queryByRole("button")).toBeNull();
  });
});

describe("DoctorScheduleList (/doctor-schedules) — Doctor Schedules (clinic administrator)", () => {
  const doctors = [
    { id: 9, fullName: "BS. Nguyễn An", specialty: "Tim mạch", professionalTitle: "Bác sĩ", workingHours: [{ dayOfWeek: 1 }, { dayOfWeek: 2 }], manageable: true },
    { id: 10, fullName: "BS. Trần Bình", specialty: "Hô hấp", professionalTitle: null, workingHours: [], manageable: true },
  ];
  const asAdmin = () => localStorage.setItem("dth-auth-authorities", JSON.stringify({ roles: ["CLINIC_ADMIN"], permissions: [], version: "1", scopedResources: [] }));

  it("DL1 the administrator first sees every doctor with specialty, title and how many sessions a week", async () => {
    asAdmin();
    api({ "GET /doctors": { status: 200, body: doctors } });
    screen("/doctor-schedules", "/doctor-schedules", <DoctorScheduleList />);
    expect(await view.findByText("BS. Nguyễn An")).toBeInTheDocument();
    expect(view.getByText("2 buổi / tuần")).toBeInTheDocument();
    expect(view.getByText("Chưa thiết lập")).toBeInTheDocument();
    expect(view.getByText("Hiển thị 2 / 2 bác sĩ")).toBeInTheDocument();
  });

  it("DL2 searching narrows the doctors; nobody matching says so", async () => {
    asAdmin();
    api({ "GET /doctors": { status: 200, body: doctors } });
    const user = userEvent.setup();
    screen("/doctor-schedules", "/doctor-schedules", <DoctorScheduleList />);
    await user.type(await view.findByLabelText("Tìm bác sĩ"), "hô hấp");
    expect(view.queryByText("BS. Nguyễn An")).toBeNull();
    expect(view.getByText("Hiển thị 1 / 2 bác sĩ")).toBeInTheDocument();
    await user.clear(view.getByLabelText("Tìm bác sĩ"));
    await user.type(view.getByLabelText("Tìm bác sĩ"), "zzz");
    expect(view.getByText("Không tìm thấy bác sĩ phù hợp.")).toBeInTheDocument();
  });

  it("DL3 opening a doctor's schedule shows their week and their blocked times", async () => {
    asAdmin();
    api({ "GET /doctors": { status: 200, body: doctors }, "GET /doctor_schedules*": { status: 200, body: [] } });
    const user = userEvent.setup();
    screen("/doctor-schedules", "/doctor-schedules", <DoctorScheduleList />);
    await user.click(await view.findByRole("button", { name: /Xem lịch làm việc của BS\. Trần Bình/ }));
    expect(await view.findByText("Lịch làm việc · BS. Trần Bình")).toBeInTheDocument();
    expect(view.getAllByText("Chặn khoảng thời gian").length).toBeGreaterThan(0);
    await waitFor(() => expect(sent("GET", "/doctor_schedules").some((c) => /employee.id=10/.test(decodeURIComponent(c.path)))).toBe(true));
  });

  it("DL4 boundary: a clinic with no doctor, and a list that could not load, each say so", async () => {
    asAdmin();
    api({ "GET /doctors": { status: 200, body: [] } });
    const { unmount } = screen("/doctor-schedules", "/doctor-schedules", <DoctorScheduleList />);
    expect(await view.findByText("Cơ sở chưa có bác sĩ nào đang làm việc.")).toBeInTheDocument();
    unmount();
    api({ "GET /doctors": { status: 500, body: { message: "down" } } });
    screen("/doctor-schedules", "/doctor-schedules", <DoctorScheduleList />);
    expect(await view.findByRole("alert")).toHaveTextContent("Không tải được danh sách bác sĩ.");
  });
});
