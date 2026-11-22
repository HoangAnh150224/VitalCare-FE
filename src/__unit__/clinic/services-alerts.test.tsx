/** FE-22 Medical Service Catalog and FE-19 Create Alert Rule screens. Report-5.1, sheet FE_ClinicScreens. */
import { fireEvent, screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { AlertRuleCreate } from "@/features/clinic/alerts";
import { MedicalServiceCreate } from "@/features/clinic/medical-services";
import { api, notify, screen, sent } from "./harness";

beforeEach(() => notify.open.mockClear());

describe("MedicalServiceCreate (/medical_services/create) — Medical Service Catalog", () => {
  const open = () => screen("/medical_services/create", "/medical_services/create", <MedicalServiceCreate />);

  it("SV1 empty code, name and description are refused; nothing is sent", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Thêm dịch vụ" }));
    expect(await view.findByText("Vui lòng nhập mã dịch vụ")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập tên dịch vụ")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập mô tả dịch vụ")).toBeInTheDocument();
    expect(sent("POST", "/medical_services")).toHaveLength(0);
  });

  it("SV2 a price off the 1000-đồng step and a turnaround over 30 days are refused by the inputs; nothing is sent", async () => {
    api({});
    const user = userEvent.setup();
    open();
    const price = await view.findByLabelText(/Giá \(đồng\)/);
    fireEvent.change(price, { target: { value: "1500.5" } });
    const minutes = view.getByLabelText(/Thời gian trả kết quả/);
    fireEvent.change(minutes, { target: { value: "43201" } });
    await user.click(view.getByRole("button", { name: "Thêm dịch vụ" }));
    // The browser's own check stops the submit first, so react-hook-form's Vietnamese
    // messages ("Giá là số đồng nguyên", "Tối đa 30 ngày") are never reached.
    expect((price as HTMLInputElement).checkValidity()).toBe(false);
    expect(view.queryByText("Vui lòng nhập mã dịch vụ")).toBeNull();
    expect(sent("POST", "/medical_services")).toHaveLength(0);
  });

  it("SV3 a valid service: code upper-cased, numbers sent as numbers, then the catalogue", async () => {
    api({ "POST /medical_services": { status: 200, body: { id: 5 } } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("XN-CTM"), " xn-ctm ");
    await user.type(view.getByPlaceholderText("Xét nghiệm công thức máu"), "Công thức máu");
    await user.type(view.getByPlaceholderText("Nhập mô tả dịch vụ y tế"), "18 chỉ số");
    const price = view.getByLabelText(/Giá \(đồng\)/);
    await user.clear(price);
    await user.type(price, "120000");
    await user.click(view.getByRole("button", { name: "Thêm dịch vụ" }));
    await waitFor(() => expect(sent("POST", "/medical_services")).toHaveLength(1));
    expect(sent("POST", "/medical_services")[0].body).toMatchObject({
      code: "XN-CTM", name: "Công thức máu", description: "18 chỉ số", price: 120000, turnaroundMinutes: 60, category: "lab", status: "active",
    });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/medical-services"));
  });
});

describe("AlertRuleCreate (/alert_rules/create) — Create Alert Rule", () => {
  const open = (path = "/alert_rules/create") => screen(path, "/alert_rules/create", <AlertRuleCreate />);

  it("AR1 name, threshold and note are required; nothing is sent", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Tạo quy tắc" }));
    expect(await view.findByText("Nhập tên quy tắc")).toBeInTheDocument();
    expect(view.getByText("Nhập ngưỡng")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập ghi chú")).toBeInTheDocument();
    expect(sent("POST", "/alert_rules")).toHaveLength(0);
  });

  it("AR2 a threshold that is not a number is refused", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText(/Ngưỡng/), "abc");
    await user.click(view.getByRole("button", { name: "Tạo quy tắc" }));
    expect(await view.findByText("Vui lòng nhập ngưỡng hợp lệ")).toBeInTheDocument();
  });

  it("AR3 a decimal comma is read as a point; the clinic-wide rule is sent and opened", async () => {
    api({ "POST /alert_rules": { status: 200, body: { id: 11 } } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("VD: SpO₂ rất thấp"), "SpO₂ thấp");
    await user.type(view.getByLabelText(/Ngưỡng/), "92,5");
    await user.type(view.getByPlaceholderText("Nhập căn cứ hoặc lý do thiết lập quy tắc"), "Theo phác đồ");
    await user.click(view.getByRole("button", { name: "Tạo quy tắc" }));
    await waitFor(() => expect(sent("POST", "/alert_rules")).toHaveLength(1));
    expect(sent("POST", "/alert_rules")[0].body).toMatchObject({
      name: "SpO₂ thấp", metric: "SPO2", operator: "BELOW", threshold: 92.5, severity: "WARNING", enabled: true, note: "Theo phác đồ", customerId: null,
    });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/alert-rules/show/11"));
  });

  it("AR4 a patient's own rule: the patient is named and their id is sent", async () => {
    api({
      "GET /vital_signs/patients/7": { status: 200, body: { fullName: "Trần Thị Bích" } },
      "POST /alert_rules": { status: 200, body: { id: 12 } },
    });
    const user = userEvent.setup();
    open("/alert_rules/create?customerId=7");
    expect(await view.findByText(/Quy tắc riêng của Trần Thị Bích/)).toBeInTheDocument();
    await user.type(view.getByPlaceholderText("VD: SpO₂ rất thấp"), "Riêng");
    await user.type(view.getByLabelText(/Ngưỡng/), "90");
    await user.type(view.getByPlaceholderText("Nhập căn cứ hoặc lý do thiết lập quy tắc"), "COPD");
    await user.click(view.getByRole("button", { name: "Tạo quy tắc" }));
    await waitFor(() => expect(sent("POST", "/alert_rules")).toHaveLength(1));
    expect(sent("POST", "/alert_rules")[0].body).toMatchObject({ customerId: 7, threshold: 90 });
  });

  it("AR5 a threshold outside what the band measures: said under the field in Vietnamese, no toast", async () => {
    api({
      "POST /alert_rules": {
        status: 422,
        body: { status: 422, message: "Validation failed", errors: { threshold: "Between 50 and 100 for this measure" } },
      },
    });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByPlaceholderText("VD: SpO₂ rất thấp"), "Sai");
    await user.type(view.getByLabelText(/Ngưỡng/), "40");
    await user.type(view.getByPlaceholderText("Nhập căn cứ hoặc lý do thiết lập quy tắc"), "x");
    await user.click(view.getByRole("button", { name: "Tạo quy tắc" }));
    expect(await view.findByText("Ngưỡng phải nằm trong khoảng 50 đến 100 cho chỉ số này.")).toBeInTheDocument();
    expect(notify.open.mock.calls.filter(([n]) => n?.type === "error")).toHaveLength(0);
  });
});
