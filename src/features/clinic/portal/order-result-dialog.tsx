import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { formatDateTime } from "@/shared/lib/format";
import type { ServiceOrder } from "@/domains/billing/types";
import { SERVICE_CATEGORY_LABELS } from "@/domains/billing/types";
import { OrderFiles, OrderStatusBadge } from "../service-orders/order-parts";

/**
 * One service's result as the patient opens it from their visit result: the
 * whole result, its files, who did it and when — what the doctor reads, less
 * the actions.
 */
export function OrderResultDialog({
  order,
  appointmentId,
  onOpenChange,
}: {
  order: ServiceOrder | null;
  appointmentId: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={order != null} onOpenChange={onOpenChange}>
      {order && (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{order.service.name}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>{SERVICE_CATEGORY_LABELS[order.service.category]}</span>
              <OrderStatusBadge status={order.status} />
            </DialogDescription>
          </DialogHeader>

          <section className="flex flex-col gap-2" data-testid="order-result">
            <h3 className="text-sm font-semibold">Kết quả</h3>
            <p className="bg-muted/50 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">
              {order.resultText || <span className="text-muted-foreground">Chưa có kết quả</span>}
            </p>
            <OrderFiles
              order={order}
              downloadPath={(fileId) => `my_appointments/${appointmentId}/result/files/${fileId}`}
            />
          </section>

          <dl className="divide-border/70 divide-y rounded-xl border text-sm">
            {order.instruction && <Item label="Chỉ định của bác sĩ">{order.instruction}</Item>}
            <Item label="Bác sĩ chỉ định">{order.orderedBy}</Item>
            <Item label="Chỉ định lúc">{when(order.orderedAt)}</Item>
            <Item label="Người thực hiện">{order.performedBy}</Item>
            <Item label="Có kết quả lúc">{when(order.resultAt)}</Item>
            <Item label="Bác sĩ đã xem">
              {order.reviewedAt ? `${order.reviewedBy ?? ""} · ${formatDateTime(order.reviewedAt)}`.replace(/^ · /, "") : null}
            </Item>
          </dl>
        </DialogContent>
      )}
    </Dialog>
  );
}

const when = (at: string | null) => (at ? formatDateTime(at) : null);

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4">
      <dt className="text-muted-foreground shrink-0 sm:w-36">{label}</dt>
      <dd className="whitespace-pre-line">{children || "—"}</dd>
    </div>
  );
}
