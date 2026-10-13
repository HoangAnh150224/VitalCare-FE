import { useCan, useInvalidate, useList, useNotification, useShow, useUpdate } from "@refinedev/core";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
  MetaItem,
  MetaStrip,
} from "@/shared/components/views/record-detail";
import { formatDateTime, formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS, formatBookingCode, formatQueueNumber } from "@/domains/appointment/types";
import type { Encounter } from "@/domains/encounter/types";
import { CUSTOMER_STATUS_LABELS } from "@/domains/customer/types";
import {
  APPOINTMENT_STATUS_VARIANTS,
  CUSTOMER_STATUS_VARIANTS,
} from "@/shared/lib/status-variants";
import { AppointmentActions } from "./appointment-actions";
import { clinicToday } from "./clinic-day";
import { newEncounterPath } from "@/domains/encounter/types";

/** One registered visit: its queue number, what can be done to it, and the encounter it led to. */
export const AppointmentShow = () => {
  const { result: record, query } = useShow<Appointment>({});
  const { isLoading } = query;
  const { data: canRecordEncounter } = useCan({ resource: "clinical_encounters", action: "create" });
  const { data: canReadEncounters } = useCan({ resource: "clinical_encounters", action: "list" });
  const { data: canEdit } = useCan({ resource: "appointments", action: "edit" });
  const [editing, setEditing] = useState(false);

  // "Lượt khám liên quan": the encounter this visit led to, if somebody recorded one.
  const { result: encounters } = useList<Encounter>({
    resource: "clinical_encounters",
    filters: [{ field: "appointment.id", operator: "eq", value: record?.id }],
    pagination: { pageSize: 5 },
    queryOptions: { enabled: Boolean(record?.id) && (canReadEncounters?.can ?? false) },
  });
  const related = encounters?.data ?? [];
  const open = record?.status === "scheduled" || record?.status === "checked_in";

  const status = record?.status;
  const willActivate =
    record?.status === "scheduled" && record.customer.status === "neutral";

  return (
    <ShowView>
      <ShowViewHeader />

      <Card className="py-4">
        <LoadingOverlay loading={isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg leading-6 font-semibold tracking-tight">
                  Số khám {formatQueueNumber(record?.queueNumber)} ·{" "}
                  {record ? formatLocalDate(record.appointmentDate) : "—"}
                </h2>
                {status && (
                  <Badge variant={APPOINTMENT_STATUS_VARIANTS[status] ?? "secondary"}>
                    {APPOINTMENT_STATUS_LABELS[status] ?? status}
                  </Badge>
                )}
              </div>
              {willActivate && (
                <p className="text-muted-foreground text-sm">
                  Khách hàng chưa là bệnh nhân. Tiếp nhận lượt này sẽ kích hoạt hồ
                  sơ bệnh nhân
                  {record.appointmentDate === clinicToday()
                    ? "."
                    : " — chỉ tiếp nhận được vào đúng ngày khám."}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {record && open && canEdit?.can && (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <PencilIcon />
                    Cập nhật
                  </Button>
                )}
                {record && <AppointmentActions appointment={record} resource="appointments" />}
              </div>
              {/* The visit follows the check-in: open its encounter from here. */}
              {record?.status === "checked_in" && canRecordEncounter?.can && (
                <Button asChild variant="outline">
                  <Link
                    to={newEncounterPath({
                      customerId: record.customer.id,
                      patientName: record.customer.fullName,
                      appointmentId: record.id,
                    })}
                  >
                    Tạo lần khám
                  </Link>
                </Button>
              )}
            </div>

            <MetaStrip className="shrink-0">
              <MetaItem label="Dự kiến">
                <span className="tabular-nums">
                  {formatLocalTime(record?.startTime)}
                  {record?.endTime ? ` – ${formatLocalTime(record.endTime)}` : ""}
                </span>
              </MetaItem>
              <MetaItem label="Mã phiếu">
                <span className="font-mono">{formatBookingCode(record?.bookingCode)}</span>
              </MetaItem>
              <MetaItem label="Đăng ký lúc">{formatDateTime(record?.createdAt)}</MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <DetailPanel title="Khách hàng">
          <DetailList>
            <DetailRow label="Họ và tên">
              {record ? (
                <Link to={`/customers/show/${record.customer.id}`} className="hover:underline">
                  {record.customer.fullName}
                </Link>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Số điện thoại">
              <span className="font-mono">{record?.customer.phone ?? "—"}</span>
            </DetailRow>
            <DetailRow label="Mã khách hàng">
              <span className="font-mono">{record?.customer.customerCode ?? "—"}</span>
            </DetailRow>
            <DetailRow label="Trạng thái">
              {record ? (
                <Badge variant={CUSTOMER_STATUS_VARIANTS[record.customer.status] ?? "secondary"}>
                  {CUSTOMER_STATUS_LABELS[record.customer.status] ?? record.customer.status}
                </Badge>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Đăng ký khám">
          <DetailList>
            <DetailRow label="Bác sĩ">
              {record?.doctor ? (
                <span>
                  {record.doctor.fullName}
                  {record.doctor.specialty && (
                    <span className="text-muted-foreground ml-2 text-xs">{record.doctor.specialty}</span>
                  )}
                </span>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Phòng khám">{record?.clinic.name ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Lý do">{record?.reason ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Ghi chú nội bộ">{record?.note ?? <EmptyValue />}</DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Diễn biến">
          <DetailList>
            <DetailRow label="Đăng ký">{formatDateTime(record?.createdAt)}</DetailRow>
            <DetailRow label="Tiếp nhận">
              {record?.checkedInAt ? formatDateTime(record.checkedInAt) : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Huỷ">
              {record?.cancelledAt ? formatDateTime(record.cancelledAt) : <EmptyValue />}
            </DetailRow>
            {record?.cancelReason && <DetailRow label="Lý do huỷ">{record.cancelReason}</DetailRow>}
            {canReadEncounters?.can && (
              <DetailRow label="Lượt khám liên quan">
                {related.length ? (
                  <span className="flex flex-col">
                    {related.map((encounter) => (
                      <Link
                        key={encounter.id}
                        to={`/clinical-encounters/show/${encounter.id}`}
                        className="hover:underline"
                      >
                        {formatDateTime(encounter.startedAt)}
                      </Link>
                    ))}
                  </span>
                ) : (
                  <EmptyValue>Chưa có</EmptyValue>
                )}
              </DetailRow>
            )}
          </DetailList>
        </DetailPanel>
      </div>

      {record && editing && <EditVisitDialog appointment={record} onClose={() => setEditing(false)} />}
    </ShowView>
  );
};

/**
 * The two things the desk may correct on a visit that is still open: why, and
 * its own note. Whom it is with and when change by rescheduling, which issues
 * a new number.
 */
function EditVisitDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { mutate, mutation } = useUpdate<Appointment>();
  const [reason, setReason] = useState(appointment.reason ?? "");
  const [note, setNote] = useState(appointment.note ?? "");

  const save = () =>
    mutate(
      {
        resource: "appointments",
        id: appointment.id,
        values: { reason: reason.trim(), note: note.trim() || null },
        successNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "appointments", invalidates: ["detail", "list"], id: appointment.id });
          open?.({ type: "success", message: "Đã cập nhật đăng ký khám" });
          onClose();
        },
      }
    );

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cập nhật đăng ký khám</DialogTitle>
          <DialogDescription>
            Sửa lý do khám và ghi chú. Đổi bác sĩ hoặc ngày khám thì dùng "Đổi ngày khám".
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visit-reason">Lý do khám</Label>
            <Input id="visit-reason" maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visit-note">Ghi chú nội bộ</Label>
            <Textarea id="visit-note" maxLength={2000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Đóng
          </Button>
          <Button onClick={save} disabled={reason.trim() === "" || mutation.isPending}>
            {mutation.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
