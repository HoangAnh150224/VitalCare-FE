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
import { formatDate, formatLocalDate } from "@/shared/lib/format";
import type { MyPatient } from "@/domains/assignment/types";
import { STAFF_TYPE_LABELS } from "@/domains/employee/types";

/**
 * One patient the caller follows: who they are, who else is on their team and
 * what they wear. Read-only; the vital-signs charts join this screen with the
 * data they need.
 */
export const MyPatientShow = () => {
  const { result: record, query } = useShow<MyPatient>({});

  return (
    <ShowView>
      <ShowViewHeader />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-lg leading-6 font-semibold tracking-tight">{record?.fullName ?? "—"}</h2>
              <p className="text-muted-foreground font-mono text-sm">
                {record?.phone ?? "—"} · {record?.customerCode ?? ""}
              </p>
            </div>
            <MetaStrip className="shrink-0">
              <MetaItem label="Theo dõi từ">{formatDate(record?.followingSince)}</MetaItem>
              <MetaItem label="Thiết bị">
                {record?.device ? <span className="font-mono">{record.device.deviceCode}</span> : "Chưa đeo"}
              </MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <DetailPanel title="Thông tin bệnh nhân">
          <DetailList>
            <DetailRow label="Ngày sinh">
              {record?.dateOfBirth ? formatLocalDate(record.dateOfBirth) : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Liên hệ khẩn cấp">
              {record?.emergencyContactName ? (
                <span>
                  {record.emergencyContactName}
                  {record.emergencyContactPhone && (
                    <span className="text-muted-foreground ml-2 font-mono text-xs">{record.emergencyContactPhone}</span>
                  )}
                </span>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Nhóm chăm sóc" bodyClassName="p-4">
          <ul className="flex flex-col gap-2">
            {(record?.careTeam ?? []).map((member) => (
              <li key={member.id} className="flex items-center justify-between text-sm">
                <span>{member.fullName}</span>
                <Badge variant="outline">{STAFF_TYPE_LABELS[member.staffType]}</Badge>
              </li>
            ))}
          </ul>
        </DetailPanel>
      </div>
    </ShowView>
  );
};
