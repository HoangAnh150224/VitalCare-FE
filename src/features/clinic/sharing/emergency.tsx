import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import {
  CALL_LABELS,
  NOTICE_STATUS_LABELS,
  type EmergencyNotice,
} from "@/domains/sharing/types";

/** Emergency Alert Details for the caregiver: what happened, their acknowledgement, the calls made. */
export const EmergencyShow = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { data: n, isError } = useQuery({
    queryKey: ["emergency_alerts", id],
    queryFn: () =>
      kyInstance.get(`emergency_alerts/${id}`).json<EmergencyNotice>(),
    refetchInterval: 5_000,
  });
  const ack = useMutation({
    mutationFn: () =>
      kyInstance
        .post(`emergency_alerts/${id}/acknowledge`)
        .json<EmergencyNotice>(),
    onSuccess: (fresh) =>
      queryClient.setQueryData(["emergency_alerts", id], fresh),
  });
  if (isError)
    return (
      <p className="text-muted-foreground text-sm">
        Không tìm thấy cảnh báo này.
      </p>
    );
  return (
    <div className="screen-enter flex flex-col gap-5">
      <Card
        className="border-destructive/50 gap-2 px-5 py-4"
        data-testid="emergency-detail"
      >
        <div className="flex items-center gap-2">
          <Badge variant="destructive">Khẩn cấp</Badge>
          {n && (
            <Badge variant={n.status === "PENDING" ? "warning" : "secondary"}>
              {NOTICE_STATUS_LABELS[n.status]}
            </Badge>
          )}
        </div>
        <h1 className="text-xl font-semibold">{n?.patientName}</h1>
        <p>{n?.message}</p>
        <p className="text-muted-foreground text-xs">
          Báo lúc {formatDateTime(n?.notifiedAt)}
          {n?.acknowledgedAt
            ? ` · bạn xác nhận lúc ${formatDateTime(n.acknowledgedAt)}`
            : ""}
        </p>
        {n && !n.acknowledgedAt && (
          <Button
            variant="destructive"
            className="self-start"
            onClick={() => ack.mutate()}
            disabled={ack.isPending}
          >
            Tôi đã biết
          </Button>
        )}
      </Card>
      <Card className="gap-2 px-5 py-4" data-testid="emergency-calls">
        <span className="text-sm font-medium">Nhật ký gọi khẩn</span>
        {(n?.calls ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa gọi ai.</p>
        ) : (
          (n?.calls ?? []).map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{CALL_LABELS[c.channel]}</span> tới{" "}
              {c.phone} · {formatDateTime(c.placedAt)} · {c.outcome}
              {c.detail && (
                <div className="text-muted-foreground text-xs">{c.detail}</div>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
};
