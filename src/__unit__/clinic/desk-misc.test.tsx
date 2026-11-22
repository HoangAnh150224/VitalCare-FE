/** FE-23 Invoices, FE-10 Block doctor time, FE-09 Emergency / shared patients, view-as picker. Report-5.1, sheet FE_ClinicScreens3. */
import { fireEvent, screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { InvoiceList, InvoiceShow } from "@/features/clinic/invoices";
import { DoctorScheduleCreate } from "@/features/clinic/schedules";
import { EmergencyShow, SharedPatientList } from "@/features/clinic/sharing";
import { ViewAsPick } from "@/features/clinic/view-as";
import { access, api, notify, screen, sent } from "./harness";

const invoice = {
  id: 21, invoiceNumber: "HD-0021", status: "unpaid", kind: "exam", serviceOrderId: null,
  patient: { id: 1, customerCode: "KH001", fullName: "Trần Thị Bích", phone: "0912345678" }, clinic: { id: "a", name: "VitalCare Hà Nội" },
  appointmentId: 10, encounterId: 20, issuedAt: "2026-11-22T01:00:00Z", paidAt: null, subtotal: 150000, totalAmount: 150000,
  items: [{ description: "Khám bệnh", category: "consultation", quantity: 1, unitPrice: 150000, amount: 150000, serviceOrderId: null }],
  payments: [],
};

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("InvoiceList / InvoiceShow (/invoices) — Invoices", () => {
  it("IV1 each bill: number, patient and phone, total in đồng, status", async () => {
    api({ "GET /invoices*": { status: 200, body: [invoice, { ...invoice, id: 22, invoiceNumber: "HD-0022", status: "paid" }] } });
    screen("/invoices", "/invoices", <InvoiceList />);
    expect(await view.findByText("HD-0021")).toBeInTheDocument();
    expect(view.getAllByText("150.000 ₫")).toHaveLength(2);
    expect(view.getByText("Chưa thanh toán")).toBeInTheDocument();
    expect(view.getByText("Đã thanh toán")).toBeInTheDocument();
  });

  it("IV2 an unpaid bill offers recording a payment and prints as a bill; the encounter is linked", async () => {
    api({ "GET /invoices/21": { status: 200, body: invoice } });
    screen("/invoices/show/21", "/invoices/show/:id", <InvoiceShow />);
    expect(await view.findByRole("button", { name: /Ghi nhận thanh toán/ })).toBeInTheDocument();
    expect(view.getByRole("button", { name: /In hóa đơn/ })).toBeInTheDocument();
    expect(view.getByRole("link", { name: "#20" })).toHaveAttribute("href", "/clinical-encounters/show/20");
  });

  it("IV3 a paid bill prints as a receipt and cannot be paid again; without the right nobody records a payment", async () => {
    api({ "GET /invoices/21": { status: 200, body: { ...invoice, status: "paid", paidAt: "2026-11-22T02:00:00Z" } } });
    const { unmount } = screen("/invoices/show/21", "/invoices/show/:id", <InvoiceShow />);
    expect(await view.findByRole("button", { name: /In biên lai/ })).toBeInTheDocument();
    expect(view.queryByRole("button", { name: /Ghi nhận thanh toán/ })).toBeNull();
    unmount();
    access.can = false;
    api({ "GET /invoices/21": { status: 200, body: invoice } });
    screen("/invoices/show/21", "/invoices/show/:id", <InvoiceShow />);
    expect(await view.findByRole("button", { name: /In hóa đơn/ })).toBeInTheDocument();
    expect(view.queryByRole("button", { name: /Ghi nhận thanh toán/ })).toBeNull();
  });
});

describe("DoctorScheduleCreate (/doctor-schedules/create) — Block Doctor Time", () => {
  const doctors = { "GET /doctors": { status: 200, body: [{ id: 9, fullName: "BS. Nguyễn An" }] } };

  it("BT1 opened without a doctor it says to open it from the doctor's schedule", async () => {
    api(doctors);
    screen("/doctor-schedules/create", "/doctor-schedules/create", <DoctorScheduleCreate />);
    expect(await view.findByText(/Mở màn này từ "Lịch làm việc bác sĩ"/)).toBeInTheDocument();
  });

  it("BT2 empty fields and an end before the start are refused; nothing is sent", async () => {
    api(doctors);
    const user = userEvent.setup();
    screen("/doctor-schedules/create?doctorId=9", "/doctor-schedules/create", <DoctorScheduleCreate />);
    expect(await view.findByText("Chặn khoảng thời gian — BS. Nguyễn An")).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Chặn khoảng thời gian" }));
    expect(await view.findByText("Vui lòng chọn ngày")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập giờ bắt đầu")).toBeInTheDocument();
    fireEvent.change(view.getByLabelText("Ngày"), { target: { value: "2026-11-25" } });
    fireEvent.change(view.getByLabelText("Từ"), { target: { value: "10:00" } });
    fireEvent.change(view.getByLabelText("Đến"), { target: { value: "09:00" } });
    await user.click(view.getByRole("button", { name: "Chặn khoảng thời gian" }));
    expect(await view.findByText("Giờ kết thúc phải sau giờ bắt đầu")).toBeInTheDocument();
    expect(sent("POST", "/doctor_schedules")).toHaveLength(0);
  });

  it("BT3 a valid block is sent for that doctor and the list opens", async () => {
    api({ ...doctors, "POST /doctor_schedules": { status: 200, body: { id: 5 } } });
    const user = userEvent.setup();
    screen("/doctor-schedules/create?doctorId=9", "/doctor-schedules/create", <DoctorScheduleCreate />);
    fireEvent.change(await view.findByLabelText("Ngày"), { target: { value: "2026-11-25" } });
    fireEvent.change(view.getByLabelText("Từ"), { target: { value: "09:00" } });
    fireEvent.change(view.getByLabelText("Đến"), { target: { value: "10:00" } });
    await user.type(view.getByPlaceholderText("Không khả dụng"), "Họp chuyên môn");
    await user.click(view.getByRole("button", { name: "Chặn khoảng thời gian" }));
    await waitFor(() => expect(sent("POST", "/doctor_schedules")).toHaveLength(1));
    expect(sent("POST", "/doctor_schedules")[0].body).toEqual({
      employeeId: 9, workDate: "2026-11-25", startTime: "09:00", endTime: "10:00", note: "Họp chuyên môn",
    });
  });

  it("BT4 boundary: a reason over 255 characters is refused", async () => {
    api(doctors);
    const user = userEvent.setup();
    screen("/doctor-schedules/create?doctorId=9", "/doctor-schedules/create", <DoctorScheduleCreate />);
    await user.click(await view.findByPlaceholderText("Không khả dụng"));
    await user.paste("x".repeat(256));
    await user.click(view.getByRole("button", { name: "Chặn khoảng thời gian" }));
    expect(await view.findByText("Tối đa 255 ký tự")).toBeInTheDocument();
  });
});

describe("EmergencyShow / SharedPatientList — FE-09 caregiver side", () => {
  const notice = {
    id: 7, alertId: 41, severity: "CRITICAL", message: "SpO₂ 86% — dưới ngưỡng an toàn", customerId: 1, patientName: "Trần Thị Bích",
    emergencyPhone: "+84987654321", status: "PENDING", notifiedAt: "2026-11-22T01:00:00Z", acknowledgedAt: null, escalatedAt: null, calls: [],
  };

  it("EM1 an emergency: patient, message, status, no calls yet; Tôi đã biết acknowledges it", async () => {
    api({
      "GET /emergency_alerts/7": { status: 200, body: notice },
      "POST /emergency_alerts/7/acknowledge": { status: 200, body: { ...notice, status: "ACKNOWLEDGED", acknowledgedAt: "2026-11-22T01:02:00Z" } },
    });
    const user = userEvent.setup();
    screen("/emergency/7", "/emergency/:id", <EmergencyShow />);
    expect(await view.findByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getByText("Chờ xác nhận")).toBeInTheDocument();
    expect(view.getByText("Chưa gọi ai.")).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Tôi đã biết" }));
    await waitFor(() => expect(sent("POST", "/emergency_alerts/7/acknowledge")).toHaveLength(1));
    expect(await view.findByText("Đã xác nhận")).toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Tôi đã biết" })).toBeNull();
  });

  it("EM2 escalated: the call log lists each call or SMS with its outcome; an unknown alert says not found", async () => {
    api({ "GET /emergency_alerts/7": { status: 200, body: { ...notice, status: "ESCALATED", calls: [
      { id: 1, channel: "CALL", phone: "0987654321", placedAt: "2026-11-22T01:05:00Z", outcome: "NO_ANSWER", detail: null },
      { id: 2, channel: "SMS", phone: "0987654321", placedAt: "2026-11-22T01:06:00Z", outcome: "SENT", detail: "Đã gửi" },
    ] } } });
    const { unmount } = screen("/emergency/7", "/emergency/:id", <EmergencyShow />);
    const calls = await view.findByTestId("emergency-calls");
    expect(await within(calls).findByText("Cuộc gọi")).toBeInTheDocument();
    expect(within(calls).getByText("Tin nhắn SMS")).toBeInTheDocument();
    expect(view.getByText("Đã gọi khẩn")).toBeInTheDocument();
    unmount();
    api({ "GET /emergency_alerts/8": { status: 404, body: { message: "not found" } } });
    screen("/emergency/8", "/emergency/:id", <EmergencyShow />);
    expect(await view.findByText("Không tìm thấy cảnh báo này.")).toBeInTheDocument();
  });

  it("SP1 the people who shared with me, what I may see and until when; none says so", async () => {
    api({ "GET /shared_patients": { status: 200, body: [{ permissionId: 3, customerId: 1, customerCode: "KH001", fullName: "Trần Thị Bích",
      shareVitals: true, shareAlerts: true, shareAppointments: false, expiresAt: null }] } });
    const { unmount } = screen("/shared-patients", "/shared-patients", <SharedPatientList />);
    const card = await view.findByTestId("shared-1");
    expect(card).toHaveAttribute("href", "/shared-patients/1");
    expect(within(card).getByText("Được xem: Sinh hiệu, Cảnh báo")).toBeInTheDocument();
    unmount();
    api({ "GET /shared_patients": { status: 200, body: [] } });
    screen("/shared-patients", "/shared-patients", <SharedPatientList />);
    expect(await view.findByText("Chưa có ai chia sẻ với bạn.")).toBeInTheDocument();
  });
});

describe("ViewAsPick (/view-as) — View as a role", () => {
  const routes = {
    "GET /clinics*": { status: 200, body: [] },
    "GET /customers*": { status: 200, body: [{ id: 1, fullName: "Trần Thị Bích", phone: "0912345678", customerCode: "KH001" }] },
    "GET /employees*": { status: 200, body: [
      { id: 9, fullName: "BS. Nguyễn An", staffType: "doctor", employeeCode: "NV09", clinicId: "a" },
      { id: 12, fullName: "Lê Lan", staffType: "receptionist", employeeCode: "NV12", clinicId: "a" },
    ] },
  };

  it("VA1 each role can be seen whole: the front desk, every patient, every appointment", async () => {
    api(routes);
    const user = userEvent.setup();
    screen("/view-as", "/view-as", <ViewAsPick />);
    await user.click(await view.findByRole("button", { name: "Xem tất cả bệnh nhân" }));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/view-as/patients"));
  });

  it("VA2 Xem is off until somebody is chosen; choosing a doctor opens what that doctor sees", async () => {
    api(routes);
    const user = userEvent.setup();
    screen("/view-as", "/view-as", <ViewAsPick />);
    const buttons = await view.findAllByRole("button", { name: "Xem" });
    buttons.forEach((b) => expect(b).toBeDisabled());
    await user.click(view.getAllByRole("combobox")[1]);
    await user.click(await view.findByRole("option", { name: /BS\. Nguyễn An · Bác sĩ · NV09/ }));
    expect(view.queryByRole("option", { name: /Lê Lan · Lễ tân/ })).toBeNull();
    await user.click(view.getAllByRole("button", { name: "Xem" })[1]);
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/view-as/employees/9"));
  });
});
