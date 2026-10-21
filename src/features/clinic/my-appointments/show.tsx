import { useShow, type BaseKey } from "@refinedev/core";
import { PrinterIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DetailList, DetailRow, EmptyValue } from "@/shared/components/views/record-detail";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS, formatBookingCode, formatQueueNumber } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { AppointmentActions } from "../appointments/appointment-actions";

/**
 * The appointment slip: what the customer shows at the front desk.
 *
 * The queue number is the point of the page — it is what gets called at the
 * doctor's door — with the code under it, grouped in fours so it can be read
 * aloud, and carried by a QR the desk can scan. The QR holds nothing but
 * the code: looking it up needs a staff account, so the image on its own
 * gives nothing away.
 *
 * `resource` and `id` point it at an administrator's view-as copy, which is
 * read-only: printing stays, cancelling does not.
 */
type MyAppointmentShowProps = {
  resource?: string;
  id?: BaseKey;
  readOnly?: boolean;
};

export const MyAppointmentShow = ({ resource, id, readOnly = false }: MyAppointmentShowProps = {}) => {
  const { result: record, query } = useShow<Appointment>({ resource, id });
  const status = record?.status;

  return (
    <ShowView>
      <ShowViewHeader title="Phiếu khám" resource={resource} />

      <Card className="mx-auto w-full max-w-md py-6">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-col items-center gap-5 px-6 text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-overline text-muted-foreground">Số khám</span>
              <span className="text-6xl leading-none font-semibold tabular-nums">
                {formatQueueNumber(record?.queueNumber)}
              </span>
              <span className="text-muted-foreground font-mono text-lg tracking-widest">
                {formatBookingCode(record?.bookingCode)}
              </span>
              {status && (
                <Badge variant={APPOINTMENT_STATUS_VARIANTS[status] ?? "secondary"}>
                  {APPOINTMENT_STATUS_LABELS[status] ?? status}
                </Badge>
              )}
            </div>

            {record?.bookingCode && (
              <div className="rounded-lg border bg-white p-3">
                {/* White behind the code whatever the theme: a scanner needs
                    dark modules on a light ground. */}
                <QRCodeSVG value={record.bookingCode} size={176} level="M" />
              </div>
            )}

            {status && (
              <p className="text-muted-foreground text-sm">
                {status === "scheduled"
                  ? "Đến phòng khám, đưa phiếu này cho lễ tân để được tiếp nhận, rồi chờ gọi số."
                  : status === "checked_in"
                    ? "Bạn đã được tiếp nhận. Vui lòng chờ gọi số."
                    : status === "in_exam"
                      ? `Mời bạn vào ${record?.examRoom ? `phòng ${record.examRoom.code}` : "phòng khám"}.`
                    : status === "completed"
                      ? "Lượt khám này đã hoàn tất."
                      : status === "no_show"
                        ? "Bạn đã không đến lượt khám này."
                        : "Lượt đăng ký này đã huỷ."}
              </p>
            )}

            <div className="w-full text-left">
              <DetailList>
                <DetailRow label="Người tới khám">{record?.customer.fullName ?? <EmptyValue />}</DetailRow>
                <DetailRow label="Bác sĩ">{record?.doctor?.fullName ?? <EmptyValue />}</DetailRow>
                <DetailRow label="Phòng khám">{record?.clinic.name ?? <EmptyValue />}</DetailRow>
                <DetailRow label="Ngày khám">
                  {record ? formatLocalDate(record.appointmentDate) : <EmptyValue />}
                </DetailRow>
                <DetailRow label="Giờ dự kiến">
                  {record ? (
                    <span className="tabular-nums">
                      {formatLocalTime(record.startTime)}
                      {record.endTime ? ` – ${formatLocalTime(record.endTime)}` : ""}
                    </span>
                  ) : (
                    <EmptyValue />
                  )}
                </DetailRow>
                <DetailRow label="Lý do">{record?.reason ?? <EmptyValue />}</DetailRow>
                {record?.cancelReason && (
                  <DetailRow label="Lý do huỷ">{record.cancelReason}</DetailRow>
                )}
              </DetailList>
            </div>

            <div data-print="hide" className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon />
                In phiếu
              </Button>
              {record && !readOnly && <AppointmentActions appointment={record} resource="my_appointments" />}
            </div>
          </div>
        </LoadingOverlay>
      </Card>
    </ShowView>
  );
};
