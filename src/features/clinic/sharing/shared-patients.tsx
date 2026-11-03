import { useQuery } from "@tanstack/react-query";
import { HandHeartIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { sharedParts, type SharedPatient } from "@/domains/sharing/types";
import {
  ALERT_STATUS_LABELS,
  ALERT_STATUS_VARIANTS,
  SEVERITY_LABELS,
  SEVERITY_VARIANTS,
  type Alert,
} from "@/domains/alerts/types";
import type { Appointment } from "@/domains/appointment/types";
import { VitalMonitor } from "../vital-signs/vital-parts";

/** "Người tôi chăm sóc" (BF-06 Shared Patient Information): who shared with this account. */
export const SharedPatientList = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["shared_patients"],
    queryFn: () => kyInstance.get("shared_patients").json<SharedPatient[]>(),
  });
  const rows = data ?? [];
  return (
    <div className="screen-enter flex flex-col gap-5">
      <div>
        <h1>Người tôi chăm sóc</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Những người đã chia sẻ sức khỏe với bạn, trong phạm vi họ cho phép.
        </p>
      </div>
      {isLoading ? null : rows.length === 0 ? (
        <Card className="items-center gap-2 px-6 py-8 text-center">
          <HandHeartIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">
            Chưa có ai chia sẻ với bạn.
          </p>
        </Card>
      ) : (
        rows.map((p) => (
          <Link
            key={p.permissionId}
            to={`/shared-patients/${p.customerId}`}
            data-testid={`shared-${p.customerId}`}
          >
            <Card className="hover:bg-accent/30 gap-1 px-5 py-4 transition-colors">
              <span className="font-medium">{p.fullName}</span>
              <span className="text-muted-foreground text-xs">
                Được xem: {sharedParts(p)}
                {p.expiresAt ? ` · đến ${formatDate(p.expiresAt)}` : ""}
              </span>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
};

/** One shared patient: only the parts the grant covers, each re-checked by the server. */
export const SharedPatientShow = () => {
  const customerId = Number(useParams().customerId);
  const { data: list } = useQuery({
    queryKey: ["shared_patients"],
    queryFn: () => kyInstance.get("shared_patients").json<SharedPatient[]>(),
  });
  const grant = list?.find((p) => p.customerId === customerId);
  const { data: alerts } = useQuery({
    queryKey: ["shared_patients", customerId, "alerts"],
    queryFn: () =>
      kyInstance.get(`shared_patients/${customerId}/alerts`).json<Alert[]>(),
    enabled: Boolean(grant?.shareAlerts),
    refetchInterval: 30_000,
  });
  const { data: visits } = useQuery({
    queryKey: ["shared_patients", customerId, "appointments"],
    queryFn: () =>
      kyInstance
        .get(`shared_patients/${customerId}/appointments`)
        .json<Appointment[]>(),
    enabled: Boolean(grant?.shareAppointments),
  });

  if (list && !grant) {
    return (
      <p className="text-muted-foreground text-sm">
        Bạn không còn được xem thông tin của người này (quyền đã hết hạn hoặc bị
        thu hồi).
      </p>
    );
  }
  return (
    <div className="screen-enter flex flex-col gap-5">
      <div>
        <h1>{grant?.fullName ?? ""}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Được xem: {grant ? sharedParts(grant) : ""}
        </p>
      </div>
      {grant?.shareVitals && (
        <VitalMonitor scope={{ kind: "shared", customerId }} />
      )}
      {grant?.shareAlerts && (
        <Card className="gap-0 py-0" data-testid="shared-alerts">
          <div className="border-b px-4 py-2.5 text-sm font-medium">
            Cảnh báo
          </div>
          {(alerts ?? []).length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              Chưa có cảnh báo nào.
            </p>
          ) : (
            <ul className="divide-y">
              {(alerts ?? []).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{a.message}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(a.triggeredAt)}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    <Badge variant={SEVERITY_VARIANTS[a.severity]}>
                      {SEVERITY_LABELS[a.severity]}
                    </Badge>
                    <Badge variant={ALERT_STATUS_VARIANTS[a.status]}>
                      {ALERT_STATUS_LABELS[a.status]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {grant?.shareAppointments && (
        <Card className="gap-0 py-0" data-testid="shared-visits">
          <div className="border-b px-4 py-2.5 text-sm font-medium">
            Lượt khám
          </div>
          {(visits ?? []).length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              Chưa có lượt khám nào.
            </p>
          ) : (
            <ul className="divide-y">
              {(visits ?? []).map((v) => (
                <li key={v.id} className="px-4 py-2.5 text-sm">
                  {formatDate(v.appointmentDate)} · {v.reason ?? ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};
