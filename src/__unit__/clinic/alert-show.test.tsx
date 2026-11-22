/** FE-19 Alert Details: acknowledge, note, resolve, dismiss. Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AlertShow } from "@/features/clinic/alerts";
import { access, api, notify, screen, sent } from "./harness";

const alert = (status: string) => ({
  alert: {
    id: 7, patient: { id: 1, customerCode: "KH001", fullName: "Trần Thị Bích" }, clinicId: "a", deviceId: 3, deviceCode: "VC-BAND-01",
    metric: "SPO2", operator: "BELOW", threshold: 90, measuredValue: 88, lastValue: 88, severity: "CRITICAL", status,
    message: "SpO₂ 88% dưới 90%", occurrences: 1, triggeredAt: "2026-11-22T01:00:00Z", lastTriggeredAt: "2026-11-22T01:00:00Z",
    acknowledgedAt: null, resolvedAt: null, dismissedAt: null, ruleId: 2, ruleName: "SpO₂ thấp", source: "RULE",
  },
  handlingNotes: null,
  dismissReason: null,
  history: [],
});

const open = () => screen("/alerts/show/7", "/alerts/show/:id", <AlertShow />);

beforeEach(() => {
  notify.open.mockClear();
  access.can = true;
});
afterEach(() => {
  access.can = true;
});

describe("AlertShow (/alerts/show/:id) — Alert Details", () => {
  it("AS1 an open alert offers Tiếp nhận, Ghi chú, Xử lý xong and Bỏ qua", async () => {
    api({ "GET /alerts/7": { status: 200, body: alert("OPEN") } });
    open();
    for (const name of ["Tiếp nhận", "Ghi chú", "Xử lý xong", "Bỏ qua"]) {
      expect(await view.findByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("AS2 an acknowledged alert can no longer be acknowledged; a closed one offers nothing", async () => {
    api({ "GET /alerts/7": { status: 200, body: alert("ACKNOWLEDGED") } });
    const { unmount } = open();
    expect(await view.findByRole("button", { name: "Xử lý xong" })).toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Tiếp nhận" })).toBeNull();
    unmount();
    api({ "GET /alerts/7": { status: 200, body: alert("RESOLVED") } });
    open();
    await waitFor(() => expect(sent("GET", "/alerts/7").length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 100));
    expect(view.queryByRole("button", { name: "Xử lý xong" })).toBeNull();
  });

  it("AS3 without the right to edit alerts nobody is offered the actions", async () => {
    access.can = false;
    api({ "GET /alerts/7": { status: 200, body: alert("OPEN") } });
    open();
    await waitFor(() => expect(sent("GET", "/alerts/7").length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 100));
    expect(view.queryByRole("button", { name: "Tiếp nhận" })).toBeNull();
  });

  it("AS4 Tiếp nhận posts the acknowledgement", async () => {
    let status = "OPEN";
    api({
      "GET /alerts/7": () => ({ status: 200, body: alert(status) }),
      "POST /alerts/7/acknowledge": () => {
        status = "ACKNOWLEDGED";
        return { status: 200, body: alert(status) };
      },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Tiếp nhận" }));
    await waitFor(() => expect(sent("POST", "/alerts/7/acknowledge")).toHaveLength(1));
    expect(sent("POST", "/alerts/7/acknowledge")[0].body).toEqual({});
    await waitFor(() => expect(view.queryByRole("button", { name: "Tiếp nhận" })).toBeNull());
  });

  it("AS5 resolving needs handling notes; they are sent trimmed", async () => {
    api({
      "GET /alerts/7": { status: 200, body: alert("ACKNOWLEDGED") },
      "POST /alerts/7/resolve": { status: 200, body: alert("RESOLVED") },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Xử lý xong" }));
    const dialog = await view.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Xử lý xong cảnh báo"), "   ");
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận đã xử lý" }));
    expect(within(dialog).getByText("Cần ghi chú xử lý")).toBeInTheDocument();
    expect(sent("POST", "/alerts/7/resolve")).toHaveLength(0);
    await user.type(within(dialog).getByLabelText("Xử lý xong cảnh báo"), "Đã gọi bệnh nhân  ");
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận đã xử lý" }));
    await waitFor(() => expect(sent("POST", "/alerts/7/resolve")).toHaveLength(1));
    expect(sent("POST", "/alerts/7/resolve")[0].body).toEqual({ note: "Đã gọi bệnh nhân" });
  });

  it("AS6 dismissing needs a reason", async () => {
    api({ "GET /alerts/7": { status: 200, body: alert("OPEN") } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Bỏ qua" }));
    const dialog = await view.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Bỏ qua" }));
    expect(within(dialog).getByText("Cần lý do bỏ qua")).toBeInTheDocument();
  });

  it("AS7 an action refused (handled by somebody else meanwhile) is said in a toast", async () => {
    api({
      "GET /alerts/7": { status: 200, body: alert("OPEN") },
      "POST /alerts/7/acknowledge": { status: 409, body: { message: "Only an open alert can be acknowledged" } },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Tiếp nhận" }));
    await waitFor(() =>
      expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({
        type: "error", message: "Không thực hiện được", description: "Cảnh báo có thể vừa được người khác xử lý.",
      })),
    );
  });

  it("AS8 an alert that does not exist says so", async () => {
    api({});
    open();
    expect(await view.findByText("Không tìm thấy cảnh báo này.")).toBeInTheDocument();
  });
});
