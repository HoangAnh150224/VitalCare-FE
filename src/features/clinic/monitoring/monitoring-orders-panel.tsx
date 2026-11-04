import { useCan, useNotification } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Textarea } from "@/shared/ui/textarea";
import { formatDateTime } from "@/shared/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  type MonitoringOrder,
} from "@/domains/sharing/types";

/**
 * BF-04 on a patient: the monitoring orders and the patient's answers. From a
 * visit (`encounterId`), a doctor orders monitoring and records whether the
 * patient accepted; the desk hands out a device only under an accepted one.
 */
export function MonitoringOrdersPanel({
  customerId,
  encounterId,
}: {
  customerId: number;
  encounterId?: number;
}) {
  const { data: canRead } = useCan({
    resource: "monitoring_orders",
    action: "list",
  });
  const { data: canWrite } = useCan({
    resource: "monitoring_orders",
    action: "create",
  });
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"ACCEPTED" | "DECLINED">("ACCEPTED");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const key = ["monitoring_orders", customerId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: () =>
      kyInstance
        .get("monitoring_orders", {
          searchParams: { customerId: String(customerId) },
        })
        .json<MonitoringOrder[]>(),
    enabled: Boolean(canRead?.can),
  });
  const done = () => void queryClient.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: () =>
      kyInstance
        .post("monitoring_orders", {
          json: {
            customerId,
            encounterId,
            reason: reason.trim(),
            decision,
            consentNote: note.trim() || null,
          },
        })
        .json(),
    onSuccess: () => {
      setReason("");
      setNote("");
      notify?.({
        type: "success",
        message:
          decision === "ACCEPTED"
            ? "Đã ghi nhận bệnh nhân đồng ý theo dõi"
            : "Đã ghi nhận bệnh nhân từ chối theo dõi",
      });
      done();
    },
    onError: () =>
      setError(
        "Không lưu được: bệnh nhân có thể đang có chỉ định theo dõi khác."
      ),
  });
  const end = useMutation({
    mutationFn: (id: number) =>
      kyInstance.post(`monitoring_orders/${id}/end`, { json: {} }).json(),
    onSuccess: done,
  });
  if (!canRead?.can) return null;
  const orders = data ?? [];
  const active = orders.some((o) => o.status === "ACTIVE");

  return (
    <DetailPanel title="Chỉ định theo dõi IoMT" bodyClassName="p-4">
      <div className="flex flex-col gap-4" data-testid="monitoring-orders">
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Chưa có chỉ định theo dõi. Thiết bị chỉ được gán khi bệnh nhân đã
            đồng ý.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{o.reason}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(o.decidedAt)}
                    {o.orderedByName ? ` · ${o.orderedByName}` : ""}
                    {o.consentNote ? ` · ${o.consentNote}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={ORDER_STATUS_VARIANTS[o.status]}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                  {o.status === "ACTIVE" && canWrite?.can && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => end.mutate(o.id)}
                      disabled={end.isPending}
                    >
                      Kết thúc
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canWrite?.can && encounterId != null && !active && (
          <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
            <Label htmlFor="monitoring-reason">
              Chỉ định theo dõi tại nhà bằng vòng đeo
            </Label>
            <Textarea
              id="monitoring-reason"
              rows={2}
              value={reason}
              placeholder="Lý do: VD theo dõi SpO₂ sau viêm phổi"
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
            />
            <RadioGroup
              value={decision}
              onValueChange={(v) => setDecision(v as "ACCEPTED" | "DECLINED")}
              className="flex gap-4"
            >
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="ACCEPTED" />
                Bệnh nhân đồng ý
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="DECLINED" />
                Bệnh nhân từ chối
              </Label>
            </RadioGroup>
            <Textarea
              aria-label="Ghi chú đồng ý"
              rows={2}
              value={note}
              placeholder="Ghi chú (đã giải thích mục đích, cách đeo, phạm vi theo dõi...)"
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              size="sm"
              className="self-start"
              disabled={create.isPending}
              onClick={() =>
                reason.trim()
                  ? create.mutate()
                  : setError("Nhập lý do chỉ định")
              }
            >
              Lưu chỉ định
            </Button>
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
