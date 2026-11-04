import { useCan, useCustomMutation, useInvalidate, useNotification } from "@refinedev/core";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { DetailList, DetailPanel, DetailRow, EmptyValue } from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";
import type { ActivityStatus, Customer } from "@/domains/customer/types";
import { ACTIVITY_STATUS_LABELS } from "@/domains/customer/types";
import { ACTIVITY_STATUS_VARIANTS } from "@/shared/lib/status-variants";

const STATUSES = Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[];

/**
 * Whether the clinic is still looking after this person (SRS 3.8.5, wireframe
 * 056): the current status with the last change, and the dialog that changes
 * it. Anything but "active" needs a reason. Measurements and records stay.
 */
export function ActivityStatusCard({ customer }: { customer: Customer }) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { data: canChange } = useCan({ resource: "customers", action: "status" });
  const { mutate, mutation } = useCustomMutation<Customer>();
  const [changing, setChanging] = useState(false);
  const [next, setNext] = useState<ActivityStatus>("paused");
  const [reason, setReason] = useState("");

  const current = customer.activityStatus ?? "active";
  const needsReason = next !== "active";

  const confirm = () =>
    mutate(
      {
        url: `${API_URL}/customers/${customer.id}/activity-status`,
        method: "post",
        values: { status: next, reason: reason.trim() },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: () => {
          setChanging(false);
          invalidate({ resource: "customers", invalidates: ["detail", "list"], id: customer.id });
          open?.({ type: "success", message: `Đã chuyển sang: ${ACTIVITY_STATUS_LABELS[next]}` });
        },
      }
    );

  return (
    <DetailPanel
      title="Trạng thái hoạt động"
      action={
        canChange?.can ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNext(STATUSES.find((status) => status !== current) ?? "paused");
              setReason("");
              setChanging(true);
            }}
          >
            Đổi trạng thái
          </Button>
        ) : undefined
      }
    >
      <DetailList>
        <DetailRow label="Trạng thái">
          <Badge variant={ACTIVITY_STATUS_VARIANTS[current] ?? "secondary"}>{ACTIVITY_STATUS_LABELS[current]}</Badge>
        </DetailRow>
        <DetailRow label="Lý do">{customer.activityReason ?? <EmptyValue />}</DetailRow>
        <DetailRow label="Thay đổi gần nhất">
          {customer.activityChangedAt ? (
            `${formatDateTime(customer.activityChangedAt)}${customer.activityChangedBy ? ` · ${customer.activityChangedBy}` : ""}`
          ) : (
            <EmptyValue>Chưa đổi lần nào</EmptyValue>
          )}
        </DetailRow>
      </DetailList>

      <Dialog open={changing} onOpenChange={setChanging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi trạng thái hoạt động</DialogTitle>
            <DialogDescription>
              {customer.fullName} · {customer.customerCode}. Lịch sử đo và hồ sơ chăm sóc vẫn được lưu giữ.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Trạng thái mới</Label>
              <Select value={next} onValueChange={(value) => setNext(value as ActivityStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.filter((status) => status !== current).map((status) => (
                    <SelectItem key={status} value={status}>
                      {ACTIVITY_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activity-reason">Lý do{needsReason ? "" : " (không bắt buộc)"}</Label>
              <Textarea
                id="activity-reason"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChanging(false)} disabled={mutation.isPending}>
              Hủy
            </Button>
            <Button onClick={confirm} disabled={(needsReason && reason.trim() === "") || mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : "Xác nhận trạng thái"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailPanel>
  );
}
