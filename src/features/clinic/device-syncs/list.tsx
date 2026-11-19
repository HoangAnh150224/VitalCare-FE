import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { Link } from "react-router";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { DataTableQuickFilter } from "@/shared/components/data-table/data-table-quick-filter";
import {
  DataTableAdvancedFilter,
  DataTableFilterChips,
  type AdvancedFilterField,
} from "@/shared/components/data-table/data-table-advanced-filter";
import {
  ListToolbar,
  ListView,
  ListViewHeader,
} from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { ExcelTableExport } from "@/shared/components/data-table/excel-export";
import { DeviceCode } from "../devices/device-code";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import {
  SYNC_SOURCE_LABELS,
  SYNC_SOURCE_OPTIONS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_OPTIONS,
  SYNC_STATUS_VARIANTS,
  type SyncBatch,
} from "@/domains/device/sync";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "status",
    label: "Kết quả",
    type: "select",
    options: SYNC_STATUS_OPTIONS,
  },
  {
    field: "source",
    label: "Nguồn",
    type: "select",
    options: SYNC_SOURCE_OPTIONS,
  },
  {
    field: "pendingOnDevice",
    label: "Hàng đợi offline",
    type: "select",
    options: [{ value: "true", label: "Còn dữ liệu chờ trên thiết bị" }],
  },
];

/**
 * Synchronization History (FE-06): every upload from a device, newest first,
 * and what came of it. "Còn dữ liệu chờ" is the offline data queue — uploads
 * whose sender said it still holds readings back.
 */
export const DeviceSyncList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<SyncBatch>();
    return [
      col.accessor("receivedAt", {
        id: "receivedAt",
        header: "Nhận lúc",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatDateTime(getValue())}</span>
        ),
      }),
      col.accessor("deviceCode", {
        id: "deviceCode",
        header: "Thiết bị",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.deviceId ? (
            <DeviceCode id={row.original.deviceId} code={row.original.deviceCode} />
          ) : (
            "—"
          ),
      }),
      col.accessor("customerName", {
        id: "customerName",
        header: "Bệnh nhân",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.customerId ? (
            <Link
              to={`/customers/show/${row.original.customerId}`}
              className="hover:underline"
            >
              {row.original.customerName}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      }),
      col.accessor("source", {
        id: "source",
        header: "Nguồn",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm">{SYNC_SOURCE_LABELS[getValue()]}</span>
        ),
      }),
      col.display({
        id: "counts",
        header: "Bản ghi",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.recordCount} · lưu {row.original.acceptedCount} ·
            trùng {row.original.duplicateCount} ·{" "}
            <span
              className={
                row.original.rejectedCount
                  ? "text-destructive font-medium"
                  : undefined
              }
            >
              lỗi {row.original.rejectedCount}
            </span>
          </span>
        ),
      }),
      col.accessor("pendingOnDevice", {
        id: "pendingOnDevice",
        header: "Chờ trên thiết bị",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="tabular-nums">{getValue() ?? "—"}</span>
        ),
      }),
      col.accessor("status", {
        id: "status",
        header: "Kết quả",
        cell: ({ getValue }) => (
          <Badge variant={SYNC_STATUS_VARIANTS[getValue()]}>
            {SYNC_STATUS_LABELS[getValue()]}
          </Badge>
        ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <ShowButton
            resource="device_syncs"
            recordItemId={row.original.id}
            iconOnly
            size="icon-sm"
          />
        ),
        ...actionsColumnWidth(1),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: { columnPinning: { right: ["actions"] } },
    refineCoreProps: { resource: "device_syncs", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="device_syncs"
        canCreate={false}
        description="Các lần thiết bị gửi dữ liệu lên: qua điện thoại (REST), trực tiếp (MQTT) hoặc giả lập."
      />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={<DataTableQuickFilter table={table} placeholder="Tìm theo mã thiết bị hoặc mã lô đồng bộ..." />}
              filters={
                <DataTableAdvancedFilter table={table} fields={FILTER_FIELDS} />
              }
              exportAction={
                <ExcelTableExport<SyncBatch>
                  table={table}
                  resource="device_syncs"
                  title="Lịch sử đồng bộ"
                  columns={[
                    { id: "receivedAt", label: "Nhận lúc", width: 22, value: (b) => formatDateTime(b.receivedAt) },
                    { id: "receivedAt", label: "Mã lần đồng bộ", width: 14, value: (b) => b.id },
                    { id: "deviceCode", label: "Thiết bị", width: 18, numFmt: "@", value: (b) => b.deviceCode ?? "—" },
                    { id: "customerName", label: "Bệnh nhân", width: 26, value: (b) => b.customerName ?? "—" },
                    { id: "source", label: "Nguồn", width: 18, value: (b) => SYNC_SOURCE_LABELS[b.source] ?? b.source },
                    { id: "counts", label: "Tổng bản ghi", width: 12, value: (b) => b.recordCount },
                    { id: "counts", label: "Đã lưu", width: 10, value: (b) => b.acceptedCount },
                    { id: "counts", label: "Trùng", width: 10, value: (b) => b.duplicateCount },
                    { id: "counts", label: "Lỗi", width: 10, value: (b) => b.rejectedCount },
                    { id: "pendingOnDevice", label: "Chờ trên thiết bị", width: 16, value: (b) => b.pendingOnDevice ?? "—" },
                    { id: "status", label: "Kết quả", width: 14, value: (b) => SYNC_STATUS_LABELS[b.status] ?? b.status },
                    { id: "status", label: "Mã lô của thiết bị", width: 24, numFmt: "@", value: (b) => b.clientBatchId ?? "—" },
                    { id: "status", label: "Lỗi", width: 36, value: (b) => b.error ?? "—" },
                  ]}
                />
              }
            />
            <DataTableFilterChips table={table} fields={FILTER_FIELDS} />
          </>
        }
      />
    </ListView>
  );
};
