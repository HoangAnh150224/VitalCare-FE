import { useCan } from "@refinedev/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { kyInstance } from "@/shared/api/data";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from "@/domains/sharing/types";
import { monitoringOrdersKey, useMonitoringOrders } from "./use-monitoring-orders";

/**
 * BF-04 on a patient: the monitoring orders and the patient's answers. The
 * order itself is written with the doctor's conclusion (the consultation panel); this shows what
 * was ordered and lets a doctor end an active one. A patient never ordered
 * monitoring gets no panel at all.
 */
export function MonitoringOrdersPanel({ customerId }: { customerId: number }) {
  const { data: canRead } = useCan({
    resource: "monitoring_orders",
    action: "list",
  });
  const { data: canWrite } = useCan({
    resource: "monitoring_orders",
    action: "create",
  });
  const queryClient = useQueryClient();
  const { data } = useMonitoringOrders(customerId, Boolean(canRead?.can));
  const end = useMutation({
    mutationFn: (id: number) =>
      kyInstance.post(`monitoring_orders/${id}/end`, { json: {} }).json(),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: monitoringOrdersKey(customerId) }),
  });
  const orders = data ?? [];
  if (!canRead?.can || orders.length === 0) return null;

  return (
    <DetailPanel title="Chỉ định theo dõi IoMT" bodyClassName="p-4">
      <ul className="flex flex-col gap-2" data-testid="monitoring-orders">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm"
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">{o.reason}</span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(o.decidedAt)}
                {o.orderedByName ? ` · ${o.orderedByName}` : ""}
                {o.consentNote ? ` · ${o.consentNote}` : ""}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Badge variant={ORDER_STATUS_VARIANTS[o.status]}>
                {ORDER_STATUS_LABELS[o.status]}
              </Badge>
              {o.status === "ACTIVE" && canWrite?.can && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => end.mutate(o.id)}
                  disabled={end.isPending}
                >
                  Kết thúc
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </DetailPanel>
  );
}
