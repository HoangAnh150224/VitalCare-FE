import { useShow } from "@refinedev/core";

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

/** One member of staff and their professional record. */
export const StaffShow = () => {
  const { result: record, query } = useShow<Employee>({});
  const status = record?.status;

  return (
    <ShowView>
      <ShowViewHeader />

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
              <p className="text-muted-foreground font-mono text-sm">{record?.phone ?? "—"}</p>
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

      <DetailPanel title="Hồ sơ chuyên môn">
        <DetailList>
          <DetailRow label="Chuyên khoa">{record?.specialty ?? <EmptyValue />}</DetailRow>
          <DetailRow label="Chức danh">{record?.professionalTitle ?? <EmptyValue />}</DetailRow>
          <DetailRow label="Số CCHN">
            {record?.licenseNo ? <span className="font-mono">{record.licenseNo}</span> : <EmptyValue />}
          </DetailRow>
          <DetailRow label="Vị trí công tác">{record?.clinicPosition ?? <EmptyValue />}</DetailRow>
        </DetailList>
      </DetailPanel>
    </ShowView>
  );
};
