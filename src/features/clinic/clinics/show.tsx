import { useCustom, useShow } from "@refinedev/core";

import { API_URL } from "@/shared/api/constants";
import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import { customResult } from "@/shared/hooks/use-custom-result";
import type { Clinic, ClinicSummary } from "@/domains/clinic/types";
import { CLINIC_STATUS_LABELS } from "@/domains/clinic/types";
import { CLINIC_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { ClinicRoomsPanel } from "../exam-rooms/rooms-panel";

/**
 * One clinic (SRS 3.18.3): how to reach it, whether it is operating, and how
 * many staff, devices and patients it has. When patients are seen there is
 * each doctor's own schedule.
 */
export const ClinicShow = () => {
  const { result: record, query } = useShow<Clinic>({});
  const { result: summaryResult } = useCustom<ClinicSummary>({
    url: `${API_URL}/clinics/${record?.id}/summary`,
    method: "get",
    queryOptions: { enabled: Boolean(record?.id) },
  });
  const summary = customResult(summaryResult?.data, "staff");
  const status = record?.operatingStatus ?? "OPERATING";

  return (
    <ShowView>
      <ShowViewHeader />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start justify-between gap-4 px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg leading-6 font-semibold tracking-tight">{record?.name ?? "—"}</h2>
                {record && (
                  <Badge variant={CLINIC_STATUS_VARIANTS[status] ?? "secondary"}>{CLINIC_STATUS_LABELS[status]}</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{record?.address ?? ""}</p>
            </div>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Nhân viên", value: summary?.staff },
          { label: "Thiết bị", value: summary?.devices },
          { label: "Bệnh nhân", value: summary?.patients },
        ].map(({ label, value }) => (
          <Card key={label} className="flex flex-col gap-1 p-5">
            <span className="text-muted-foreground text-sm">{label}</span>
            <span className="text-2xl font-semibold tabular-nums">{value ?? "—"}</span>
          </Card>
        ))}
      </div>

      <DetailPanel title="Thông tin liên hệ">
        <DetailList>
          <DetailRow label="Email liên hệ">{record?.contactEmail ?? <EmptyValue />}</DetailRow>
          <DetailRow label="Điện thoại liên hệ">
            {record?.contactPhone ? <span className="font-mono">{record.contactPhone}</span> : <EmptyValue />}
          </DetailRow>
          <DetailRow label="Người liên hệ">{record?.contactPerson ?? <EmptyValue />}</DetailRow>
          <DetailRow label="Địa chỉ">{record?.address ?? <EmptyValue />}</DetailRow>
        </DetailList>
      </DetailPanel>

      {record?.id && <ClinicRoomsPanel clinicId={record.id} />}
    </ShowView>
  );
};
