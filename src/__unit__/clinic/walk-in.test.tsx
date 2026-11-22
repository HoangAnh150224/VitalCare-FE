/** FE-10 Walk-in registration at the front desk: WalkInRegistration. Report-5.1, sheet FE_ClinicScreens3. */
import { fireEvent, screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { clinicToday } from "@/features/clinic/appointments/clinic-day";
import { WalkInRegistration } from "@/features/clinic/appointments";
import { api, notify, screen, sent, type Reply } from "./harness";

const doctor = { id: 5, fullName: "BS. An", specialty: "Hô hấp", professionalTitle: null, workingHours: [], day: { working: true }, manageable: null };
const bich = { id: 1, fullName: "Trần Thị Bích", phone: "0912345678", customerCode: "KH001", nationalId: "001190000001" };

const routes = (extra: Record<string, Reply> = {}) => ({
  "GET /public/clinics": { status: 200, body: [{ id: "a", name: "VitalCare Hà Nội", address: null, phone: null, email: null, openingHours: [] }] },
  "GET /clinics/a/doctors*": { status: 200, body: [doctor] },
  "GET /clinics/a/open-days*": { status: 200, body: [{ date: clinicToday(), remaining: 5 }] },
  "GET /customers*": { status: 200, body: [bich] },
  ...extra,
}) as Record<string, Reply>;
const open = () => screen("/appointments/walk-in", "/appointments/walk-in", <WalkInRegistration />);
const submit = () => view.getByRole("button", { name: "Đăng ký và tiếp nhận" });

async function fillKnownVisit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await view.findByRole("combobox", { name: "Khách hàng" }));
  await user.click(await view.findByRole("option", { name: /Trần Thị Bích · 0912345678 · KH001 · ID …0001/ }));
  await user.click(view.getByRole("combobox", { name: "Khám khoa" }));
  await user.click(await view.findByRole("option", { name: "Hô hấp" }));
  await user.type(view.getByPlaceholderText("Theo dõi sức khỏe định kỳ"), "  Ho, sốt  ");
}

beforeEach(() => notify.open.mockClear());

describe("WalkInRegistration (/appointments/walk-in) — Walk-in Registration", () => {
  it("WI1 an existing patient: the profile, department and reason are required; nothing is sent", async () => {
    api(routes());
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Đăng ký và tiếp nhận" }));
    expect(await view.findByText("Vui lòng chọn khách hàng")).toBeInTheDocument();
    expect(view.getByText("Vui lòng chọn khoa khám")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập lý do khám")).toBeInTheDocument();
    expect(sent("POST", "/appointments/walk-in")).toHaveLength(0);
  });

  it("WI2 a new patient: name, phone, birth date and gender are asked for; a wrong phone is refused", async () => {
    api(routes());
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("radio", { name: "Khách mới" }));
    await user.click(submit());
    expect(await view.findByText("Nhập họ tên")).toBeInTheDocument();
    expect(view.getByText("Nhập số điện thoại")).toBeInTheDocument();
    expect(view.getByText("Nhập ngày sinh")).toBeInTheDocument();
    expect(view.getAllByText("Chọn giới tính").length).toBeGreaterThan(1);
    await user.type(view.getByPlaceholderText("0901234567"), "12345");
    await user.click(submit());
    expect(await view.findByText("Số điện thoại Việt Nam, ví dụ 0901234567")).toBeInTheDocument();
    expect(sent("POST", "/appointments/walk-in")).toHaveLength(0);
  });

  it("WI3 boundary: a name of only spaces counts as empty", async () => {
    api(routes());
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("radio", { name: "Khách mới" }));
    await user.type(view.getByPlaceholderText("Nhập họ và tên bệnh nhân"), "   ");
    await user.click(submit());
    expect(await view.findByText("Nhập họ tên")).toBeInTheDocument();
  });

  it("WI4 an existing patient is registered for today, reason trimmed, and the visit opens", async () => {
    api(routes({ "POST /appointments/walk-in": { status: 200, body: { id: 77 } } }));
    const user = userEvent.setup();
    open();
    await fillKnownVisit(user);
    await user.click(submit());
    await waitFor(() => expect(sent("POST", "/appointments/walk-in")).toHaveLength(1));
    expect(sent("POST", "/appointments/walk-in")[0].body).toMatchObject({
      customerId: 1, newPatient: null, clinicId: "a", reason: "Ho, sốt", department: "Hô hấp", note: null,
    });
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/appointments/show/77"));
  });

  it("WI5 a refusal from the API is said in a toast and the form stays", async () => {
    api(routes({ "POST /appointments/walk-in": { status: 409, body: { status: 409, message: "The clinic is closed today" } } }));
    const user = userEvent.setup();
    open();
    await fillKnownVisit(user);
    await user.click(submit());
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
    expect(view.getByTestId("location").textContent).toBe("/appointments/walk-in");
  });

  it("WI6 a new patient is sent as newPatient with name trimmed and no customer id", async () => {
    api(routes({ "POST /appointments/walk-in": { status: 200, body: { id: 78 } } }));
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("radio", { name: "Khách mới" }));
    await user.type(view.getByPlaceholderText("Nhập họ và tên bệnh nhân"), "  Lê Văn Cường ");
    await user.type(view.getByPlaceholderText("0901234567"), "0901234567");
    fireEvent.change(view.getByLabelText(/Ngày sinh/), { target: { value: "1980-02-03" } });
    await user.type(view.getByPlaceholderText("Nhập số CCCD hoặc hộ chiếu"), "001080000123");
    await user.click(view.getByRole("combobox", { name: /Giới tính/ }));
    await user.click(await view.findByRole("option", { name: "Nam" }));
    await user.click(view.getByRole("combobox", { name: "Khám khoa" }));
    await user.click(await view.findByRole("option", { name: "Hô hấp" }));
    await user.type(view.getByPlaceholderText("Theo dõi sức khỏe định kỳ"), "Khám tổng quát");
    await user.click(submit());
    await waitFor(() => expect(sent("POST", "/appointments/walk-in")).toHaveLength(1));
    expect(sent("POST", "/appointments/walk-in")[0].body).toMatchObject({
      customerId: null,
      newPatient: { fullName: "Lê Văn Cường", phone: "0901234567", dateOfBirth: "1980-02-03", nationalId: "001080000123", gender: "male" },
    });
  });
});
