import { useQuery } from "@tanstack/react-query";

import { kyInstance } from "@/shared/api/data";
import type { MonitoringOrder } from "@/domains/sharing/types";

/** The query key every view of a patient's monitoring orders shares. */
export const monitoringOrdersKey = (customerId: number) => ["monitoring_orders", customerId];

/** A patient's monitoring orders, newest first. */
export function useMonitoringOrders(customerId: number, enabled = true) {
  return useQuery({
    queryKey: monitoringOrdersKey(customerId),
    queryFn: () =>
      kyInstance
        .get("monitoring_orders", { searchParams: { customerId: String(customerId) } })
        .json<MonitoringOrder[]>(),
    enabled,
  });
}
