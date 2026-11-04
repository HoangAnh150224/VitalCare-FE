import { Badge } from "@/shared/ui/badge";
import type { Invoice } from "@/domains/billing/types";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/domains/billing/types";
import { INVOICE_STATUS_VARIANTS, PAYMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatDateTime, formatMoney } from "@/shared/lib/format";

export const InvoiceStatusBadge = ({ status }: { status: Invoice["status"] }) => (
  <Badge variant={INVOICE_STATUS_VARIANTS[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>
);

/** A bill's lines and total: the examination, then each service. The same on the desk's and the patient's screens. */
export function InvoiceLines({ invoice }: { invoice: Invoice }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground border-b text-left">
          <th className="py-2 font-medium">Nội dung</th>
          <th className="py-2 text-right font-medium">SL</th>
          <th className="py-2 text-right font-medium">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item, index) => (
          <tr key={index} className="border-b last:border-0">
            <td className="py-2">{item.description}</td>
            <td className="py-2 text-right tabular-nums">{item.quantity}</td>
            <td className="py-2 text-right tabular-nums">{formatMoney(item.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2} className="pt-3 font-semibold">
            Tổng cộng
          </td>
          <td className="pt-3 text-right text-base font-semibold tabular-nums">{formatMoney(invoice.totalAmount)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

/** Every attempt to pay, including the ones that failed: what the desk needs when a patient says they paid. */
export function PaymentHistory({ invoice }: { invoice: Invoice }) {
  if (!invoice.payments.length) {
    return <p className="text-muted-foreground px-4 py-4 text-sm">Chưa có giao dịch nào.</p>;
  }
  return (
    <ul className="divide-y">
      {invoice.payments.map((payment) => (
        <li key={payment.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <span className="font-medium">{PAYMENT_METHOD_LABELS[payment.method]}</span>
          <Badge variant={PAYMENT_STATUS_VARIANTS[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
          <span className="tabular-nums">{formatMoney(payment.amount)}</span>
          <span className="text-muted-foreground ms-auto text-xs">
            {formatDateTime(payment.paidAt ?? payment.createdAt)}
            <span className="ml-2 font-mono">{payment.transactionCode}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
