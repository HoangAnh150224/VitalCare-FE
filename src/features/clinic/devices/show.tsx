import { useCustom, useShow } from "@refinedev/core";
import { Link } from "react-router";

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
  MetaItem,
  MetaStrip,
} from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";
import type { Device } from "@/domains/device/types";
import { DEVICE_STATUS_LABELS } from "@/domains/device/types";
import type { DeviceAssignment } from "@/domains/assignment/types";
import { DEVICE_STATUS_VARIANTS } from "@/shared/lib/status-variants";

/** One device: what it is, who wears it now, and everybody who has. */
export const DeviceShow = () => {
  const { result: record, query } = useShow<Device>({});
  const { result: history } = useCustom<DeviceAssignment[]>({
    url: `${API_URL}/devices/${record?.id}/assignments`,
    method: "get",
    queryOptions: { enabled: Boolean(record?.id) },
  });
  const rows = Array.isArray(history?.data) ? history.data : [];

  return (
    <ShowView>
      <ShowViewHeader />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-lg font-semibold">{record?.deviceCode ?? "—"}</h2>
                {record && (
                  <Badge variant={DEVICE_STATUS_VARIANTS[record.status] ?? "secondary"}>
                    {DEVICE_STATUS_LABELS[record.status]}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{record?.model ?? ""}</p>
            </div>
            <MetaStrip className="shrink-0">
              <MetaItem label="Đăng ký">{formatDateTime(record?.registeredAt)}</MetaItem>
              <MetaItem label="Kết nối gần nhất">{formatDateTime(record?.lastSeenAt)}</MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <DetailPanel title="Thông tin">
          <DetailList>
            <DetailRow label="Số serial">
              {record?.serialNumber ? <span className="font-mono">{record.serialNumber}</span> : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Hãng">{record?.manufacturer ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Loại">{record?.deviceType ?? <EmptyValue />}</DetailRow>
            <DetailRow label="Người đang đeo">
              {record?.currentPatient ? (
                <Link to={`/customers/show/${record.currentPatient.customerId}`} className="hover:underline">
                  {record.currentPatient.fullName}
                </Link>
              ) : (
                <EmptyValue>Không ai</EmptyValue>
              )}
            </DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Lịch sử sử dụng" bodyClassName="p-4">
          {rows.length ? (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                  <div className="flex flex-col">
                    {row.patient ? (
                      <Link to={`/customers/show/${row.patient.id}`} className="font-medium hover:underline">
                        {row.patient.fullName}
                      </Link>
                    ) : null}
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(row.assignedAt)} → {row.returnedAt ? formatDateTime(row.returnedAt) : "nay"}
                    </span>
                  </div>
                  <Badge variant={row.status === "active" ? "info" : "neutral"}>
                    {row.status === "active" ? "Đang dùng" : "Đã trả"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Thiết bị chưa được gán cho ai.</p>
          )}
        </DetailPanel>
      </div>
    </ShowView>
  );
};
