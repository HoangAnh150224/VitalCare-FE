/** FE-10 Create Appointment (the patient's own registration). Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { MyAppointmentCreate } from "@/features/clinic/my-appointments";
import { api, notify, screen, sent, type Reply } from "./harness";

const DAY = "2026-12-01";
const me = { id: 1, self: true, fullName: "Trần Thị Bích", complete: true, nationalId: "001234567890", relationship: null };
const doctor = { id: 5, fullName: "BS. An", specialty: "Hô hấp", professionalTitle: null, workingHours: [], day: { working: true }, manageable: null };

function routes(openDays: Reply, extra: Record<string, Reply> = {}) {
  return {
    "GET /my_profiles*": { status: 200, body: [me] },
    "GET /public/clinics": { status: 200, body: [{ id: "a", name: "VitalCare Hà Nội", address: null, phone: null, email: null, openingHours: [] }] },
    "GET /clinics/a/doctors*": { status: 200, body: [doctor] },
    "GET /clinics/a/open-days*": openDays,
    ...extra,
  };
}

const open = () => screen("/my-appointments/create", "/my-appointments/create", <MyAppointmentCreate />);

async function chooseDepartment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await view.findByRole("combobox", { name: "Khám khoa" }));
  await user.click(await view.findByRole("option", { name: "Hô hấp" }));
}

beforeEach(() => notify.open.mockClear());

describe("MyAppointmentCreate (/my-appointments/create) — Create Appointment", () => {
  it("BK1 department, day and reason are required; nothing is sent", async () => {
    api(routes({ status: 200, body: [] }));
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Đăng ký khám" }));
    expect(await view.findByText("Vui lòng chọn khoa khám")).toBeInTheDocument();
    expect(view.getByText("Vui lòng chọn ngày")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập lý do khám")).toBeInTheDocument();
    expect(sent("POST", "/my_appointments")).toHaveLength(0);
  });

  it("BK2 the only clinic and the account owner are chosen by themselves", async () => {
    api(routes({ status: 200, body: [{ date: DAY, remaining: 5 }] }));
    open();
    expect((await view.findAllByText("Trần Thị Bích · Bản thân")).length).toBeGreaterThan(0);
    // One clinic: no clinic question at all.
    expect(view.queryByText("Chọn phòng khám")).toBeNull();
  });

  it("BK3 a full day is said on the date at once, with the next open days to pick", async () => {
    api(routes({ status: 200, body: [{ date: "2026-12-02", remaining: 3 }] }));
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText(/Ngày khám/), DAY);
    expect(await view.findByText("Ngày này phòng khám đã hết lượt khám. Vui lòng chọn ngày khác.")).toBeInTheDocument();
    expect(view.getByText("Các ngày còn lượt:")).toBeInTheDocument();
  });

  it("BK4 a day the schedule could not be loaded for is said as such, not as no doctor", async () => {
    api(routes({ status: 500, body: { message: "down" } }));
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText(/Ngày khám/), DAY);
    expect(await view.findByText("Chưa tải được lịch khám của ngày này. Vui lòng thử lại sau.")).toBeInTheDocument();
  });

  it("BK5 a valid registration: profile, clinic, day, trimmed reason and department; then the slip", async () => {
    api(routes({ status: 200, body: [{ date: DAY, remaining: 5 }] }, { "POST /my_appointments": { status: 200, body: { id: 77 } } }));
    const user = userEvent.setup();
    open();
    await view.findAllByText("Trần Thị Bích · Bản thân");
    await chooseDepartment(user);
    await user.type(view.getByLabelText(/Ngày khám/), DAY);
    await user.type(view.getByPlaceholderText("Theo dõi sức khỏe định kỳ"), "  Ho kéo dài  ");
    await user.click(view.getByRole("button", { name: "Đăng ký khám" }));
    await waitFor(() => expect(sent("POST", "/my_appointments")).toHaveLength(1));
    expect(sent("POST", "/my_appointments")[0].body).toEqual({
      patientId: 1, clinicId: "a", appointmentDate: DAY, reason: "Ho kéo dài", department: "Hô hấp",
    });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/my-appointments/show/77"));
  });

  it("BK7 a profile without its ID number is stopped on the form, with a link to complete it", async () => {
    api({ ...routes({ status: 200, body: [{ date: DAY, remaining: 5 }] }), "GET /my_profiles*": { status: 200, body: [{ ...me, nationalId: null }] } });
    const user = userEvent.setup();
    open();
    expect(await view.findByRole("link", { name: "Bổ sung hồ sơ" })).toHaveAttribute("href", "/my-profiles/edit/1");
    await chooseDepartment(user);
    await user.type(view.getByLabelText(/Ngày khám/), DAY);
    await user.type(view.getByPlaceholderText("Theo dõi sức khỏe định kỳ"), "Ho");
    await user.click(view.getByRole("button", { name: "Đăng ký khám" }));
    expect(await view.findByText("Hồ sơ này chưa có đủ ngày sinh, giới tính và số CCCD", { selector: "[id$=form-item-message]" })).toBeInTheDocument();
    expect(sent("POST", "/my_appointments")).toHaveLength(0);
  });

  it("BK6 a refusal from the API is told in a toast and the form stays", async () => {
    api(
      routes({ status: 200, body: [{ date: DAY, remaining: 5 }] }, {
        "POST /my_appointments": { status: 409, body: { status: 409, message: "You already have a visit at this clinic that day" } },
      }),
    );
    const user = userEvent.setup();
    open();
    await view.findAllByText("Trần Thị Bích · Bản thân");
    await chooseDepartment(user);
    await user.type(view.getByLabelText(/Ngày khám/), DAY);
    await user.type(view.getByPlaceholderText("Theo dõi sức khỏe định kỳ"), "Ho");
    await user.click(view.getByRole("button", { name: "Đăng ký khám" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
    expect(view.getByTestId("location").textContent).toBe("/my-appointments/create");
  });
});
