import { useCustom, useCustomMutation, useNotification } from "@refinedev/core";
import { CreditCardIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { OwnInvoice } from "@/domains/billing/types";
import { billingErrorNotification } from "@/domains/billing/messages";
import { InvoiceLines, InvoiceStatusBadge, PaymentHistory } from "./invoice-lines";
import { TransferBox } from "./transfer-box";

/** What VNPay's return tells the customer, by the `?payment=` the API sends them back with. */
const RETURN_MESSAGES: Record<string, { type: "success" | "error"; message: string }> = {
  success: { type: "success", message: "Thanh toán thành công. Cảm ơn bạn!" },
  failed: { type: "error", message: "Thanh toán chưa thành công. Bạn có thể thử lại." },
  invalid: { type: "error", message: "Không xác nhận được giao dịch. Vui lòng liên hệ quầy lễ tân." },
};

/** How often an unpaid bill with a transfer on offer asks whether the money arrived. */
const TRANSFER_POLL_MS = 5_000;

/**
 * The bills on a customer's visit and paying them (BF-02, BF-03): the
 * examination fee first — paid before the visit, it is what puts the patient
 * in the queue, ordered by when it was paid — then each ordered service, paid
 * before it is done. Each by a VietQR bank transfer (confirmed by itself when
 * the money lands) or VNPay, or at the desk.
 */
export function MyInvoiceCard({ appointmentId, className }: { appointmentId: number; className?: string }) {
  const { result, query } = useCustom<OwnInvoice[]>({
    url: `${API_URL}/my_appointments/${appointmentId}/invoice/all`,
    method: "get",
    errorNotification: false,
    queryOptions: {
      retry: false,
      // While a transfer is on offer, look again every few seconds: SePay settles it on its own.
      refetchInterval: (query) => {
        const data = (query.state.data as { data?: OwnInvoice[] } | undefined)?.data;
        return Array.isArray(data) && data.some((own) => own.invoice.status === "unpaid" && own.transfer)
          ? TRANSFER_POLL_MS
          : false;
      },
    },
  });
  const bills = Array.isArray(result?.data) ? result.data.filter((own) => own.invoice.status !== "cancelled") : [];
  const { open } = useNotification();
  const [params, setParams] = useSearchParams();
  const outcome = params.get("payment");
  const refetch = query.refetch;

  // Back from VNPay: say how it went once, then drop the flag so a reload does not repeat it.
  useEffect(() => {
    const message = outcome ? RETURN_MESSAGES[outcome] : undefined;
    if (!message) return;
    // Keyed, so a second run of this effect (StrictMode, a re-render) shows the same toast, not another.
    open?.({ ...message, key: "vnpay-return" });
    void refetch();
    setParams(
      (current) => {
        current.delete("payment");
        return current;
      },
      { replace: true },
    );
  }, [outcome, open, refetch, setParams]);

  if (bills.length === 0) return null;
  return (
    <div className={cn("mx-auto flex w-full max-w-md flex-col gap-3", className)}>
      {bills.map((own) => (
        <BillCard key={own.invoice.id} own={own} />
      ))}
    </div>
  );
}

function BillCard({ own }: { own: OwnInvoice }) {
  const { invoice, onlinePayment, transfer } = own;
  const { mutate, mutation } = useCustomMutation<{ url: string }>();
  const { open } = useNotification();

  // Paid while on screen (the transfer landed): say so once.
  const previous = useRef(invoice.status);
  useEffect(() => {
    if (previous.current === "unpaid" && invoice.status === "paid") {
      open?.({ type: "success", message: "Đã nhận thanh toán. Cảm ơn bạn!", key: `paid-${invoice.id}` });
    }
    previous.current = invoice.status;
  }, [invoice.status, invoice.id, open]);

  const pay = () =>
    mutate(
      {
        url: `${API_URL}/my_invoices/${invoice.id}/vnpay`,
        method: "post",
        values: {},
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
        errorNotification: billingErrorNotification,
      },
      // A full navigation: VNPay's page, then back to this slip through the API's return.
      { onSuccess: ({ data }) => window.location.assign(data.url) },
    );

  return (
    <Card className="w-full gap-4 px-6 py-5">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{invoice.kind === "service" ? "Phí dịch vụ" : "Phí khám"}</h3>
        <span className="text-muted-foreground font-mono text-xs">{invoice.invoiceNumber}</span>
        <span className="ms-auto">
          <InvoiceStatusBadge status={invoice.status} />
        </span>
      </div>
      {invoice.status === "unpaid" && (
        <p className="text-muted-foreground text-sm">
          {invoice.kind === "service"
            ? "Thanh toán để được thực hiện dịch vụ bác sĩ đã chỉ định."
            : "Thanh toán phí khám trước: bạn được xếp hàng chờ khám theo thời điểm thanh toán xong."}
        </p>
      )}
      <InvoiceLines invoice={invoice} />
      {invoice.payments.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Lịch sử giao dịch</h4>
          <div className="bg-muted/40 rounded-xl">
            <PaymentHistory invoice={invoice} />
          </div>
        </div>
      )}
      {invoice.status === "unpaid" && (
        <div data-print="hide" className="flex flex-col gap-3">
          {transfer && <TransferBox transfer={transfer} />}
          {onlinePayment ? (
            <Button onClick={pay} disabled={mutation.isPending}>
              <CreditCardIcon />
              {mutation.isPending ? "Đang chuyển đến VNPay..." : "Thanh toán qua VNPay"}
            </Button>
          ) : null}
          <p className="text-muted-foreground text-xs">
            {onlinePayment || transfer ? "Hoặc thanh toán tại quầy lễ tân." : "Vui lòng thanh toán tại quầy lễ tân."}
          </p>
        </div>
      )}
    </Card>
  );
}
