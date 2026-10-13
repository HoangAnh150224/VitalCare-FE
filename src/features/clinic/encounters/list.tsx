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
import type { Encounter } from "@/domains/encounter/types";
import { ENCOUNTER_STATUS_LABELS, ENCOUNTER_STATUS_OPTIONS } from "@/domains/encounter/types";
import { ENCOUNTER_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatDateTime } from "@/shared/lib/format";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "status", label: "Trạng thái", type: "select", options: ENCOUNTER_STATUS_OPTIONS },
];

/**
 * The clinic's encounters, newest first. There is no create here: an encounter
 * is opened from the patient it is for, on their page or their appointment.
 */
export const EncounterList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Encounter>();
    return [
      columnHelper.accessor("startedAt", {
        id: "startedAt",
        header: "Bắt đầu",
        enableSorting: true,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatDateTime(getValue())}</span>,
      }),
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
      columnHelper.accessor("chiefComplaint", {
        id: "chiefComplaint",
        header: "Lý do khám",
        enableSorting: false,
        cell: ({ getValue }) => <span className="line-clamp-2 text-sm">{getValue()}</span>,
      }),
      columnHelper.display({
        id: "clinician",
        header: "Người khám",
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.clinician?.fullName ?? "—"}</span>,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => (
          <Badge variant={ENCOUNTER_STATUS_VARIANTS[getValue()] ?? "secondary"}>
            {ENCOUNTER_STATUS_LABELS[getValue()]}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <ShowButton resource="clinical_encounters" recordItemId={row.original.id} iconOnly size="icon-sm" />
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
    refineCoreProps: { resource: "clinical_encounters", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="clinical_encounters"
        canCreate={false}
        description="Các lần khám tại phòng khám. Tạo lần khám mới từ trang bệnh nhân hoặc từ lượt đăng ký khám đã tiếp nhận."
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
