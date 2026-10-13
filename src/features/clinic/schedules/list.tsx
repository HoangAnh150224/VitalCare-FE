import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React, { useState } from "react";

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
import { DeleteButton } from "@/shared/components/buttons/delete";
import { EditButton } from "@/shared/components/buttons/edit";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import type { DoctorSchedule } from "@/domains/schedule/types";
import { SCHEDULE_STATUS_LABELS, SCHEDULE_STATUS_OPTIONS } from "@/domains/schedule/types";
import { SCHEDULE_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import { clinicToday } from "../appointments/clinic-day";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "status", label: "Loại", type: "select", options: SCHEDULE_STATUS_OPTIONS },
];

/**
 * The clinic's doctors' working periods and time off, from a chosen day on —
 * today by default, because a schedule is read forwards.
 *
 * Everybody at the clinic reads it. The row buttons follow `_can`: a doctor
 * changes their own periods, the clinic administrator anybody's.
 */
export const DoctorScheduleList = () => {
  const [from, setFrom] = useState(clinicToday());

  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<DoctorSchedule>();
    return [
      columnHelper.accessor("workDate", {
        id: "workDate",
        header: "Ngày",
        enableSorting: true,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatLocalDate(getValue())}</span>,
      }),
      columnHelper.display({
        id: "time",
        header: "Giờ",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatLocalTime(row.original.startTime)} – {formatLocalTime(row.original.endTime)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "doctor",
        header: "Bác sĩ",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.doctor.fullName}</span>
            {row.original.doctor.specialty && (
              <span className="text-muted-foreground text-xs">{row.original.doctor.specialty}</span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Loại",
        enableSorting: true,
        cell: ({ getValue }) => (
          <Badge variant={SCHEDULE_STATUS_VARIANTS[getValue()] ?? "secondary"}>
            {SCHEDULE_STATUS_LABELS[getValue()]}
          </Badge>
        ),
      }),
      columnHelper.accessor("note", {
        id: "note",
        header: "Ghi chú",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-muted-foreground line-clamp-1 text-sm">{getValue() ?? ""}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) =>
          row.original._can?.write === false ? null : (
            <div className="flex items-center gap-1">
              <EditButton resource="doctor_schedules" recordItemId={row.original.id} iconOnly size="icon-sm" />
              <DeleteButton resource="doctor_schedules" recordItemId={row.original.id} iconOnly size="icon-sm" />
            </div>
          ),
        ...actionsColumnWidth(2),
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
      resource: "doctor_schedules",
      syncWithLocation: false,
      filters: { permanent: [{ field: "workDate", operator: "gte", value: from }] },
    },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="doctor_schedules"
        description="Ca làm việc và ngày nghỉ của bác sĩ trong cơ sở. Bác sĩ tự quản lý ca của mình; quản trị phòng khám quản lý ca của mọi bác sĩ."
      />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    aria-label="Từ ngày"
                    title="Từ ngày"
                    className="w-40"
                    value={from}
                    // Never empty: clearing it goes back to today rather than
                    // leaving the box blank over a list that is still filtered.
                    onChange={(event) => setFrom(event.target.value || clinicToday())}
                  />
                  <DataTableQuickFilter table={table} />
                </div>
              }
              filters={<DataTableAdvancedFilter table={table} fields={FILTER_FIELDS} />}
            />
            <DataTableFilterChips table={table} fields={FILTER_FIELDS} />
          </>
        }
      />
    </ListView>
  );
};
