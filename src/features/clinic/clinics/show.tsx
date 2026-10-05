import { useShow } from "@refinedev/core";

import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { Card } from "@/shared/ui/card";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import type { Clinic } from "@/domains/clinic/types";
import { WorkingHoursEditor } from "./working-hours-editor";

/** One clinic: where it is, and the opening hours its booking slots are cut from. */
export const ClinicShow = () => {
  const { result: record, query } = useShow<Clinic>({});

  return (
    <ShowView>
      <ShowViewHeader />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="px-6">
            <h2 className="text-lg leading-6 font-semibold tracking-tight">{record?.name ?? "—"}</h2>
            <p className="text-muted-foreground text-sm">{record?.address ?? ""}</p>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
        <DetailPanel title="Thông tin">
          <DetailList>
            <DetailRow label="Địa chỉ">{record?.address ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Điện thoại">
              <span className="font-mono">{record?.contactPhone ?? "—"}</span>
            </DetailRow>
            <DetailRow label="Trạng thái">{record?.operatingStatus ?? <EmptyValue />}</DetailRow>
          </DetailList>
        </DetailPanel>

        {record?.id && <WorkingHoursEditor clinicId={record.id} />}
      </div>
    </ShowView>
  );
};
