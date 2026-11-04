import { useCan, useNotification } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { formatDateTime } from "@/shared/lib/format";
import {
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANTS,
  resultsErrorText,
  type ResultReturn,
} from "@/domains/results/types";
import { refusal, send, vnLocal } from "./send";

/** BF-07 on a visit: when the patient comes back for their results; the patient is told when it is set. */
export function ReturnPanel({ appointmentId, encounterId }: { appointmentId: number; encounterId: number }) {
  const { data: canRead } = useCan({ resource: "result_returns", action: "list" });
  const { data: canWrite } = useCan({ resource: "result_returns", action: "create" });
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const key = ["result_returns", "visit", appointmentId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: () =>
      kyInstance
        .get("result_returns", { searchParams: { appointmentId: String(appointmentId), _end: "50" } })
        .json<ResultReturn[]>(),
    enabled: Boolean(canRead?.can),
  });
  const schedule = useMutation({
    mutationFn: () => send("post", "result_returns", { encounterId, scheduledAt: vnLocal(at), note }),
    onSuccess: () => {
      setAt("");
      setNote("");
      setError(null);
      notify?.({ type: "success", message: "Đã hẹn trả kết quả và báo cho bệnh nhân" });
      void queryClient.invalidateQueries({ queryKey: ["result_returns"] });
    },
    onError: (e) => setError(resultsErrorText(refusal(e))),
  });
  if (!canRead?.can) return null;
  const rows = data ?? [];
  // A missed one is rescheduled at the desk, not booked again.
  const open = rows.some((r) => r.status === "SCHEDULED" || r.status === "MISSED");

  return (
    <DetailPanel title="Hẹn trả kết quả">
      <div className="flex flex-col gap-3 px-4 py-3 text-sm">
        {rows.length === 0 && <p className="text-muted-foreground">Chưa hẹn ngày trả kết quả.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2">
            <span className="font-medium tabular-nums">{formatDateTime(r.scheduledAt)}</span>
            <Badge variant={RETURN_STATUS_VARIANTS[r.status]}>{RETURN_STATUS_LABELS[r.status]}</Badge>
            {r.note && <span className="text-muted-foreground">{r.note}</span>}
          </div>
        ))}
        {canWrite?.can && !open && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="return-at">Thời điểm hẹn</Label>
              <Input id="return-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Label htmlFor="return-note">Ghi chú</Label>
              <Input id="return-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button size="sm" disabled={!at || schedule.isPending} onClick={() => schedule.mutate()}>
              Hẹn trả kết quả
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>
    </DetailPanel>
  );
}
