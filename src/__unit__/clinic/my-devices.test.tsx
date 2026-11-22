/** FE-02 Device Pairing (patient portal): MyDeviceList. Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { MyDeviceList } from "@/features/clinic/my-devices/list";
import { api, notify, screen, sent } from "./harness";

const worn = {
  deviceId: 3, deviceCode: "VC-BAND-01", model: "VC Band 1", deviceType: "WRIST_MONITOR", customerName: "Trần Thị Bích",
  connectivity: "ONLINE", batteryLevel: 81, assignedAt: "2026-11-02T01:00:00Z", lastSyncAt: null,
  pairedAt: null, pairedWithMe: false,
};

const open = () => screen("/my-devices", "/my-devices", <MyDeviceList />);

beforeEach(() => notify.open.mockClear());

describe("MyDeviceList (/my-devices) — Device Pairing", () => {
  it("MD1 nothing handed over yet says so", async () => {
    api({ "GET /my_devices*": { status: 200, body: [] } });
    open();
    expect(await view.findByText("Bạn chưa được giao thiết bị theo dõi nào.")).toBeInTheDocument();
  });

  it("MD2 the list could not load: says so with Thử lại, not as empty", async () => {
    api({ "GET /my_devices*": { status: 500, body: { message: "down" } } });
    open();
    expect(await view.findByText("Không thể tải danh sách thiết bị")).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
    expect(view.queryByText("Bạn chưa được giao thiết bị theo dõi nào.")).toBeNull();
  });

  it("MD3 a worn device: code, model and type, wearer, not paired yet", async () => {
    api({ "GET /my_devices*": { status: 200, body: [worn] } });
    open();
    const card = await view.findByTestId("my-device-VC-BAND-01");
    expect(within(card).getByText("VC Band 1 · Vòng đeo tay theo dõi — Trần Thị Bích")).toBeInTheDocument();
    expect(within(card).getByText("Chưa ghép")).toBeInTheDocument();
    expect(within(card).getByText("Chưa có")).toBeInTheDocument();
  });

  it("MD4 Ghép với tài khoản này posts the device's code", async () => {
    api({ "GET /my_devices*": { status: 200, body: [worn] }, "POST /my_devices/pair": { status: 200, body: { ...worn, pairedWithMe: true } } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Ghép với tài khoản này" }));
    await waitFor(() => expect(sent("POST", "/my_devices/pair")).toHaveLength(1));
    expect(sent("POST", "/my_devices/pair")[0].body).toEqual({ deviceCode: "VC-BAND-01" });
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã ghép thiết bị" })));
  });

  it("MD5 pairing by the printed code: trimmed, and the button waits for a code", async () => {
    api({ "GET /my_devices*": { status: 200, body: [] }, "POST /my_devices/pair": { status: 200, body: worn } });
    const user = userEvent.setup();
    open();
    const button = await view.findByRole("button", { name: "Ghép" });
    expect(button).toBeDisabled();
    await user.type(view.getByPlaceholderText("VD: VC-BAND-01"), "  VC-BAND-01 ");
    await user.click(button);
    await waitFor(() => expect(sent("POST", "/my_devices/pair")).toHaveLength(1));
    expect(sent("POST", "/my_devices/pair")[0].body).toEqual({ deviceCode: "VC-BAND-01" });
  });

  it("MD6 a device paired with another phone is said so; one paired with mine can be unpaired after asking", async () => {
    api({
      "GET /my_devices*": { status: 200, body: [{ ...worn, pairedAt: "2026-11-03T01:00:00Z", pairedWithMe: true }] },
      "DELETE /my_devices/VC-BAND-01/pair": { status: 200, body: worn },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Huỷ ghép" }));
    const dialog = await view.findByRole("alertdialog");
    expect(within(dialog).getByText("Huỷ ghép thiết bị VC-BAND-01?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận huỷ ghép" }));
    await waitFor(() => expect(sent("DELETE", "/my_devices/VC-BAND-01/pair")).toHaveLength(1));
  });

  it("MD7 a device paired with someone else's phone reads as such", async () => {
    api({ "GET /my_devices*": { status: 200, body: [{ ...worn, pairedAt: "2026-11-03T01:00:00Z", pairedWithMe: false }] } });
    open();
    expect(await view.findByText("Đã ghép với máy khác")).toBeInTheDocument();
  });

  it("MD8 a refused pairing (already paired with this account) is told in a toast", async () => {
    api({
      "GET /my_devices*": { status: 200, body: [worn] },
      "POST /my_devices/pair": { status: 409, body: { status: 409, message: "Thiết bị này đã được ghép với tài khoản của bạn." } },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Ghép với tài khoản này" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
  });
});
