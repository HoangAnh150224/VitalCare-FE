import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";

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
import { humanizeResource } from "@/domains/permission/types";
import { AUDIT_ACTION_LABELS, type AuditEntry } from "./types";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "action",
    label: "Hành động",
    type: "select",
    options: Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    field: "entityType",
    label: "Loại dữ liệu",
    type: "select",
    options: ["users", "medical_records", "device_assignments", "invoices"].map(
      (value) => ({ value, label: humanizeResource(value) })
    ),
  },
  {
    field: "occurredFrom",
    label: "Từ ngày",
    type: "text",
    placeholder: "YYYY-MM-DD",
  },
  {
    field: "occurredTo",
    label: "Đến ngày",
    type: "text",
    placeholder: "YYYY-MM-DD",
  },
];

/**
 * Audit Log List & Search (FE-20): every protected action, newest first —
 * who, what, on which record, when, from where. Read-only by design (BR-24).
 */
export const AuditLogList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<AuditEntry>();
    return [
      col.accessor("occurredAt", {
        id: "occurredAt",
        header: "Thời điểm",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatDateTime(getValue())}</span>
        ),
      }),
      col.accessor("actorName", {
        id: "actorName",
        header: "Người thực hiện",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.actorName ??
          (row.original.actorId ? `#${row.original.actorId}` : "Hệ thống"),
      }),
      col.accessor("action", {
        id: "action",
        header: "Hành động",
        cell: ({ getValue }) => (
          <Badge variant="secondary">
            {AUDIT_ACTION_LABELS[getValue()] ?? getValue()}
          </Badge>
        ),
      }),
      col.accessor("entityType", {
        id: "entityType",
        header: "Dữ liệu",
        cell: ({ row }) => (
          <span>
            {humanizeResource(row.original.entityType)}
            {row.original.entityId != null && (
              <span className="text-muted-foreground ml-1 font-mono">
                #{row.original.entityId}
              </span>
            )}
          </span>
        ),
      }),
      col.accessor("ipAddress", {
        id: "ipAddress",
        header: "Địa chỉ IP",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue() ?? "—"}</span>
        ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <ShowButton
            resource="audit_logs"
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
    refineCoreProps: { resource: "audit_logs", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="audit_logs"
        canCreate={false}
        description="Bản ghi các thao tác được bảo vệ: xem hồ sơ bệnh án, đổi quyền, khoá tài khoản, cấp thiết bị, thu tiền... Không sửa, không xoá được."
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
