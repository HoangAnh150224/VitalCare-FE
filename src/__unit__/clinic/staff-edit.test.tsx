/** FE-17 Update Healthcare Staff profile: StaffEdit (clinic administrator's side). Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { StaffEdit } from "@/features/clinic/staff";
import { api, notify, screen, sent, type Reply } from "./harness";

const doctor = {
  id: 9, fullName: "BS. Nguyễn An", phone: "+84912345678", staffType: "doctor", status: "active", specialty: "Nội khoa",
  professionalTitle: "Bác sĩ", licenseNo: "001/HN", clinicPosition: "Bác sĩ điều trị", clinic: { id: "a", name: "VitalCare Hà Nội" },
};
const saved = () => [...sent("PATCH", "/employees/9"), ...sent("PUT", "/employees/9")];
const open = (routes: Record<string, Reply>) => {
  api(routes);
  return screen("/employees/edit/9", "/employees/edit/:id", <StaffEdit />);
};

beforeEach(() => {
  notify.open.mockClear();
  localStorage.setItem("dth-auth-authorities", JSON.stringify({ roles: ["CLINIC_ADMIN"], permissions: [], version: "1", scopedResources: [] }));
});
afterEach(() => localStorage.removeItem("dth-auth-authorities"));

describe("StaffEdit (/employees/edit/:id) — Update Staff Profile", () => {
  it("SE1 an active doctor: only the professional profile is sent back, not the status", async () => {
    open({ "GET /employees/9": { status: 200, body: doctor }, "PATCH /employees/9": { status: 200, body: doctor }, "PUT /employees/9": { status: 200, body: doctor } });
    const user = userEvent.setup();
    const license = await view.findByPlaceholderText("Nhập số chứng chỉ hành nghề");
    await waitFor(() => expect(license).toHaveValue("001/HN"));
    await user.clear(license);
    await user.type(license, "002/HN");
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(saved()).toHaveLength(1));
    expect(saved()[0].body).toEqual({ specialty: "Nội khoa", professionalTitle: "Bác sĩ", licenseNo: "002/HN", clinicPosition: "Bác sĩ điều trị" });
  });

  it("SE7 choosing Không chọn still clears the specialty on purpose", async () => {
    open({ "GET /employees/9": { status: 200, body: doctor }, "PATCH /employees/9": { status: 200, body: doctor }, "PUT /employees/9": { status: 200, body: doctor } });
    const user = userEvent.setup();
    await waitFor(async () => expect(await view.findByPlaceholderText("Nhập số chứng chỉ hành nghề")).toHaveValue("001/HN"));
    await user.click(view.getByRole("combobox", { name: "Chuyên khoa" }));
    await user.click(await view.findByRole("option", { name: "Không chọn" }));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(saved()).toHaveLength(1));
    expect(saved()[0].body).toMatchObject({ specialty: "" });
  });

  it("SE2 boundary: a licence number over 128 characters is refused under its field", async () => {
    open({ "GET /employees/9": { status: 200, body: doctor } });
    const user = userEvent.setup();
    const license = await view.findByPlaceholderText("Nhập số chứng chỉ hành nghề");
    await waitFor(() => expect(license).toHaveValue("001/HN"));
    await user.clear(license);
    await user.click(license);
    await user.paste("x".repeat(129));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    expect(await view.findByText("Tối đa 128 ký tự")).toBeInTheDocument();
    expect(saved()).toHaveLength(0);
  });

  it("SE3 a licence number refused by the API (422) is not said again in a toast", async () => {
    const refused = { status: 422, body: { status: 422, message: "Validation failed", errors: { licenseNo: "This licence number is already in use" } } };
    open({ "GET /employees/9": { status: 200, body: doctor }, "PATCH /employees/9": refused, "PUT /employees/9": refused });
    const user = userEvent.setup();
    await waitFor(async () => expect(await view.findByPlaceholderText("Nhập số chứng chỉ hành nghề")).toHaveValue("001/HN"));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(saved()).toHaveLength(1));
    expect(notify.open).not.toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });

  it("SE4 a clinic administrator who has left cannot be edited", async () => {
    open({ "GET /employees/9": { status: 200, body: { ...doctor, staffType: "clinic_admin", status: "inactive" } } });
    expect(await view.findByRole("alert")).toHaveTextContent("Quản trị viên đã nghỉ việc.");
    expect(view.getByRole("button", { name: "Quay lại danh sách" })).toBeInTheDocument();
  });

  it("SE5 a profile that could not load says so", async () => {
    open({ "GET /employees/9": { status: 500, body: { message: "down" } } });
    expect(await view.findByRole("alert")).toHaveTextContent("Không tải được hồ sơ. Vui lòng thử lại sau.");
  });

  it("SE6 the system administrator may not edit a doctor here", async () => {
    localStorage.setItem("dth-auth-authorities", JSON.stringify({ roles: ["ADMIN"], permissions: [], version: "1", scopedResources: [] }));
    open({ "GET /employees/9": { status: 200, body: doctor } });
    expect(await view.findByRole("alert")).toHaveTextContent("Tài khoản này không chỉnh sửa được tại đây.");
  });
});
