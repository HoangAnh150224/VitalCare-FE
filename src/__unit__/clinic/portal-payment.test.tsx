/** FE-23 Online Payment / My Invoices: MyInvoiceCard (patient portal). Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MyInvoiceCard } from "@/features/clinic/invoices/my-invoice-card";
import { api, notify, screen, sent, type Reply } from "./harness";

const invoice = (over: Record<string, unknown> = {}) => ({
  id: 21, invoiceNumber: "HD-0021", status: "unpaid", kind: "examination", serviceOrderId: null,
  patient: { id: 1, customerCode: "KH001", fullName: "Trần Thị Bích", phone: null }, clinic: null,
  appointmentId: 10, encounterId: null, issuedAt: "2026-11-22T01:00:00Z", paidAt: null, subtotal: 150000, totalAmount: 150000,
  items: [{ description: "Khám bệnh", category: "consultation", quantity: 1, unitPrice: 150000, amount: 150000, serviceOrderId: null }],
  payments: [], ...over,
});
const visit = (deskChosen: boolean) => ({ id: 10, appointmentDate: "2026-11-25", deskPaymentChosenAt: deskChosen ? "2026-11-22T01:00:00Z" : null });

function routes(bills: unknown[], extra: Record<string, Reply> = {}, onlineRequired = false, deskChosen = false) {
  return {
    "GET /my_appointments/10/invoice/all": { status: 200, body: bills },
    "GET /my_appointments/payment-rules": { status: 200, body: { onlinePaymentRequired: onlineRequired } },
    "GET /my_appointments/10": { status: 200, body: visit(deskChosen) },
    ...extra,
  };
}

const open = (path = "/my-appointments/show/10") => screen(path, "/my-appointments/show/:id", <MyInvoiceCard appointmentId={10} />);
const assign = vi.fn();
const realLocation = window.location;

beforeEach(() => {
  notify.open.mockClear();
  assign.mockClear();
  Object.defineProperty(window, "location", { configurable: true, value: { ...realLocation, assign } });
});
afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: realLocation });
});

describe("MyInvoiceCard — My Invoices / Online Payment", () => {
  it("PP1 an unpaid examination fee offers online or at the desk", async () => {
    api(routes([{ invoice: invoice(), onlinePayment: true, transfer: null }]));
    open();
    expect(await view.findByText("Phí khám")).toBeInTheDocument();
    expect(view.getByText("HD-0021")).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Thanh toán online" })).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Trả tại quầy" })).toBeInTheDocument();
  });

  it("PP2 online: the VNPay address is asked for and the browser sent there", async () => {
    api(routes([{ invoice: invoice(), onlinePayment: true, transfer: null }], {
      "POST /my_invoices/21/vnpay": { status: 200, body: { url: "https://sandbox.vnpayment.vn/pay?x=1" } },
    }));
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Thanh toán online" }));
    await user.click(view.getByRole("button", { name: "Thanh toán qua VNPay" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://sandbox.vnpayment.vn/pay?x=1"));
    expect(sent("POST", "/my_invoices/21/vnpay")).toHaveLength(1);
  });

  it("PP3 at the desk: asked first, then saved; the card says to pay at the desk", async () => {
    let chosen = false;
    api({
      ...routes([{ invoice: invoice(), onlinePayment: true, transfer: null }]),
      "GET /my_appointments/10": () => ({ status: 200, body: visit(chosen) }),
      "PUT /my_appointments/10/desk-payment": () => {
        chosen = true;
        return { status: 200, body: visit(true) };
      },
    });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Trả tại quầy" }));
    const dialog = await view.findByRole("alertdialog");
    expect(within(dialog).getByText("Trả phí khám tại quầy?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Chọn trả tại quầy" }));
    await waitFor(() => expect(sent("PUT", "/my_appointments/10/desk-payment")).toHaveLength(1));
    expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã chọn trả tại quầy" }));
    expect(await view.findByText("Bạn đã chọn trả tại quầy")).toBeInTheDocument();
  });

  it("PP4 after three no-shows only online is offered, and the reason is said", async () => {
    api(routes([{ invoice: invoice(), onlinePayment: true, transfer: null }], {}, true));
    open();
    expect(await view.findByText("Tài khoản đã 3 lần không đến khám nên cần thanh toán online trước khi tới khám.")).toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Trả tại quầy" })).toBeNull();
    expect(view.getByRole("button", { name: "Thanh toán qua VNPay" })).toBeInTheDocument();
  });

  it("PP5 a refused desk choice is said in Vietnamese", async () => {
    api(routes([{ invoice: invoice(), onlinePayment: true, transfer: null }], {
      "PUT /my_appointments/10/desk-payment": { status: 409, body: { status: 409, message: "Not after three no-shows" } },
    }));
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Trả tại quầy" }));
    await user.click(within(await view.findByRole("alertdialog")).getByRole("button", { name: "Chọn trả tại quầy" }));
    await waitFor(() =>
      expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error", message: "Tài khoản đã 3 lần không đến khám nên cần thanh toán online." })),
    );
  });

  it("PP6 coming back from VNPay: the outcome is told and the bills are read again", async () => {
    api(routes([{ invoice: invoice({ status: "paid", paidAt: "2026-11-22T02:00:00Z" }), onlinePayment: true, transfer: null }]));
    open("/my-appointments/show/10?payment=success");
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Thanh toán thành công. Cảm ơn bạn!" })));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/my-appointments/show/10"));
  });

  it("PP7 a service bill has no choice: online, or the desk", async () => {
    api(routes([{ invoice: invoice({ id: 22, kind: "service", invoiceNumber: "HD-0022" }), onlinePayment: true, transfer: null }]));
    open();
    expect(await view.findByText("Phí dịch vụ")).toBeInTheDocument();
    expect(view.getByText("Thanh toán để được thực hiện dịch vụ bác sĩ đã chỉ định.")).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Thanh toán qua VNPay" })).toBeInTheDocument();
    expect(view.getByText("Hoặc thanh toán tại quầy lễ tân.")).toBeInTheDocument();
  });

  it("PP8 cancelled bills are left out; with none to show the card is empty", async () => {
    api(routes([{ invoice: invoice({ status: "cancelled" }), onlinePayment: true, transfer: null }]));
    open();
    await waitFor(() => expect(sent("GET", "/my_appointments/10/invoice/all").length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 100));
    expect(view.queryByText("Phí khám")).toBeNull();
  });
});
