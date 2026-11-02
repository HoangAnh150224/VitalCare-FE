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
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import {
  SYNC_FAILURE_STATUS_LABELS,
  SYNC_FAILURE_STATUS_OPTIONS,
  SYNC_FAILURE_STATUS_VARIANTS,
  type SyncFailure,
} from "@/domains/device/sync";
import { FailureActions } from "./failure-actions";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "status",
    label: "Trạng thái",
    type: "select",
    options: SYNC_FAILURE_STATUS_OPTIONS,
  },
];

/**
 * Synchronization Management (FE-06): readings an upload refused, with why,
 * to retry once the cause is put right (the device handed to its patient,
 * say) or to set aside.
 */
export const SyncFailureList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<SyncFailure>();
    return [
      col.accessor("lastAttemptAt", {
        id: "lastAttemptAt",
        header: "Lần thử gần nhất",
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
            <Link
              to={`/devices/show/${row.original.deviceId}`}
              className="font-mono hover:underline"
            >
              {row.original.deviceCode}
            </Link>
          ) : (
            "—"
          ),
      }),
      col.accessor("reason", {
        id: "reason",
        header: "Lý do",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to={`/sync-failures/show/${row.original.id}`}
            className="text-sm hover:underline"
          >
            {row.original.reason}
          </Link>
        ),
      }),
      col.accessor("attempts", {
        id: "attempts",
        header: "Số lần thử",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{getValue()}</span>
        ),
      }),
      col.accessor("status", {
        id: "status",
        header: "Trạng thái",
        cell: ({ getValue }) => (
          <Badge variant={SYNC_FAILURE_STATUS_VARIANTS[getValue()]}>
            {SYNC_FAILURE_STATUS_LABELS[getValue()]}
          </Badge>
        ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <FailureActions failure={row.original} compact />
            <ShowButton
              resource="sync_failures"
              recordItemId={row.original.id}
              iconOnly
              size="icon-sm"
            />
          </div>
        ),
        ...actionsColumnWidth(3),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: { columnPinning: { right: ["actions"] } },
    refineCoreProps: {
      resource: "sync_failures",
      syncWithLocation: true,
      filters: {
        initial: [{ field: "status", operator: "eq", value: "OPEN" }],
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="sync_failures"
        canCreate={false}
        description="Bản ghi số đo không nhận được khi đồng bộ. Sửa nguyên nhân rồi bấm Thử lại, hoặc Bỏ qua nếu bản ghi sai."
      />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={<DataTableQuickFilter table={table} />}
              filters={
                <DataTableAdvancedFilter table={table} fields={FILTER_FIELDS} />
              }
            />
            <DataTableFilterChips table={table} fields={FILTER_FIELDS} />
          </>
        }
      />
    </ListView>
  );
};
