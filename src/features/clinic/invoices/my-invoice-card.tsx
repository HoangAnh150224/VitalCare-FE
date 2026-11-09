import { useCustom, useCustomMutation, useNotification } from "@refinedev/core";
import { CreditCardIcon, StoreIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  failed: {
    type: "error",
    message: "Thanh toán chưa thành công. Bạn có thể thử lại, hoặc chọn trả tại quầy (nếu được).",
  },
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
  // BR-11: after three no-shows the account pays its examination fees online; the desk is not offered.
  const { result: rules } = useCustom<{ onlinePaymentRequired: boolean }>({
    url: `${API_URL}/my_appointments/payment-rules`,
    method: "get",
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const deskAllowed = !rules?.data?.onlinePaymentRequired;
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
        <BillCard key={own.invoice.id} own={own} deskAllowed={deskAllowed} />
      ))}
    </div>
  );
}

function BillCard({ own, deskAllowed }: { own: OwnInvoice; deskAllowed: boolean }) {
  const { invoice, onlinePayment, transfer } = own;
  const { mutate, mutation } = useCustomMutation<{ url: string }>();
  const { open } = useNotification();
  // UC-01 step 4: the examination fee is paid online now, or at the desk on the day (it stays unpaid
  // and the place is held until the day's last check-in, BR-10). Services are paid as before.
  const choosing = invoice.kind !== "service" && (onlinePayment || transfer);
  const [choice, setChoice] = useState<"online" | "desk" | null>(null);
  const showOnline = !choosing || choice === "online" || !deskAllowed;

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
      {invoice.status === "unpaid" && choosing && deskAllowed && choice === null && (
        <div data-print="hide" className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Chọn cách thanh toán</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setChoice("online")}>
              <CreditCardIcon />
              Thanh toán online
            </Button>
            <Button variant="outline" onClick={() => setChoice("desk")}>
              <StoreIcon />
              Trả tại quầy
            </Button>
          </div>
        </div>
      )}
      {invoice.status === "unpaid" && choosing && choice === "desk" && deskAllowed && (
        <div data-print="hide" className="flex flex-col gap-2 text-sm">
          <p>
            Bạn sẽ trả phí khám tại quầy lễ tân khi tới khám. Lượt khám được giữ đến hết giờ tiếp nhận của ngày
            khám; quá giờ mà chưa tới sẽ ghi nhận không đến.
          </p>
          <Button variant="link" className="h-auto w-fit p-0" onClick={() => setChoice("online")}>
            Đổi sang thanh toán online
          </Button>
        </div>
      )}
      {invoice.status === "unpaid" && showOnline && (
        <div data-print="hide" className="flex flex-col gap-3">
          {choosing && !deskAllowed && (
            <p className="text-warning text-sm">
              Tài khoản đã 3 lần không đến khám nên cần thanh toán online trước khi tới khám.
            </p>
          )}
          {transfer && <TransferBox transfer={transfer} />}
          {onlinePayment ? (
            <Button onClick={pay} disabled={mutation.isPending}>
              <CreditCardIcon />
              {mutation.isPending ? "Đang chuyển đến VNPay..." : "Thanh toán qua VNPay"}
            </Button>
          ) : null}
          {choosing && deskAllowed ? (
            <Button variant="link" className="h-auto w-fit p-0 text-xs" onClick={() => setChoice("desk")}>
              Không thanh toán được? Chọn trả tại quầy
            </Button>
          ) : (
            !choosing && (
              <p className="text-muted-foreground text-xs">
                {onlinePayment || transfer ? "Hoặc thanh toán tại quầy lễ tân." : "Vui lòng thanh toán tại quầy lễ tân."}
              </p>
            )
          )}
        </div>
      )}
    </Card>
  );
}
