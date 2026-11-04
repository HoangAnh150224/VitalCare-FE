import { useCan, useShow } from "@refinedev/core";
import { BanknoteIcon, PrinterIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { DetailList, DetailPanel, DetailRow, EmptyValue } from "@/shared/components/views/record-detail";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import type { Invoice } from "@/domains/billing/types";
import { formatDateTime } from "@/shared/lib/format";
import { CounterPaymentDialog } from "./counter-payment";
import { InvoiceLines, InvoiceStatusBadge, PaymentHistory } from "./invoice-lines";

/**
 * One bill, at the front desk: its lines, who has tried to pay it, and
 * taking the money at the counter. Printing gives the receipt — the page
 * itself, with the controls hidden.
 */
export const InvoiceShow = () => {
  const { result: invoice, query } = useShow<Invoice>({ resource: "invoices" });
  const { data: canWrite } = useCan({ resource: "invoices", action: "edit" });
  const [paying, setPaying] = useState(false);
  const unpaid = invoice?.status === "unpaid";

  return (
    <ShowView>
      <ShowViewHeader resource="invoices" title="Hóa đơn" />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-lg font-semibold">{invoice?.invoiceNumber ?? "—"}</h2>
                {invoice && <InvoiceStatusBadge status={invoice.status} />}
              </div>
              <p className="text-muted-foreground text-sm">
                {invoice?.clinic?.name} · lập lúc {formatDateTime(invoice?.issuedAt)}
              </p>
            </div>
            <div data-print="hide" className="flex flex-wrap gap-2">
              {unpaid && canWrite?.can && invoice?._can?.write !== false && (
                <Button onClick={() => setPaying(true)}>
                  <BanknoteIcon />
                  Ghi nhận thanh toán
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon />
                {unpaid ? "In hóa đơn" : "In biên lai"}
              </Button>
            </div>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <DetailPanel title="Chi tiết">
          <div className="px-4 py-2">{invoice && <InvoiceLines invoice={invoice} />}</div>
        </DetailPanel>
        <div className="flex flex-col gap-4">
          <DetailPanel title="Bệnh nhân">
            <DetailList>
              <DetailRow label="Họ tên">{invoice?.patient.fullName ?? <EmptyValue />}</DetailRow>
              <DetailRow label="Mã">{invoice?.patient.customerCode ?? <EmptyValue />}</DetailRow>
              <DetailRow label="Điện thoại">{invoice?.patient.phone ?? <EmptyValue />}</DetailRow>
              <DetailRow label="Lần khám">
                {invoice?.encounterId ? (
                  <Link to={`/clinical-encounters/show/${invoice.encounterId}`} className="hover:underline">
                    #{invoice.encounterId}
                  </Link>
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
              <DetailRow label="Thanh toán lúc">{formatDateTime(invoice?.paidAt)}</DetailRow>
            </DetailList>
          </DetailPanel>
          <DetailPanel title="Giao dịch">{invoice && <PaymentHistory invoice={invoice} />}</DetailPanel>
        </div>
      </div>

      {invoice && <CounterPaymentDialog invoice={invoice} open={paying} onClose={() => setPaying(false)} />}
    </ShowView>
  );
};
