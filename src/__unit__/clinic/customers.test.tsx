/** FE-04 Patient / customer records: CustomerList and CustomerEdit. Report-5.1, sheet FE_ClinicScreens2. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CustomerEdit, CustomerList } from "@/features/clinic/customers";
import { api, notify, screen, sent } from "./harness";

const bich = {
  id: 1, customerCode: "KH001", fullName: "Trần Thị Bích", phone: "0912345678", email: null, status: "patient",
  activityStatus: "paused", patientActivatedAt: "2026-11-02T00:00:00Z", createdAt: "2026-11-01T00:00:00Z",
  dateOfBirth: "1990-05-01", gender: "female", address: "12 Lê Lợi", ward: null, province: null,
  emergencyContactName: "Trần Văn An", emergencyContactPhone: "0987654321", guardian: null,
};
const na = { ...bich, id: 2, customerCode: "KH002", fullName: "Bé Na", status: "neutral", activityStatus: "active",
  patientActivatedAt: null, guardian: { id: 1, fullName: "Trần Thị Bích" } };

beforeEach(() => notify.open.mockClear());

describe("CustomerList (/customers) — Customer List", () => {
  it("CU1 a row per customer: code, name and phone, status, and the monitoring state only when not active", async () => {
    api({ "GET /customers*": { status: 200, body: [bich, na] }, "GET /clinics*": { status: 200, body: [] } });
    screen("/customers", "/customers", <CustomerList />);
    expect(await view.findByText("KH001")).toBeInTheDocument();
    expect(view.getByText("Trần Thị Bích")).toBeInTheDocument();
    expect(view.getAllByText("0912345678").length).toBeGreaterThan(0);
    expect(view.getByText("Bệnh nhân")).toBeInTheDocument();
    expect(view.getByText("Tạm dừng theo dõi")).toBeInTheDocument();
    expect(view.queryByText("Đang hoạt động")).toBeNull();
  });

  it("CU2 a relative's profile says whose relative it is; a neutral customer says not activated", async () => {
    api({ "GET /customers*": { status: 200, body: [na] }, "GET /clinics*": { status: 200, body: [] } });
    screen("/customers", "/customers", <CustomerList />);
    expect(await view.findByText("Người thân của Trần Thị Bích")).toBeInTheDocument();
    expect(view.getByText("Chưa kích hoạt")).toBeInTheDocument();
  });

  it("CU3 locked to one clinic (view-as): the clinic is a permanent filter and there is no edit or open button", async () => {
    api({ "GET /customers*": { status: 200, body: [bich] }, "GET /clinics*": { status: 200, body: [] } });
    screen("/customers", "/customers", <CustomerList clinicId="a" readOnly />);
    expect(await view.findByText("KH001")).toBeInTheDocument();
    await waitFor(() => expect(sent("GET", "/customers").some((c) => /clinicId=a/.test(c.path))).toBe(true));
    expect(view.queryByRole("link", { name: /sửa|chỉnh/i })).toBeNull();
  });
});

describe("CustomerEdit (/customers/edit/:id) — Update Customer Profile", () => {
  const open = () => screen("/customers/edit/1", "/customers/edit/:id", <CustomerEdit />);

  it("CE1 loads the profile and sends back only the profile fields", async () => {
    api({
      "GET /customers/1": { status: 200, body: bich },
      "PATCH /customers/1": { status: 200, body: bich },
      "PUT /customers/1": { status: 200, body: bich },
    });
    const user = userEvent.setup();
    open();
    const address = await view.findByPlaceholderText("Số nhà, đường, phường/xã, tỉnh/thành phố");
    await waitFor(() => expect(address).toHaveValue("12 Lê Lợi"));
    await user.clear(address);
    await user.type(address, "34 Trần Phú");
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(calls().length).toBe(1));
    expect(calls()[0].body).toEqual({
      dateOfBirth: "1990-05-01", gender: "female", address: "34 Trần Phú",
      emergencyContactName: "Trần Văn An", emergencyContactPhone: "0987654321",
    });
  });

  it("CE2 a cleared field is sent as an empty string (clear it), a cleared birth date as null", async () => {
    api({ "GET /customers/1": { status: 200, body: bich }, "PATCH /customers/1": { status: 200, body: bich }, "PUT /customers/1": { status: 200, body: bich } });
    const user = userEvent.setup();
    open();
    const name = await view.findByPlaceholderText("Nhập họ và tên người liên hệ");
    await waitFor(() => expect(name).toHaveValue("Trần Văn An"));
    await user.clear(name);
    await user.clear(view.getByLabelText("Ngày sinh"));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(calls().length).toBe(1));
    expect(calls()[0].body).toMatchObject({ emergencyContactName: "", dateOfBirth: null });
  });

  it("CE3 an address over 500 characters is refused under its field; nothing is sent", async () => {
    api({ "GET /customers/1": { status: 200, body: bich } });
    const user = userEvent.setup();
    open();
    const address = await view.findByPlaceholderText("Số nhà, đường, phường/xã, tỉnh/thành phố");
    await waitFor(() => expect(address).toHaveValue("12 Lê Lợi"));
    await user.clear(address);
    await user.click(address);
    await user.paste("x".repeat(501));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    expect(await view.findByText("Tối đa 500 ký tự")).toBeInTheDocument();
    expect(calls()).toHaveLength(0);
  });

  it("CE4 boundary: an emergency phone of 50 characters passes, 51 is refused", async () => {
    api({ "GET /customers/1": { status: 200, body: bich }, "PATCH /customers/1": { status: 200, body: bich }, "PUT /customers/1": { status: 200, body: bich } });
    const user = userEvent.setup();
    open();
    const phone = await view.findByPlaceholderText("Nhập số điện thoại liên hệ");
    await waitFor(() => expect(phone).toHaveValue("0987654321"));
    await user.clear(phone);
    await user.click(phone);
    await user.paste("1".repeat(51));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    expect(await view.findByText("Tối đa 50 ký tự")).toBeInTheDocument();
    await user.clear(phone);
    await user.paste("1".repeat(50));
    await user.click(view.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(calls().length).toBe(1));
  });
});

/** The save, whichever verb the data provider uses for an update. */
function calls() {
  return [...sent("PATCH", "/customers/1"), ...sent("PUT", "/customers/1")];
}
