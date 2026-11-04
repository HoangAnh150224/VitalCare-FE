import { useCan, useShow } from "@refinedev/core";
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
import { formatDateTime } from "@/shared/lib/format";
import type { MonitoringAssignment } from "@/domains/assignment/types";
import { ASSIGNMENT_STATUS_LABELS } from "@/domains/assignment/types";
import { STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { ASSIGNMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";

/**
 * One assignment: who follows whom, since when, and how it ended. Ending it
 * is done on the patient's page, where the rest of their care team is.
 */
export const AssignmentShow = () => {
  const { result: record, query } = useShow<MonitoringAssignment>({ resource: "monitoring_assignments" });
  // The patient's page is the front desk's and the clinic administrator's.
  const { data: canOpenPatient } = useCan({ resource: "customers", action: "show" });

  return (
    <ShowView>
      <ShowViewHeader resource="monitoring_assignments" />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg leading-6 font-semibold tracking-tight">
                  {record ? `${record.staff.fullName} theo dõi ${record.patient.fullName}` : "—"}
                </h2>
                {record && (
                  <Badge variant={ASSIGNMENT_STATUS_VARIANTS[record.status] ?? "secondary"}>
                    {ASSIGNMENT_STATUS_LABELS[record.status]}
                  </Badge>
                )}
              </div>
            </div>
            <MetaStrip className="shrink-0">
              <MetaItem label="Phân công lúc">{formatDateTime(record?.assignedAt)}</MetaItem>
              <MetaItem label="Kết thúc lúc">{record?.endedAt ? formatDateTime(record.endedAt) : "—"}</MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
        <DetailPanel title="Bệnh nhân">
          <DetailList>
            <DetailRow label="Họ tên">
              {record && canOpenPatient?.can ? (
                <Link to={`/customers/show/${record.patient.id}`} className="hover:underline">
                  {record.patient.fullName}
                </Link>
              ) : (
                (record?.patient.fullName ?? <EmptyValue />)
              )}
            </DetailRow>
            <DetailRow label="Mã bệnh nhân">
              <span className="font-mono">{record?.patient.customerCode ?? ""}</span>
            </DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Người theo dõi">
          <DetailList>
            <DetailRow label="Họ tên">{record?.staff.fullName ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Vai trò">{record ? STAFF_TYPE_LABELS[record.staff.staffType] : <EmptyValue />}</DetailRow>
            <DetailRow label="Chuyên khoa">{record?.staff.specialty ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Mã nhân viên">
              <span className="font-mono">{record?.staff.employeeCode ?? ""}</span>
            </DetailRow>
          </DetailList>
        </DetailPanel>
      </div>

      <DetailPanel title="Diễn biến">
        <DetailList>
          <DetailRow label="Người phân công">{record?.assignedBy ?? <EmptyValue />}</DetailRow>
          <DetailRow label="Người kết thúc">
            {record?.endedBy ?? <EmptyValue>{record?.status === "active" ? "Chưa kết thúc" : undefined}</EmptyValue>}
          </DetailRow>
          <DetailRow label="Ghi chú">
            {record?.note ? <span className="whitespace-pre-wrap">{record.note}</span> : <EmptyValue />}
          </DetailRow>
        </DetailList>
      </DetailPanel>
    </ShowView>
  );
};
