/** FE-02 IoMT Device Management screens. Report-5.1, sheet FE_ClinicScreens. */
import { fireEvent, screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { DeviceCreate, DeviceList } from "@/features/clinic/devices";
import { api, notify, screen, sent } from "./harness";

const band = {
  id: 3, deviceCode: "VC-BAND-01", serialNumber: "SN-1", deviceType: "WRIST_MONITOR", manufacturer: "VitalCare",
  model: "VC Band 1", status: "assigned", lastSeenAt: null, registeredAt: "2026-11-01T00:00:00Z", clinicId: null,
  currentPatient: { customerId: 1, customerCode: "KH001", fullName: "Trần Thị Bích", since: "2026-11-02T00:00:00Z" },
  connectivity: "ONLINE", batteryLevel: 81, firmwareVersion: "1.4.2", lastSyncAt: null, pairedAt: null, hasToken: true,
};

describe("DeviceList (/devices) — IoMT Devices List / Device Status Monitoring", () => {
  beforeEach(() => notify.open.mockClear());

  it("DS1 a row per device: code, model, serial, status, connectivity and wearer", async () => {
    api({ "GET /devices*": { status: 200, body: [band] } });
    screen("/devices", "/devices", <DeviceList />);
    expect(await view.findByText("VC-BAND-01")).toBeInTheDocument();
    expect(view.getByText("VC Band 1")).toBeInTheDocument();
    expect(view.getByText("SN-1")).toBeInTheDocument();
    expect(view.getByText("Đang gán")).toBeInTheDocument();
    expect(view.getByText("Trần Thị Bích")).toBeInTheDocument();
  });

  it("DS2 the list asks the API for the first page", async () => {
    api({ "GET /devices*": { status: 200, body: [] } });
    screen("/devices", "/devices", <DeviceList />);
    await waitFor(() => expect(sent("GET", "/devices").length).toBeGreaterThan(0));
    expect(sent("GET", "/devices")[0].path).toMatch(/_start=0&_end=\d+/);
  });
});

describe("DeviceCreate (/devices/create) — Register IoMT Device", () => {
  beforeEach(() => notify.open.mockClear());

  it("DC1 nothing typed: every required field says so, nothing is sent", async () => {
    api({});
    screen("/devices/create", "/devices/create", <DeviceCreate />);
    fireEvent.click(await view.findByRole("button", { name: "Đăng ký thiết bị" }));
    expect(await view.findByText("Vui lòng nhập mã thiết bị")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập số serial")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập model")).toBeInTheDocument();
    expect(view.getByText("Vui lòng nhập hãng sản xuất")).toBeInTheDocument();
    expect(sent("POST", "/devices")).toHaveLength(0);
  });

  it("DC2 spaces only count as empty; a code over 64 characters is refused", async () => {
    api({});
    const user = userEvent.setup();
    screen("/devices/create", "/devices/create", <DeviceCreate />);
    await user.type(await view.findByPlaceholderText("VC-W-004"), "   ");
    await user.click(view.getByRole("button", { name: "Đăng ký thiết bị" }));
    expect(await view.findByText("Vui lòng nhập mã thiết bị")).toBeInTheDocument();
    const code = view.getByPlaceholderText("VC-W-004");
    await user.clear(code);
    await user.type(code, "A".repeat(65));
    await user.click(view.getByRole("button", { name: "Đăng ký thiết bị" }));
    expect(await view.findByText("Tối đa 64 ký tự")).toBeInTheDocument();
    expect(sent("POST", "/devices")).toHaveLength(0);
  });

  it("DC3 a valid device is sent as typed and the screen opens it", async () => {
    api({ "POST /devices": { status: 200, body: { ...band, id: 9, deviceCode: "VC-W-004" } } });
    const user = userEvent.setup();
    screen("/devices/create", "/devices/create", <DeviceCreate />);
    await user.type(await view.findByPlaceholderText("VC-W-004"), "VC-W-004");
    await user.type(view.getByPlaceholderText("Nhập số serial"), "SN-4");
    await user.type(view.getByPlaceholderText("VC Band 1"), "VC Band 2");
    await user.type(view.getByPlaceholderText("Nhập hãng sản xuất"), "VitalCare");
    await user.click(view.getByRole("button", { name: "Đăng ký thiết bị" }));
    await waitFor(() => expect(sent("POST", "/devices")).toHaveLength(1));
    expect(sent("POST", "/devices")[0].body).toEqual({
      deviceCode: "VC-W-004", serialNumber: "SN-4", model: "VC Band 2", manufacturer: "VitalCare", deviceType: "WRIST_MONITOR",
    });
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/devices/show/9"));
  });

  it("DC4 a code already used: the API's refusal is shown, the form stays", async () => {
    api({
      "POST /devices": {
        status: 422,
        body: { status: 422, message: "Validation failed", errors: { deviceCode: "A device with that code already exists" } },
      },
    });
    const user = userEvent.setup();
    screen("/devices/create", "/devices/create", <DeviceCreate />);
    await user.type(await view.findByPlaceholderText("VC-W-004"), "VC-BAND-01");
    await user.type(view.getByPlaceholderText("Nhập số serial"), "SN-9");
    await user.type(view.getByPlaceholderText("VC Band 1"), "X");
    await user.type(view.getByPlaceholderText("Nhập hãng sản xuất"), "Y");
    await user.click(view.getByRole("button", { name: "Đăng ký thiết bị" }));
    await waitFor(() => expect(sent("POST", "/devices")).toHaveLength(1));
    await waitFor(() => expect(notify.open).toHaveBeenCalled());
    expect(notify.open.mock.calls.at(-1)?.[0]).toMatchObject({ type: "error" });
    expect(view.getByTestId("location").textContent).toBe("/devices/create");
  });
});
