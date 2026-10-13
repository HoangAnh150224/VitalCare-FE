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
import { ListToolbar, ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import type { MonitoringAssignment } from "@/domains/assignment/types";
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_OPTIONS } from "@/domains/assignment/types";
import { STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { ASSIGNMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatDateTime } from "@/shared/lib/format";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "status", label: "Trạng thái", type: "select", options: ASSIGNMENT_STATUS_OPTIONS },
];

/**
 * Who follows whom across the clinic, newest first. Filter to "Đã kết thúc"
 * for the history. Read-only: an assignment is made and ended on the
 * patient's page.
 */
export const AssignmentList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<MonitoringAssignment>();
    return [
      columnHelper.display({
        id: "patient",
        header: "Bệnh nhân",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.patient.fullName}</span>
            <span className="text-muted-foreground font-mono text-xs">{row.original.patient.customerCode}</span>
          </div>
        ),
      }),
      columnHelper.display({
        id: "staff",
        header: "Người theo dõi",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.staff.fullName}</span>
            <span className="text-muted-foreground text-xs">{STAFF_TYPE_LABELS[row.original.staff.staffType]}</span>
          </div>
        ),
      }),
      columnHelper.accessor("assignedAt", {
        id: "assignedAt",
        header: "Phân công lúc",
        enableSorting: true,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatDateTime(getValue())}</span>,
      }),
      columnHelper.accessor("endedAt", {
        id: "unassignedAt",
        header: "Kết thúc lúc",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums">{getValue() ? formatDateTime(getValue()) : "—"}</span>
        ),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => (
          <Badge variant={ASSIGNMENT_STATUS_VARIANTS[getValue()] ?? "secondary"}>
            {ASSIGNMENT_STATUS_LABELS[getValue()]}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <ShowButton resource="monitoring_assignments" recordItemId={row.original.id} iconOnly size="icon-sm" />
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
    refineCoreProps: { resource: "monitoring_assignments", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="monitoring_assignments"
        canCreate={false}
        description="Phân công theo dõi bệnh nhân trong cơ sở, cả hiện tại lẫn đã kết thúc. Phân công mới được tạo ở trang bệnh nhân."
      />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={<DataTableQuickFilter table={table} />}
              filters={<DataTableAdvancedFilter table={table} fields={FILTER_FIELDS} />}
            />
            <DataTableFilterChips table={table} fields={FILTER_FIELDS} />
          </>
        }
      />
    </ListView>
  );
};
