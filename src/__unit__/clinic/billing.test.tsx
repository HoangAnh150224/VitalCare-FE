/** FE-23 Collect Payment at Clinic: CounterPaymentDialog. Report-5.1, sheet FE_ClinicScreens. */
import { screen as view, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CounterPaymentDialog } from "@/features/clinic/invoices/counter-payment";
import { api, notify, screen, sent } from "./harness";

const invoice = {
  id: 21, invoiceNumber: "HD-0021", status: "unpaid", kind: "examination", serviceOrderId: null,
  patient: { id: 1, customerCode: "KH001", fullName: "Trần Thị Bích", phone: null }, clinic: null,
  appointmentId: 10, encounterId: null, issuedAt: "2026-11-22T01:00:00Z", paidAt: null, subtotal: 150000, totalAmount: 150000,
  items: [{ description: "Khám bệnh", category: "consultation", quantity: 1, unitPrice: 150000, amount: 150000, serviceOrderId: null }],
  payments: [],
};

const onClose = vi.fn();
const open = () => screen("/invoices/show/21", "/invoices/show/:id", <CounterPaymentDialog invoice={invoice as never} open onClose={onClose} />);

beforeEach(() => {
  notify.open.mockClear();
  onClose.mockClear();
});

describe("CounterPaymentDialog — Collect Payment at Clinic", () => {
  it("PY1 the dialog says the total, the bill and whose it is", async () => {
    api({});
    open();
    expect(await view.findByText("Thu 150.000 ₫")).toBeInTheDocument();
    expect(view.getByText(/Hóa đơn HD-0021 của Trần Thị Bích/)).toBeInTheDocument();
  });

  it("PY2 cash: the amount given is grouped as typed and the change is worked out", async () => {
    api({});
    const user = userEvent.setup();
    open();
    const given = await view.findByLabelText("Khách đưa");
    await user.type(given, "200000");
    expect(given).toHaveValue("200.000");
    expect(view.getByText("50.000 ₫")).toBeInTheDocument();
  });

  it("PY3 cash short of the total: says by how much and the confirm button is off", async () => {
    api({});
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText("Khách đưa"), "100000");
    expect(view.getByRole("alert").textContent).toBe("Khách đưa còn thiếu 50.000 ₫.");
    expect(view.getByRole("button", { name: "Xác nhận đã thu 150.000 ₫" })).toBeDisabled();
  });

  it("PY4 confirming cash posts the payment, says what was taken and the change, and closes", async () => {
    api({ "POST /invoices/21/payments": { status: 200, body: { ...invoice, status: "paid" } } });
    const user = userEvent.setup();
    open();
    await user.type(await view.findByLabelText("Khách đưa"), "200000");
    await user.click(view.getByRole("button", { name: "Xác nhận đã thu 150.000 ₫" }));
    await waitFor(() => expect(sent("POST", "/invoices/21/payments")).toHaveLength(1));
    expect(sent("POST", "/invoices/21/payments")[0].body).toEqual({ method: "cash" });
    await waitFor(() =>
      expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "success", message: "Đã thu 150.000 ₫", description: "Trả lại khách 50.000 ₫." })),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("PY5 bank transfer without a receiving account: says so and offers to record it by hand", async () => {
    api({ "GET /invoices/21/transfer": { status: 404, body: { message: "No transfer" } } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByLabelText("Chuyển khoản"));
    expect(await view.findByText(/Phòng khám chưa cấu hình tài khoản nhận chuyển khoản/)).toBeInTheDocument();
    await user.click(view.getByRole("button", { name: "Xác nhận đã thu 150.000 ₫" }));
    await waitFor(() => expect(sent("POST", "/invoices/21/payments")).toHaveLength(1));
    expect(sent("POST", "/invoices/21/payments")[0].body).toEqual({ method: "bank_transfer" });
  });

  it("PY6 a bill another clerk already took: the refusal is said, the dialog stays", async () => {
    api({ "POST /invoices/21/payments": { status: 409, body: { status: 409, message: "This bill is already paid" } } });
    const user = userEvent.setup();
    open();
    await user.click(await view.findByRole("button", { name: "Xác nhận đã thu 150.000 ₫" }));
    await waitFor(() => expect(notify.open).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
    expect(onClose).not.toHaveBeenCalled();
  });
});
