import { ChevronDownIcon, CloudOffIcon, CreditCardIcon, WalletIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Invoice } from "@/domains/billing/types";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { InvoiceLines, InvoiceStatusBadge, PaymentHistory } from "../invoices/invoice-lines";
import { DateBlock, EmptyState, IconChip } from "./parts";
import { useMyInvoices } from "./use-my-invoices";

/** An instant as the clinic's `YYYY-MM-DD`, for the calendar leaf. */
const clinicDay = (instant: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(instant));

/**
 * What the account has been billed and how each bill was paid: cash or a
 * transfer at the desk, or VNPay — including the attempts that failed, so a
 * patient who says "I paid" can see what the clinic sees.
 */
export const PortalPayments = () => {
  const { invoices, query } = useMyInvoices();
  const [person, setPerson] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const people = [...new Map(invoices.map((invoice) => [invoice.patient.id, invoice.patient.fullName])).entries()];
  const shown = person == null ? invoices : invoices.filter((invoice) => invoice.patient.id === person);
  const unpaid = shown.filter((invoice) => invoice.status === "unpaid");
  const paid = shown.filter((invoice) => invoice.status === "paid");
  const sum = (list: Invoice[]) => list.reduce((total, invoice) => total + invoice.totalAmount, 0);

  return (
    <div className="screen-enter screen-enter-stagger flex flex-col gap-5">
      <div>
        <h1>Thanh toán</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Hóa đơn của bạn và người thân, cùng từng lần thanh toán tại quầy hoặc qua VNPay.
        </p>
      </div>

      {!query.isLoading && !query.isError && invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-soft flex items-center gap-3 p-4">
            <IconChip icon={CreditCardIcon} tone="gold" />
            <div className="flex min-w-0 flex-col">
              <span className="text-muted-foreground text-xs font-medium">Chưa thanh toán</span>
              <span className="font-display text-lg font-extrabold tabular-nums">{formatMoney(sum(unpaid))}</span>
              <span className="text-muted-foreground text-xs">{unpaid.length} hóa đơn</span>
            </div>
          </div>
          <div className="card-soft flex items-center gap-3 p-4">
            <IconChip icon={WalletIcon} tone="green" />
            <div className="flex min-w-0 flex-col">
              <span className="text-muted-foreground text-xs font-medium">Đã thanh toán</span>
              <span className="font-display text-lg font-extrabold tabular-nums">{formatMoney(sum(paid))}</span>
              <span className="text-muted-foreground text-xs">{paid.length} hóa đơn</span>
            </div>
          </div>
        </div>
      )}

      {people.length > 1 && (
        <div role="group" aria-label="Lọc theo người" className="flex flex-wrap gap-2">
          {[[null, "Tất cả"] as const, ...people].map(([id, name]) => (
            <button
              key={id ?? "all"}
              type="button"
              aria-pressed={person === id}
              onClick={() => setPerson(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                person === id ? "bg-primary text-primary-foreground" : "card-soft text-muted-foreground hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-20 rounded-3xl" />
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={CloudOffIcon}
          title="Không tải được lịch sử thanh toán"
          action={
            <Button variant="outline" className="rounded-full" onClick={() => query.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState icon={WalletIcon} title="Chưa có hóa đơn nào" text="Hóa đơn được lập khi bác sĩ hoàn tất lượt khám." />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((invoice) => {
            const expanded = open === invoice.id;
            return (
              <li key={invoice.id} className="card-soft overflow-hidden">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : invoice.id)}
                  className="hover:bg-muted/40 flex w-full items-center gap-4 px-4 py-3.5 text-start transition-colors sm:px-5"
                >
                  <DateBlock isoDate={clinicDay(invoice.issuedAt)} muted={invoice.status === "cancelled"} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-semibold">{invoice.patient.fullName}</span>
                    <span className="text-muted-foreground truncate font-mono text-xs">{invoice.invoiceNumber}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{formatMoney(invoice.totalAmount)}</span>
                    <InvoiceStatusBadge status={invoice.status} />
                  </span>
                  <ChevronDownIcon
                    className={cn("text-muted-foreground size-5 shrink-0 transition-transform", expanded && "rotate-180")}
                  />
                </button>
                {expanded && (
                  <div className="flex flex-col gap-4 border-t px-4 py-4 sm:px-5">
                    <InvoiceLines invoice={invoice} />
                    <div className="flex flex-col gap-1">
                      <h2 className="text-sm font-semibold">Lịch sử giao dịch</h2>
                      <div className="bg-muted/40 -mx-1 rounded-xl">
                        <PaymentHistory invoice={invoice} />
                      </div>
                    </div>
                    {invoice.status === "unpaid" && invoice.appointmentId && (
                      <Button asChild className="self-start rounded-full">
                        <Link to={`/my-results/${invoice.appointmentId}`}>Thanh toán</Link>
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
