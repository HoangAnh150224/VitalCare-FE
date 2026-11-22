/** FE-18 Create Clinical Encounter: EncounterCreate. Report-5.1, sheet FE_ClinicScreens. */
import { fireEvent, screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EncounterCreate } from "@/features/clinic/encounters";
import { access, api, notify, screen, sent } from "./harness";

const PATH = "/clinical-encounters/create?customerId=1&appointmentId=10&patient=Tr%E1%BA%A7n%20Th%E1%BB%8B%20B%C3%ADch";
const open = (path = PATH) => screen(path, "/clinical-encounters/create", <EncounterCreate />);
const vital = (label: RegExp) => view.getByLabelText(label);

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("EncounterCreate (/clinical-encounters/create) — Create Clinical Encounter", () => {
  it("EC1 without a checked-in booking the form is not offered", async () => {
    api({});
    open("/clinical-encounters/create");
    expect(await view.findByText(/Lần khám được tạo từ lượt đăng ký khám đã tiếp nhận/)).toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Lưu" })).toBeNull();
  });

  it("EC2 the patient is named in the title; the chief complaint is required", async () => {
    api({ "GET /medical_services*": { status: 200, body: [] } });
    const user = userEvent.setup();
    open();
    expect(await view.findByText("Lần khám mới — Trần Thị Bích")).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Lưu" }));
    expect(await view.findByText("Vui lòng nhập triệu chứng hoặc lý do khám")).toBeInTheDocument();
    expect(sent("POST", "/clinical_encounters")).toHaveLength(0);
  });

  it("EC3 vital signs outside their range, with too many decimals or not whole are refused", async () => {
    api({ "GET /medical_services*": { status: 200, body: [] } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("Điều bệnh nhân khai"), "Sốt");
    fireEvent.change(vital(/Nhiệt độ/), { target: { value: "46" } });
    fireEvent.change(vital(/^Mạch/), { target: { value: "80.5" } });
    fireEvent.change(vital(/Nhịp thở/), { target: { value: "18" } });
    await user.click(view.getByRole("button", { name: "Lưu" }));
    expect(await view.findByText("Từ 30 đến 45 °C")).toBeInTheDocument();
    expect(view.getByText("Nhập số nguyên")).toBeInTheDocument();
    expect(sent("POST", "/clinical_encounters")).toHaveLength(0);
  });

  it("EC4 a valid visit: whose and which booking, trimmed complaint, vitals as numbers (empty as none); then the encounter", async () => {
    api({ "GET /medical_services*": { status: 200, body: [] }, "POST /clinical_encounters": { status: 200, body: { id: 50 } } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("Điều bệnh nhân khai"), "  Sốt 2 ngày  ");
    fireEvent.change(vital(/Nhiệt độ/), { target: { value: "38.5" } });
    fireEvent.change(vital(/^Mạch/), { target: { value: "96" } });
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(sent("POST", "/clinical_encounters")).toHaveLength(1));
    const body = sent("POST", "/clinical_encounters")[0].body as Record<string, unknown> & { vitals: Record<string, unknown> };
    expect(body).toMatchObject({ customerId: 1, appointmentId: 10, chiefComplaint: "Sốt 2 ngày" });
    expect(body.vitals).toMatchObject({ temperature: 38.5, pulse: 96, respiratoryRate: null, spo2: null });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/clinical-encounters/show/50"));
  });

  it("EC5 services ordered with the visit are posted after it, each with its instruction", async () => {
    api({
      "GET /medical_services*": { status: 200, body: [
        { id: 7, code: "XQ", name: "X-quang ngực", price: 150000, category: "imaging", status: "active", turnaroundMinutes: 45, description: null },
      ] },
      "POST /clinical_encounters": { status: 200, body: { id: 51 } },
      "POST /clinical_encounters/51/service_orders": { status: 200, body: { id: 1 } },
    });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("Điều bệnh nhân khai"), "Ho");
    await user.click(await view.findByRole("button", { name: "Thêm dịch vụ" }));
    await user.click(view.getByRole("combobox", { name: "Dịch vụ 1" }));
    await user.click(await view.findByRole("option", { name: /X-quang ngực/ }));
    await user.type(view.getByPlaceholderText("Ghi chú cho người thực hiện (không bắt buộc)"), "Chụp thẳng");
    expect(view.getByText("Tổng 150.000 ₫")).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(sent("POST", "/clinical_encounters/51/service_orders")).toHaveLength(1));
    expect(sent("POST", "/clinical_encounters/51/service_orders")[0].body).toEqual({ serviceId: 7, instruction: "Chụp thẳng" });
  });

  it("EC6 a service that could not be ordered is named; the visit is still opened", async () => {
    api({
      "GET /medical_services*": { status: 200, body: [
        { id: 7, code: "XQ", name: "X-quang ngực", price: 150000, category: "imaging", status: "active", turnaroundMinutes: 45, description: null },
      ] },
      "POST /clinical_encounters": { status: 200, body: { id: 52 } },
      "POST /clinical_encounters/52/service_orders": { status: 422, body: { message: "That service is no longer offered" } },
    });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("Điều bệnh nhân khai"), "Ho");
    await user.click(await view.findByRole("button", { name: "Thêm dịch vụ" }));
    await user.click(view.getByRole("combobox", { name: "Dịch vụ 1" }));
    await user.click(await view.findByRole("option", { name: /X-quang ngực/ }));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({
        type: "error", message: "Đã lưu lần khám nhưng chưa chỉ định được dịch vụ", description: "X-quang ngực. Chỉ định lại trên trang lần khám.",
      })),
    );
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/clinical-encounters/show/52"));
  });
});
