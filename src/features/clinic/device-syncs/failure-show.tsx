import { useShow } from "@refinedev/core";
import { Link } from "react-router";

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
  type SyncFailure,
} from "@/domains/device/sync";
import { FailureActions } from "./failure-actions";

/** Synchronization Failure Details (FE-06): the reading as it came, why it was refused, its retries. */
export const SyncFailureShow = () => {
  const { result: failure } = useShow<SyncFailure>({
    resource: "sync_failures",
  });

  return (
    <ShowView>
      <ShowViewHeader
        resource="sync_failures"
        title="Chi tiết bản ghi lỗi"
        canEdit={false}
        actions={failure ? <FailureActions failure={failure} /> : null}
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <DetailPanel title="Lỗi">
          <DetailList>
            <DetailRow label="Trạng thái">
              {failure ? (
                <Badge variant={SYNC_FAILURE_STATUS_VARIANTS[failure.status]}>
                  {SYNC_FAILURE_STATUS_LABELS[failure.status]}
                </Badge>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Lý do">
              {failure?.reason ?? <EmptyValue />}
            </DetailRow>
            <DetailRow label="Thiết bị">
              {failure?.deviceId ? (
                <Link
                  to={`/devices/show/${failure.deviceId}`}
                  className="font-mono hover:underline"
                >
                  {failure.deviceCode}
                </Link>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Lần đồng bộ">
              {failure ? (
                <Link
                  to={`/device-syncs/show/${failure.batchId}`}
                  className="hover:underline"
                >
                  #{failure.batchId} · {formatDateTime(failure.receivedAt)}
                </Link>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Số lần thử">{failure?.attempts ?? "—"}</DetailRow>
            <DetailRow label="Lần thử gần nhất">
              {formatDateTime(failure?.lastAttemptAt)}
            </DetailRow>
            <DetailRow label="Xử lý xong lúc">
              {failure?.resolvedAt ? (
                formatDateTime(failure.resolvedAt)
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
          </DetailList>
        </DetailPanel>
        <DetailPanel title="Dữ liệu gốc" bodyClassName="p-4">
          {failure?.payload ? (
            <pre className="bg-muted/50 overflow-x-auto rounded-md p-3 text-xs">
              {JSON.stringify(failure.payload, null, 2)}
            </pre>
          ) : (
            <EmptyValue />
          )}
        </DetailPanel>
      </div>
    </ShowView>
  );
};
