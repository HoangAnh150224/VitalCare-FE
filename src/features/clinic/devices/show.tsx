import { useCan, useCustom, useShow } from "@refinedev/core";
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
import {
  SYNC_STATUS_LABELS,
  SYNC_STATUS_VARIANTS,
  SYNC_SOURCE_LABELS,
  type SyncBatch,
} from "@/domains/device/sync";
import { BatteryLevel, ConnectivityBadge } from "./device-status";
import { DeviceSimulatorButton, DeviceTokenButton } from "./device-operations";
import { RecentReadings } from "./recent-readings";

/** How often an open device page re-reads the device and its uploads. */
const LIVE_MS = 5_000;

/** One device: what it is, who wears it now, and everybody who has. */
export const DeviceShow = () => {
  const { result: record, query } = useShow<Device>({
    // Kept fresh while open: whether it reports, its battery and last upload change as the band sends.
    queryOptions: { refetchInterval: LIVE_MS },
  });
  const { result: history } = useCustom<DeviceAssignment[]>({
    url: `${API_URL}/devices/${record?.id}/assignments`,
    method: "get",
    queryOptions: { enabled: Boolean(record?.id) },
  });
  const rows = Array.isArray(history?.data) ? history.data : [];
  const { data: operate } = useCan({ resource: "devices", action: "operate" });
  const { data: seeSyncs } = useCan({
    resource: "device_syncs",
    action: "list",
  });
  const { result: syncs } = useCustom<SyncBatch[]>({
    url: `${API_URL}/device_syncs`,
    method: "get",
    config: { query: { deviceId: record?.id, _start: 0, _end: 5 } },
    queryOptions: {
      enabled: Boolean(record?.id) && Boolean(seeSyncs?.can),
      refetchInterval: LIVE_MS,
    },
  });
  const uploads = Array.isArray(syncs?.data) ? syncs.data : [];

  return (
    <ShowView>
      <ShowViewHeader
        actions={
          record && operate?.can ? (
            <>
              <DeviceTokenButton device={record} />
              <DeviceSimulatorButton device={record} />
            </>
          ) : null
        }
      />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-lg font-semibold">
                  {record?.deviceCode ?? "—"}
                </h2>
                {record && (
                  <Badge
                    variant={
                      DEVICE_STATUS_VARIANTS[record.status] ?? "secondary"
                    }
                  >
                    {DEVICE_STATUS_LABELS[record.status]}
                  </Badge>
                )}
                {record && (
                  <ConnectivityBadge connectivity={record.connectivity} />
                )}
                {record && <BatteryLevel level={record.batteryLevel} />}
              </div>
              <p className="text-muted-foreground text-sm">
                {record?.model ?? ""}
              </p>
            </div>
            <MetaStrip className="shrink-0">
              <MetaItem label="Đăng ký">
                {formatDateTime(record?.registeredAt)}
              </MetaItem>
              <MetaItem label="Kết nối gần nhất">
                {formatDateTime(record?.lastSeenAt)}
              </MetaItem>
              <MetaItem label="Đồng bộ gần nhất">
                {formatDateTime(record?.lastSyncAt)}
              </MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <DetailPanel title="Thông tin">
          <DetailList>
            <DetailRow label="Số serial">
              {record?.serialNumber ? (
                <span className="font-mono">{record.serialNumber}</span>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Hãng">
              {record?.manufacturer ?? <EmptyValue />}
            </DetailRow>
            <DetailRow label="Loại">
              {record?.deviceType ?? <EmptyValue />}
            </DetailRow>
            <DetailRow label="Firmware">
              {record?.firmwareVersion ?? <EmptyValue />}
            </DetailRow>
            <DetailRow label="Ghép với điện thoại">
              {record?.pairedAt ? (
                formatDateTime(record.pairedAt)
              ) : (
                <EmptyValue>Chưa ghép</EmptyValue>
              )}
            </DetailRow>
            <DetailRow label="Mã bí mật MQTT">
              {record?.hasToken ? "Đã cấp" : <EmptyValue>Chưa cấp</EmptyValue>}
            </DetailRow>
            <DetailRow label="Người đang đeo">
              {record?.currentPatient ? (
                <Link
                  to={`/customers/show/${record.currentPatient.customerId}`}
                  className="hover:underline"
                >
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
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="flex flex-col">
                    {row.patient ? (
                      <Link
                        to={`/customers/show/${row.patient.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.patient.fullName}
                      </Link>
                    ) : null}
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(row.assignedAt)} →{" "}
                      {row.returnedAt ? formatDateTime(row.returnedAt) : "nay"}
                    </span>
                  </div>
                  <Badge variant={row.status === "active" ? "info" : "neutral"}>
                    {row.status === "active" ? "Đang dùng" : "Đã trả"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Thiết bị chưa được gán cho ai.
            </p>
          )}
        </DetailPanel>
      </div>

      {record && <RecentReadings deviceId={record.id} />}

      {seeSyncs?.can && (
        <DetailPanel
          title="Lần đồng bộ gần đây"
          bodyClassName="p-4"
          action={
            record ? (
              <Link
                to={`/device-syncs?filters[0][field]=deviceId&filters[0][operator]=eq&filters[0][value]=${record.id}`}
                className="text-sm hover:underline"
              >
                Xem tất cả
              </Link>
            ) : null
          }
        >
          {uploads.length ? (
            <ul className="flex flex-col gap-2">
              {uploads.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <Link
                    to={`/device-syncs/show/${u.id}`}
                    className="flex flex-col hover:underline"
                  >
                    <span className="font-medium tabular-nums">
                      {formatDateTime(u.receivedAt)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {SYNC_SOURCE_LABELS[u.source]} · {u.recordCount} bản ghi ·
                      lưu {u.acceptedCount}, trùng {u.duplicateCount}, lỗi{" "}
                      {u.rejectedCount}
                    </span>
                  </Link>
                  <Badge variant={SYNC_STATUS_VARIANTS[u.status]}>
                    {SYNC_STATUS_LABELS[u.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Thiết bị chưa gửi dữ liệu lần nào.
            </p>
          )}
        </DetailPanel>
      )}
    </ShowView>
  );
};
