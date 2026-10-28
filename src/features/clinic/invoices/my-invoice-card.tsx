import { useCustom, useCustomMutation, useNotification } from "@refinedev/core";
import { CreditCardIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { customResult } from "@/shared/hooks/use-custom-result";
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
 * The bill on a customer's appointment slip, once the visit is concluded,
 * and paying it: a VietQR code for a bank transfer (confirmed by itself when
 * the money lands), or VNPay. Nothing shows before there is a bill.
 */
export function MyInvoiceCard({ appointmentId, className }: { appointmentId: number; className?: string }) {
  const { result, query } = useCustom<OwnInvoice>({
    url: `${API_URL}/my_appointments/${appointmentId}/invoice`,
    method: "get",
    // 404 until the doctor concludes the visit: that is "no bill yet", not an error to announce.
    errorNotification: false,
    queryOptions: {
      retry: false,
      // While a transfer is on offer, look again every few seconds: SePay settles it on its own.
      refetchInterval: (query) => {
        const data = (query.state.data as { data?: OwnInvoice } | undefined)?.data;
        return data?.invoice?.status === "unpaid" && data.transfer ? TRANSFER_POLL_MS : false;
      },
    },
  });
  const own = customResult(result?.data, "invoice");
  const { mutate, mutation } = useCustomMutation<{ url: string }>();
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

  // Paid while on screen (the transfer landed): say so once.
  const status = own?.invoice.status;
  const previous = useRef(status);
  useEffect(() => {
    if (previous.current === "unpaid" && status === "paid") {
      open?.({ type: "success", message: "Đã nhận thanh toán. Cảm ơn bạn!", key: "transfer-paid" });
    }
    previous.current = status;
  }, [status, open]);

  if (!own) return null;
  const { invoice, onlinePayment, transfer } = own;

  const pay = () =>
    mutate(
      {
        url: `${API_URL}/my_appointments/${appointmentId}/invoice/vnpay`,
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
    <Card className={cn("mx-auto w-full max-w-md gap-4 px-6 py-5", className)}>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Hóa đơn</h3>
        <span className="text-muted-foreground font-mono text-xs">{invoice.invoiceNumber}</span>
        <span className="ms-auto">
          <InvoiceStatusBadge status={invoice.status} />
        </span>
      </div>
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
