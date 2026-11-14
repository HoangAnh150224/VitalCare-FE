import { useShow } from "@refinedev/core";
import { Link, useParams } from "react-router";
import { Button } from "@/shared/ui/button";
import { getAuthorities } from "@/shared/api/session";

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
import { formatDateTime } from "@/shared/lib/format";
import type { Employee } from "@/domains/employee/types";
import { EMPLOYEE_STATUS_LABELS, STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { EMPLOYEE_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { ClinicRolesPanel, MembershipPanel } from "./membership";

/** One member of staff and their professional record. */
export const StaffShow = () => {
  const { id } = useParams();
  const validId = /^[1-9]\d*$/.test(id ?? "") && Number.isSafeInteger(Number(id));
  const clinicAdminsOnly = getAuthorities()?.roles.includes("ADMIN") ?? false;
  const { result: record, query } = useShow<Employee>({
    errorNotification: false,
    queryOptions: { enabled: validId, retry: false },
  });
  const status = record?.status;

  if (!validId || query.isError || (query.isSuccess && !record)) {
    const missing = !validId || query.error?.statusCode === 404 || query.error?.statusCode === 400 || (query.isSuccess && !record);
    const subject = clinicAdminsOnly ? "Quản trị" : "Nhân viên";
    return (
      <ShowView>
        <h1 className="text-3xl font-bold">{clinicAdminsOnly ? "Quản trị phòng khám" : "Nhân viên"}</h1>
        <Card className="p-6">
          <p role="alert" className="break-words">{missing
            ? `${subject} với mã ${id ?? ""} không tồn tại.`
            : query.error?.statusCode === 403
              ? "Bạn không có quyền xem hồ sơ này."
              : "Không tải được hồ sơ. Vui lòng thử lại sau."}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/employees">Quay lại danh sách</Link></Button>
            {!missing && <Button onClick={() => void query.refetch()} disabled={query.isFetching}>Thử lại</Button>}
          </div>
        </Card>
      </ShowView>
    );
  }

  return (
    <ShowView>
      {record && status === "inactive" ? (
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Thông tin nhân viên</h1>
          <p role="status">Đã nghỉ {formatDateTime(record.membershipEndedAt)}</p>
          <Button asChild variant="outline"><Link to="/employees">Quay lại danh sách</Link></Button>
        </div>
      ) : <ShowViewHeader />}

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg leading-6 font-semibold tracking-tight">{record?.fullName ?? "—"}</h2>
                {record && <Badge variant="outline">{STAFF_TYPE_LABELS[record.staffType]}</Badge>}
                {status && (
                  <Badge variant={EMPLOYEE_STATUS_VARIANTS[status] ?? "secondary"}>
                    {EMPLOYEE_STATUS_LABELS[status]}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground font-mono text-sm">{record?.phone?.replace(/^\+84(?=\d{9}$)/, "0") || "—"}</p>
            </div>
            <MetaStrip className="shrink-0">
              <MetaItem label="Mã nhân viên">
                <span className="font-mono">{record?.employeeCode ?? "—"}</span>
              </MetaItem>
              <MetaItem label="Ngày tạo">{formatDateTime(record?.createdAt)}</MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      {record && record.staffType !== "clinic_admin" && (
        <DetailPanel title="Hồ sơ chuyên môn">
          <DetailList>
            <DetailRow label="Chuyên khoa">{record.specialty ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Chức danh">{record.professionalTitle ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Số CCHN">
              {record.licenseNo ? <span className="font-mono">{record.licenseNo}</span> : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Vị trí công tác">{record.clinicPosition ?? <EmptyValue />}</DetailRow>
          </DetailList>
        </DetailPanel>
      )}

      {record && <MembershipPanel employee={record} />}
      {record && status === "active" && record.staffType !== "clinic_admin" && <ClinicRolesPanel employeeId={record.id} />}
    </ShowView>
  );
};
