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
import { APPOINTMENT_STATUS_LABELS, formatBookingCode } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { AppointmentActions } from "../appointments/appointment-actions";

/**
 * The appointment slip: what the customer shows at the front desk.
 *
 * The code is the point of the page — large, grouped in fours so it can be
 * read aloud, and carried by a QR the desk can scan. The QR holds nothing but
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
              <span className="text-overline text-muted-foreground">Mã lịch hẹn</span>
              <span className="font-mono text-3xl font-semibold tracking-widest">
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
                  ? "Đưa mã này cho lễ tân khi đến phòng khám để check-in."
                  : status === "checked_in"
                    ? "Bạn đã check-in cho lịch hẹn này."
                    : "Lịch hẹn này đã huỷ."}
              </p>
            )}

            <div className="w-full text-left">
              <DetailList>
                <DetailRow label="Phòng khám">{record?.clinic.name ?? <EmptyValue />}</DetailRow>
                <DetailRow label="Ngày khám">
                  {record ? formatLocalDate(record.appointmentDate) : <EmptyValue />}
                </DetailRow>
                <DetailRow label="Khung giờ">
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
