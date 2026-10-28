import { useCustom, useCustomMutation, useInvalidate, useNotification } from "@refinedev/core";
import { useEffect, useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import type { Invoice, PaymentMethod, TransferInstructions } from "@/domains/billing/types";
import { PAYMENT_METHOD_LABELS } from "@/domains/billing/types";
import { billingErrorNotification } from "@/domains/billing/messages";
import { formatMoney } from "@/shared/lib/format";
import { customResult } from "@/shared/hooks/use-custom-result";
import { InvoiceLines } from "./invoice-lines";
import { TransferBox } from "./transfer-box";

/** "200.000" or "200000" → 200000; anything without a digit → null. */
const parseAmount = (text: string) => {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : null;
};

/** How often the desk's open transfer looks for the money to have landed. */
const TRANSFER_POLL_MS = 3_000;

/**
 * Taking the money at the counter, and saying so: the lines being paid for,
 * how, and — in cash — what the patient handed over and the change owed. By
 * transfer, the bill's VietQR code for the patient to scan right there; SePay
 * settles it and the dialog closes by itself, with the manual confirmation
 * kept for a transfer the system could not match. The API settles a bill
 * once; a second clerk is told it is already paid.
 */
export function CounterPaymentDialog({ invoice, open, onClose }: { invoice: Invoice; open: boolean; onClose: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [given, setGiven] = useState("");
  const { mutate, mutation } = useCustomMutation<Invoice>();
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();

  // By transfer: the account and the code to show, and — while showing — whether it is paid yet.
  const byTransfer = open && method === "bank_transfer";
  const { result: transferResult, query: transferQuery } = useCustom<TransferInstructions>({
    url: `${API_URL}/invoices/${invoice.id}/transfer`,
    method: "get",
    errorNotification: false,
    queryOptions: { enabled: byTransfer, retry: false },
  });
  const transfer = customResult(transferResult?.data, "content");
  const { result: liveResult } = useCustom<Invoice>({
    url: `${API_URL}/invoices/${invoice.id}`,
    method: "get",
    errorNotification: false,
    queryOptions: { enabled: byTransfer && Boolean(transfer), refetchInterval: TRANSFER_POLL_MS },
  });
  const settledByTransfer = byTransfer && customResult(liveResult?.data, "status")?.status === "paid";

  const total = invoice.totalAmount;
  const received = method === "cash" ? parseAmount(given) : null;
  const short = received != null && received < total;
  const change = received != null && !short ? received - total : null;

  const close = () => {
    setGiven("");
    setMethod("cash");
    onClose();
  };

  // The transfer landed while the patient stood there: say so and close.
  useEffect(() => {
    if (!settledByTransfer) return;
    notify?.({ type: "success", message: `Đã nhận chuyển khoản ${formatMoney(total)}`, key: `transfer-${invoice.id}` });
    invalidate({ resource: "invoices", invalidates: ["all"] });
    close();
    // close() is recreated each render; reacting to the settlement alone is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledByTransfer]);

  const confirm = () =>
    mutate(
      {
        url: `${API_URL}/invoices/${invoice.id}/payments`,
        method: "post",
        values: { method },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
        errorNotification: billingErrorNotification,
      },
      {
        onSuccess: () => {
          notify?.({
            type: "success",
            message: `Đã thu ${formatMoney(total)}`,
            description: change ? `Trả lại khách ${formatMoney(change)}.` : undefined,
          });
          close();
        },
        // Paid or not, the bill on screen may be stale now.
        onSettled: () => invalidate({ resource: "invoices", invalidates: ["all"] }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thu {formatMoney(total)}</DialogTitle>
          <DialogDescription>
            Hóa đơn {invoice.invoiceNumber} của {invoice.patient.fullName}. Chỉ xác nhận khi đã nhận đủ tiền.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 rounded-lg px-4 py-1">
          <InvoiceLines invoice={invoice} />
        </div>

        <RadioGroup
          value={method}
          onValueChange={(value) => setMethod(value as PaymentMethod)}
          className="flex flex-wrap gap-5"
          aria-label="Hình thức thanh toán"
        >
          {(["cash", "bank_transfer"] as const).map((value) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem id={`pay-${value}`} value={value} />
              <Label htmlFor={`pay-${value}`}>{PAYMENT_METHOD_LABELS[value]}</Label>
            </div>
          ))}
        </RadioGroup>

        {method === "cash" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cash-given">Khách đưa</Label>
              <Input
                id="cash-given"
                inputMode="numeric"
                maxLength={15}
                placeholder={formatMoney(total)}
                value={given}
                onChange={(event) => {
                  const amount = parseAmount(event.target.value);
                  setGiven(amount == null ? "" : amount.toLocaleString("vi-VN"));
                }}
                aria-invalid={short || undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Tiền thối lại</span>
              <span className="flex h-9 items-center text-lg font-semibold tabular-nums">
                {change != null ? formatMoney(change) : "—"}
              </span>
            </div>
            {short && (
              <p role="alert" className="text-destructive text-sm sm:col-span-2">
                Khách đưa còn thiếu {formatMoney(total - received!)}.
              </p>
            )}
          </div>
        )}

        {method === "bank_transfer" &&
          (transferQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Đang lấy thông tin chuyển khoản…</p>
          ) : transfer ? (
            <div className="flex flex-col gap-2">
              <TransferBox transfer={transfer} />
              <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
                <span aria-hidden className="bg-primary size-2 rounded-full motion-safe:animate-pulse" />
                Đang chờ tiền về. Hóa đơn tự chuyển “Đã thanh toán” khi nhận đủ, không cần bấm gì.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Phòng khám chưa cấu hình tài khoản nhận chuyển khoản. Kiểm tra tiền đã vào tài khoản rồi bấm ghi nhận.
            </p>
          ))}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Đóng
          </Button>
          <Button
            onClick={confirm}
            variant={method === "bank_transfer" && transfer ? "outline" : "default"}
            disabled={short || mutation.isPending}
          >
            {mutation.isPending
              ? "Đang ghi nhận..."
              : method === "bank_transfer" && transfer
                ? "Đã thấy tiền về, ghi nhận tay"
                : `Xác nhận đã thu ${formatMoney(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
