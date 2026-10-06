import { useCan, useList, useShow } from "@refinedev/core";
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
import type { Customer } from "@/domains/customer/types";
import {
  ACTIVATION_SOURCE_LABELS,
  CUSTOMER_STATUS_LABELS,
  GENDER_LABELS,
} from "@/domains/customer/types";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS } from "@/domains/appointment/types";
import {
  APPOINTMENT_STATUS_VARIANTS,
  CUSTOMER_STATUS_VARIANTS,
} from "@/shared/lib/status-variants";
import { ActivatePatientCard } from "./activate-patient-card";
import { CareTeamPanel } from "./care-team-panel";
import { DevicePanel } from "./device-panel";

/**
 * One customer: who they are, whether they are a patient yet and how they
 * became one, and their appointments.
 *
 * The activation panel sits beside the profile rather than under it, because
 * "is this person a patient" is usually the question the screen was opened
 * for.
 */
export const CustomerShow = () => {
  const { result: record, query } = useShow<Customer>({});
  const { isLoading } = query;

  const { data: canReadAppointments } = useCan({ resource: "appointments", action: "list" });
  const { data: canReadUsers } = useCan({ resource: "users", action: "show" });

  const { result: appointments } = useList<Appointment>({
    resource: "appointments",
    filters: [{ field: "customer.id", operator: "eq", value: record?.id }],
    pagination: { pageSize: 20 },
    queryOptions: { enabled: Boolean(record?.id) && (canReadAppointments?.can ?? false) },
  });

  const status = record?.status;

  return (
    <ShowView>
      <ShowViewHeader />

      <Card className="py-4">
        <LoadingOverlay loading={isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg leading-6 font-semibold tracking-tight">
                  {record?.fullName ?? "—"}
                </h2>
                {status && (
                  <Badge variant={CUSTOMER_STATUS_VARIANTS[status] ?? "secondary"}>
                    {CUSTOMER_STATUS_LABELS[status] ?? status}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                <span className="font-mono">{record?.phone ?? "—"}</span>
                {record?.email ? ` · ${record.email}` : ""}
              </p>
            </div>

            <MetaStrip className="shrink-0">
              <MetaItem label="Mã khách hàng">
                <span className="font-mono">{record?.customerCode ?? "—"}</span>
              </MetaItem>
              <MetaItem label="Đăng ký">{formatDateTime(record?.createdAt)}</MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <DetailPanel title="Hồ sơ">
          <DetailList>
            <DetailRow label="Ngày sinh">
              {record?.dateOfBirth ? formatLocalDate(record.dateOfBirth) : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Giới tính">
              {record?.gender ? GENDER_LABELS[record.gender] : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Địa chỉ">{record?.address ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Liên hệ khẩn cấp">
              {record?.emergencyContactName ? (
                <span>
                  {record.emergencyContactName}
                  {record.emergencyContactPhone && (
                    <span className="text-muted-foreground ml-2 font-mono text-xs">
                      {record.emergencyContactPhone}
                    </span>
                  )}
                </span>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Tài khoản">
              {record && canReadUsers?.can ? (
                <Link to={`/users/show/${record.userId}`} className="hover:underline">
                  Xem tài khoản đăng nhập
                </Link>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Bệnh nhân">
          <DetailList>
            <DetailRow label="Trạng thái">
              {status ? (
                <Badge variant={CUSTOMER_STATUS_VARIANTS[status] ?? "secondary"}>
                  {CUSTOMER_STATUS_LABELS[status] ?? status}
                </Badge>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Kích hoạt lúc">
              {record?.patientActivatedAt ? (
                formatDateTime(record.patientActivatedAt)
              ) : (
                <EmptyValue>Chưa kích hoạt</EmptyValue>
              )}
            </DetailRow>
            <DetailRow label="Kích hoạt qua">
              {record?.patientActivationSource ? (
                ACTIVATION_SOURCE_LABELS[record.patientActivationSource]
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
          </DetailList>
        </DetailPanel>

        {record && <ActivatePatientCard customer={record} />}
      </div>

      {/* Who follows the patient and what they wear — the two things the
          monitoring that follows activation depends on. */}
      {record && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <CareTeamPanel customer={record} />
          <DevicePanel customer={record} />
        </div>
      )}

      {canReadAppointments?.can && (
        <DetailPanel
          title="Lịch hẹn"
          action={
            <span className="text-muted-foreground text-xs tabular-nums">
              {appointments?.total ?? 0} lịch hẹn
            </span>
          }
          bodyClassName="p-4"
        >
          {appointments?.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {appointments.data.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/appointments/show/${appointment.id}`}
                  className="border-border hover:bg-accent/40 flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">
                      {formatLocalDate(appointment.appointmentDate)} ·{" "}
                      {formatLocalTime(appointment.startTime)}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {appointment.reason ?? appointment.clinic.name}
                    </span>
                  </span>
                  <Badge variant={APPOINTMENT_STATUS_VARIANTS[appointment.status] ?? "secondary"}>
                    {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Chưa có lịch hẹn nào.</p>
          )}
        </DetailPanel>
      )}
    </ShowView>
  );
};
