import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import {
  ALERT_STATUS_LABELS,
  ALERT_STATUS_VARIANTS,
  SEVERITY_LABELS,
  SEVERITY_VARIANTS,
} from "@/domains/alerts/types";
import { usePatientAlerts } from "./use-patient-alerts";

/** Patient Alert History (FE-05): a patient's alerts, newest first. */
export function PatientAlertHistory({
  customerId,
  own = false,
}: {
  customerId: number | null;
  own?: boolean;
}) {
  const { data, isLoadingError, refetch } = usePatientAlerts(customerId, own);
  const rows = data ?? [];

  return (
    <Card className="gap-0 py-0" data-testid="patient-alerts">
      <div className="border-b px-4 py-2.5 text-sm font-medium">
        Lịch sử cảnh báo
      </div>
      {isLoadingError ? (
        <p className="text-muted-foreground px-4 py-6 text-center text-sm">
          Không tải được lịch sử cảnh báo.{" "}
          <Button variant="link" className="h-auto p-0" onClick={() => refetch()}>
            Thử lại
          </Button>
        </p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-center text-sm">
          Chưa có cảnh báo nào.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((a) => {
            const body = (
              <>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{a.message}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(a.triggeredAt)}
                    {a.occurrences > 1 ? ` · ${a.occurrences} lần` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Badge variant={SEVERITY_VARIANTS[a.severity]}>
                    {SEVERITY_LABELS[a.severity]}
                  </Badge>
                  <Badge variant={ALERT_STATUS_VARIANTS[a.status]}>
                    {ALERT_STATUS_LABELS[a.status]}
                  </Badge>
                </span>
              </>
            );
            return (
              <li key={a.id}>
                {own ? (
                  <div className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                    {body}
                  </div>
                ) : (
                  <Link
                    to={`/alerts/show/${a.id}`}
                    className="hover:bg-accent/30 flex items-start justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
