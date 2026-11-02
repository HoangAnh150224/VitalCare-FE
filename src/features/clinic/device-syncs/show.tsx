import { useCustom, useShow } from "@refinedev/core";
import { Link } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import {
  SYNC_FAILURE_STATUS_LABELS,
  SYNC_FAILURE_STATUS_VARIANTS,
  SYNC_SOURCE_LABELS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_VARIANTS,
  type SyncBatch,
  type SyncFailure,
} from "@/domains/device/sync";

/** One upload: its counts, and each reading it refused. */
export const DeviceSyncShow = () => {
  const { result: batch } = useShow<SyncBatch>({ resource: "device_syncs" });
  const { result: refused } = useCustom<SyncFailure[]>({
    url: `${API_URL}/device_syncs/${batch?.id}/failures`,
    method: "get",
    queryOptions: { enabled: Boolean(batch?.id) },
  });
  const failures = Array.isArray(refused?.data) ? refused.data : [];

  return (
    <ShowView>
      <ShowViewHeader
        resource="device_syncs"
        title={`Lần đồng bộ #${batch?.id ?? ""}`}
        canEdit={false}
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <DetailPanel title="Lần gửi">
          <DetailList>
            <DetailRow label="Kết quả">
              {batch ? (
                <Badge variant={SYNC_STATUS_VARIANTS[batch.status]}>
                  {SYNC_STATUS_LABELS[batch.status]}
                </Badge>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Nhận lúc">
              {formatDateTime(batch?.receivedAt)}
            </DetailRow>
            <DetailRow label="Thiết bị">
              {batch?.deviceId ? (
                <Link
                  to={`/devices/show/${batch.deviceId}`}
                  className="font-mono hover:underline"
                >
                  {batch.deviceCode}
                </Link>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Bệnh nhân">
              {batch?.customerId ? (
                <Link
                  to={`/customers/show/${batch.customerId}`}
                  className="hover:underline"
                >
                  {batch.customerName}
                </Link>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Nguồn">
              {batch ? SYNC_SOURCE_LABELS[batch.source] : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Mã lần gửi">
              {batch?.clientBatchId ? (
                <span className="font-mono text-xs">{batch.clientBatchId}</span>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            {batch?.error && <DetailRow label="Lỗi">{batch.error}</DetailRow>}
          </DetailList>
        </DetailPanel>
        <DetailPanel title="Bản ghi">
          <DetailList>
            <DetailRow label="Tổng">{batch?.recordCount ?? "—"}</DetailRow>
            <DetailRow label="Đã lưu">{batch?.acceptedCount ?? "—"}</DetailRow>
            <DetailRow label="Trùng (đã có)">
              {batch?.duplicateCount ?? "—"}
            </DetailRow>
            <DetailRow label="Bị từ chối">
              {batch?.rejectedCount ?? "—"}
            </DetailRow>
            <DetailRow label="Còn chờ trên thiết bị">
              {batch?.pendingOnDevice ?? <EmptyValue />}
            </DetailRow>
          </DetailList>
        </DetailPanel>
      </div>
      <DetailPanel title="Bản ghi bị từ chối" bodyClassName="p-4">
        {failures.length ? (
          <ul className="flex flex-col gap-2">
            {failures.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <Link
                  to={`/sync-failures/show/${f.id}`}
                  className="flex min-w-0 flex-col hover:underline"
                >
                  <span className="font-medium">{f.reason}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {f.clientRecordId ?? "(không có mã)"}
                  </span>
                </Link>
                <Badge variant={SYNC_FAILURE_STATUS_VARIANTS[f.status]}>
                  {SYNC_FAILURE_STATUS_LABELS[f.status]}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Không có bản ghi nào bị từ chối.
          </p>
        )}
      </DetailPanel>
    </ShowView>
  );
};
