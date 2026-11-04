import { useCan } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";

import { kyInstance } from "@/shared/api/data";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { formatDate } from "@/shared/lib/format";
import {
  SHARING_STATUS_LABELS,
  SHARING_STATUS_VARIANTS,
  sharedParts,
  type SharingPermission,
} from "@/domains/sharing/types";

/** Caregiver Access List (BF-06) on a patient's page: who the patient shared with, in force or not. */
export function CaregiversPanel({ customerId }: { customerId: number }) {
  const { data: can } = useCan({ resource: "customers", action: "show" });
  const { data } = useQuery({
    queryKey: ["caregivers", customerId],
    queryFn: () =>
      kyInstance
        .get(`customers/${customerId}/caregivers`)
        .json<SharingPermission[]>(),
    enabled: Boolean(can?.can),
  });
  if (!can?.can) return null;
  const rows = data ?? [];
  return (
    <DetailPanel title="Người chăm sóc được chia sẻ" bodyClassName="p-4">
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Bệnh nhân chưa chia sẻ cho ai.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="caregivers">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <span className="flex flex-col">
                <span className="font-medium">
                  {p.caregiverName} · {p.caregiverPhone}
                </span>
                <span className="text-muted-foreground text-xs">
                  {sharedParts(p)} · khẩn cấp {p.emergencyPhone}
                  {p.expiresAt ? ` · đến ${formatDate(p.expiresAt)}` : ""}
                </span>
              </span>
              <Badge variant={SHARING_STATUS_VARIANTS[p.status]}>
                {SHARING_STATUS_LABELS[p.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </DetailPanel>
  );
}
