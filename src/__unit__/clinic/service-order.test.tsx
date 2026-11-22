/** FE-22 Service Order / Record Service Result / Review Result: ServiceOrderShow. Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ServiceOrderShow } from "@/features/clinic/service-orders/show";
import { access, api, notify, screen, sent } from "./harness";

const order = (over: Record<string, unknown> = {}) => ({
  id: 30, encounterId: 20, patient: { id: 1, customerCode: "KH001", fullName: "Trần Thị Bích" },
  service: { id: 7, code: "XQ", name: "X-quang ngực", category: "imaging" }, unitPrice: 150000, instruction: "Chụp thẳng",
  status: "ordered", orderedAt: "2026-11-22T01:00:00Z", orderedBy: "BS. An", expectedResultAt: null, performedBy: null,
  startedAt: null, resultText: null, resultAt: null, reviewedBy: null, reviewedAt: null, cancelledAt: null, cancelReason: null,
  files: [], paid: true, appointmentId: 10, ...over,
});
const open = () => screen("/service-orders/show/30", "/service-orders/show/:id", <ServiceOrderShow />);

beforeEach(() => notify.open.mockClear());
afterEach(() => {
  access.can = true;
});

describe("ServiceOrderShow (/service-orders/show/:id) — Record Service Result / Review Result", () => {
  it("SO1 an unpaid order cannot be started, and says why", async () => {
    api({ "GET /service_orders/30": { status: 200, body: order({ paid: false }) } });
    open();
    expect(await view.findByRole("button", { name: "Bắt đầu thực hiện" })).toBeDisabled();
    expect(view.getByText("Chưa thanh toán")).toBeInTheDocument();
    expect(view.getByText("Bệnh nhân thanh toán dịch vụ xong mới thực hiện được.")).toBeInTheDocument();
  });

  it("SO2 a paid order is started; the doctor's instruction is shown", async () => {
    api({
      "GET /service_orders/30": { status: 200, body: order() },
      "POST /service_orders/30/start": { status: 200, body: order({ status: "in_progress" }) },
    });
    const user = userEvent.setup();
    open();
    expect(await view.findByText("Chụp thẳng")).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Bắt đầu thực hiện" }));
    await waitFor(() => expect(sent("POST", "/service_orders/30/start")).toHaveLength(1));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã bắt đầu thực hiện" })));
  });

  it("SO3 the result is sent trimmed; an empty one cannot be sent", async () => {
    api({
      "GET /service_orders/30": { status: 200, body: order({ status: "in_progress" }) },
      "PATCH /service_orders/30/result": { status: 200, body: order({ status: "result_ready", resultText: "Phổi sáng" }) },
    });
    const user = userEvent.setup();
    open();
    const send = await view.findByRole("button", { name: "Trả kết quả" });
    expect(send).toBeDisabled();
    await user.type(view.getByLabelText("Kết quả"), "  Phổi sáng  ");
    await user.click(send);
    await waitFor(() => expect(sent("PATCH", "/service_orders/30/result")).toHaveLength(1));
    expect(sent("PATCH", "/service_orders/30/result")[0].body).toEqual({ resultText: "Phổi sáng" });
  });

  it("SO4 the ordering doctor marks the result read and goes back to the visit", async () => {
    api({
      "GET /service_orders/30": { status: 200, body: order({ status: "result_ready", resultText: "Phổi sáng" }) },
      "POST /service_orders/30/review": { status: 200, body: order({ status: "reviewed", resultText: "Phổi sáng" }) },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Đã xem kết quả" }));
    await waitFor(() => expect(sent("POST", "/service_orders/30/review")).toHaveLength(1));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/clinical-encounters/show/20"));
  });

  it("SO5 without the right to perform the result is only read", async () => {
    access.can = false;
    api({ "GET /service_orders/30": { status: 200, body: order({ status: "result_ready", resultText: "Phổi sáng" }) } });
    open();
    expect(await view.findByText("Phổi sáng")).toBeInTheDocument();
    expect(view.queryByLabelText("Kết quả")).toBeNull();
    expect(view.queryByRole("button", { name: "Đã xem kết quả" })).toBeNull();
  });

  it("SO6 a cancelled order says why", async () => {
    api({ "GET /service_orders/30": { status: 200, body: order({ status: "cancelled", cancelReason: "Bệnh nhân từ chối" }) } });
    open();
    expect(await view.findByText("Đã huỷ: Bệnh nhân từ chối")).toBeInTheDocument();
  });

  it("SO7 a refused start (not paid at the server) is told in a toast", async () => {
    api({
      "GET /service_orders/30": { status: 200, body: order() },
      "POST /service_orders/30/start": { status: 409, body: { status: 409, message: "This service is not paid yet; it is done once the patient has paid for it" } },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Bắt đầu thực hiện" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
  });
});
