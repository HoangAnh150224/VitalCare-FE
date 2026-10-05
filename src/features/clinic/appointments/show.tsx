import { useShow } from "@refinedev/core";
import { Link } from "react-router";

import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
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
import { APPOINTMENT_STATUS_LABELS, formatBookingCode } from "@/domains/appointment/types";
import { CUSTOMER_STATUS_LABELS } from "@/domains/customer/types";
import {
  APPOINTMENT_STATUS_VARIANTS,
  CUSTOMER_STATUS_VARIANTS,
} from "@/shared/lib/status-variants";
import { AppointmentActions } from "./appointment-actions";
import { clinicToday } from "./clinic-day";

/** One appointment, with the check-in that may also activate the customer. */
export const AppointmentShow = () => {
  const { result: record, query } = useShow<Appointment>({});
  const { isLoading } = query;

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
                  {record ? formatLocalDate(record.appointmentDate) : "—"} ·{" "}
                  {formatLocalTime(record?.startTime)}
                  {record?.endTime ? ` – ${formatLocalTime(record.endTime)}` : ""}
                </h2>
                {status && (
                  <Badge variant={APPOINTMENT_STATUS_VARIANTS[status] ?? "secondary"}>
                    {APPOINTMENT_STATUS_LABELS[status] ?? status}
                  </Badge>
                )}
              </div>
              {willActivate && (
                <p className="text-muted-foreground text-sm">
                  Khách hàng chưa là bệnh nhân. Check-in lịch này sẽ kích hoạt hồ
                  sơ bệnh nhân
                  {record.appointmentDate === clinicToday()
                    ? "."
                    : " — chỉ check-in được vào đúng ngày hẹn."}
                </p>
              )}
              {record && <AppointmentActions appointment={record} resource="appointments" />}
            </div>

            <MetaStrip className="shrink-0">
              <MetaItem label="Mã lịch hẹn">
                <span className="font-mono">{formatBookingCode(record?.bookingCode)}</span>
              </MetaItem>
              <MetaItem label="Đặt lúc">{formatDateTime(record?.createdAt)}</MetaItem>
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

        <DetailPanel title="Lịch hẹn">
          <DetailList>
            <DetailRow label="Phòng khám">{record?.clinic.name ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Lý do">{record?.reason ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Ghi chú nội bộ">{record?.note ?? <EmptyValue />}</DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Diễn biến">
          <DetailList>
            <DetailRow label="Đặt lịch">{formatDateTime(record?.createdAt)}</DetailRow>
            <DetailRow label="Check-in">
              {record?.checkedInAt ? formatDateTime(record.checkedInAt) : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Huỷ">
              {record?.cancelledAt ? formatDateTime(record.cancelledAt) : <EmptyValue />}
            </DetailRow>
          </DetailList>
        </DetailPanel>
      </div>
    </ShowView>
  );
};
