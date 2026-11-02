import { useShow } from "@refinedev/core";

import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import { humanizeResource } from "@/domains/permission/types";
import { AUDIT_ACTION_LABELS, type AuditEntry } from "./types";

/** Audit Log Details (FE-20): one event with the state before and after it. */
export const AuditLogShow = () => {
  const { result: entry } = useShow<AuditEntry>({ resource: "audit_logs" });

  return (
    <ShowView>
      <ShowViewHeader
        resource="audit_logs"
        title="Chi tiết nhật ký"
        canEdit={false}
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <DetailPanel title="Sự kiện">
          <DetailList>
            <DetailRow label="Thời điểm">
              {formatDateTime(entry?.occurredAt)}
            </DetailRow>
            <DetailRow label="Người thực hiện">
              {entry?.actorName ??
                (entry?.actorId ? (
                  `#${entry.actorId}`
                ) : (
                  <EmptyValue>Hệ thống</EmptyValue>
                ))}
            </DetailRow>
            <DetailRow label="Hành động">
              {entry ? (
                <Badge variant="secondary">
                  {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                </Badge>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Dữ liệu">
              {entry ? (
                `${humanizeResource(entry.entityType)}${
                  entry.entityId != null ? ` #${entry.entityId}` : ""
                }`
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Địa chỉ IP">
              <span className="font-mono">{entry?.ipAddress ?? "—"}</span>
            </DetailRow>
            <DetailRow label="Trình duyệt">
              <span className="text-xs break-all">
                {entry?.userAgent ?? "—"}
              </span>
            </DetailRow>
          </DetailList>
        </DetailPanel>
        <DetailPanel title="Thay đổi">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <State title="Trước" value={entry?.before} />
            <State title="Sau" value={entry?.after} />
          </div>
        </DetailPanel>
      </div>
    </ShowView>
  );
};

function State({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null | undefined;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{title}</span>
      {value ? (
        <pre className="bg-muted/50 overflow-x-auto rounded-md p-2 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      )}
    </div>
  );
}
