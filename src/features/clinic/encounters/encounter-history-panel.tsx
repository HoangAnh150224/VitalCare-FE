import { useCan, useList } from "@refinedev/core";
import { PlusIcon } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";
import type { Encounter } from "@/domains/encounter/types";
import { ENCOUNTER_STATUS_LABELS, newEncounterPath, type NewEncounterTarget } from "@/domains/encounter/types";
import { ENCOUNTER_STATUS_VARIANTS } from "@/shared/lib/status-variants";

type Props = NewEncounterTarget;

/**
 * A patient's encounters, newest first, and the way to open a new one.
 *
 * Renders nothing for somebody without `clinical_encounters:read` — which is
 * what keeps it off an administrator's read-only view of this page.
 */
export function EncounterHistoryPanel(props: Props) {
  const { data: canRead } = useCan({ resource: "clinical_encounters", action: "list" });
  const { data: canCreate } = useCan({ resource: "clinical_encounters", action: "create" });

  const { result } = useList<Encounter>({
    resource: "clinical_encounters",
    filters: [{ field: "customer.id", operator: "eq", value: props.customerId }],
    pagination: { pageSize: 20 },
    queryOptions: { enabled: canRead?.can ?? false },
  });

  if (!canRead?.can) return null;
  const rows = result?.data ?? [];

  return (
    <DetailPanel
      title="Lịch sử khám"
      action={
        canCreate?.can ? (
          <Button asChild size="sm" variant="outline">
            <Link to={newEncounterPath(props)}>
              <PlusIcon />
              Tạo lần khám
            </Link>
          </Button>
        ) : undefined
      }
      bodyClassName="p-4"
    >
      {rows.length ? (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/clinical-encounters/show/${row.id}`}
                className="border-border hover:bg-accent/40 flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{formatDateTime(row.startedAt)}</span>
                  <span className="text-muted-foreground line-clamp-1 text-xs">
                    {row.chiefComplaint}
                    {row.clinician ? ` · ${row.clinician.fullName}` : ""}
                  </span>
                </span>
                <Badge variant={ENCOUNTER_STATUS_VARIANTS[row.status] ?? "secondary"}>
                  {ENCOUNTER_STATUS_LABELS[row.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Chưa có lần khám nào.</p>
      )}
    </DetailPanel>
  );
}
