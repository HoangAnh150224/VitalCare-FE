import { useQuery } from "@tanstack/react-query";

import { kyInstance } from "@/shared/api/data";
import type { Alert } from "@/domains/alerts/types";

/**
 * A patient's latest alerts, newest first — for staff (`/alerts?customerId=`)
 * or for the patient themself (`/my_alerts`). One cache entry per patient, so
 * the alert history and the vital tiles read it once.
 */
export function usePatientAlerts(
  customerId: number | null,
  own: boolean,
  enabled = true
) {
  return useQuery({
    queryKey: [own ? "my_alerts" : "alerts", "patient", customerId],
    queryFn: () =>
      own
        ? kyInstance
            .get("my_alerts", {
              searchParams: {
                ...(customerId ? { profileId: String(customerId) } : {}),
                _start: "0",
                _end: "20",
              },
            })
            .json<Alert[]>()
        : kyInstance
            .get("alerts", {
              searchParams: {
                customerId: String(customerId),
                _start: "0",
                _end: "20",
              },
            })
            .json<Alert[]>(),
    enabled: enabled && (own || customerId != null),
    refetchInterval: 60_000,
  });
}
