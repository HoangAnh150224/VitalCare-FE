import { useCan } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";

import { kyInstance } from "@/shared/api/data";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";
import { CALL_LABELS, type EscalationCall } from "@/domains/sharing/types";

/** Caregiver Escalation and Call Log (BF-06) for one alert. */
export function CallLogPanel({ alertId }: { alertId: number }) {
  const { data: can } = useCan({ resource: "escalations", action: "list" });
  const { data } = useQuery({
    queryKey: ["escalations", alertId],
    queryFn: () =>
      kyInstance
        .get("escalations", { searchParams: { alertId: String(alertId) } })
        .json<EscalationCall[]>(),
    enabled: Boolean(can?.can),
    refetchInterval: 15_000,
  });
  if (!can?.can || !data?.length) return null;
  return (
    <DetailPanel title="Nhật ký gọi khẩn" bodyClassName="p-4">
      <ul className="flex flex-col gap-2" data-testid="call-log">
        {data.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-medium">{CALL_LABELS[c.channel]}</span> tới{" "}
            {c.phone} · {formatDateTime(c.placedAt)} · {c.outcome}
            {c.detail && (
              <div className="text-muted-foreground text-xs">{c.detail}</div>
            )}
          </li>
        ))}
      </ul>
    </DetailPanel>
  );
}
