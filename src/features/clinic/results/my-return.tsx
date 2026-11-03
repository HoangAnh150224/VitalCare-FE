import { useQuery } from "@tanstack/react-query";
import { CalendarClockIcon } from "lucide-react";

import { kyInstance } from "@/shared/api/data";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import { RETURN_STATUS_LABELS, RETURN_STATUS_VARIANTS, type ResultReturn } from "@/domains/results/types";

/** BF-07 in the portal: when to come back for this visit's results, and whether it was missed. */
export function MyResultReturn({ appointmentId }: { appointmentId: number }) {
  const { data } = useQuery({
    queryKey: ["my_result_returns"],
    queryFn: () => kyInstance.get("my_result_returns").json<ResultReturn[]>(),
  });
  const rows = (data ?? []).filter((r) => r.appointmentId === appointmentId && r.status !== "CANCELLED");
  if (rows.length === 0) return null;
  const r = rows[0];
  return (
    <section className="card-soft flex items-start gap-4 p-5" data-testid="my-return">
      <CalendarClockIcon className="text-primary mt-0.5 size-6 shrink-0" />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">Hẹn nhận kết quả</h2>
          <Badge variant={RETURN_STATUS_VARIANTS[r.status]}>{RETURN_STATUS_LABELS[r.status]}</Badge>
        </div>
        <p className="font-medium tabular-nums">{formatDateTime(r.scheduledAt)}</p>
        {r.note && <p className="text-muted-foreground text-sm">{r.note}</p>}
        {r.status === "MISSED" && (
          <p className="text-destructive text-sm">Bạn đã lỡ hẹn. Hãy liên hệ phòng khám để hẹn lại.</p>
        )}
      </div>
    </section>
  );
}
