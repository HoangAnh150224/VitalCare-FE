import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { EditButton } from "@/shared/components/buttons/edit";
import { ClinicStatusButton } from "./status-button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { Clinic } from "@/domains/clinic/types";
import { CLINIC_STATUS_LABELS } from "@/domains/clinic/types";
import { CLINIC_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { useSearchOnEnter } from "@/shared/hooks/use-search-on-enter";

/**
 * The clinics (SRS 3.18.1). The API answers with all of them, so the search
 * filters the rows already here.
 */
export const ClinicList = () => {
  const { term, inputProps } = useSearchOnEnter();
  const [statusFilter, setStatusFilter] = React.useState("all");

  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Clinic>();
    return [
      columnHelper.accessor("name", {
        id: "name",
        header: "Phòng khám",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      columnHelper.accessor("address", {
        id: "address",
        header: "Địa điểm",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-muted-foreground text-sm">{getValue() ?? "—"}</span>,
      }),
      columnHelper.accessor("operatingStatus", {
        id: "operatingStatus",
        header: "Trạng thái hoạt động",
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue() ?? "OPERATING";
          return <Badge variant={CLINIC_STATUS_VARIANTS[status] ?? "secondary"}>{CLINIC_STATUS_LABELS[status]}</Badge>;
        },
      }),
      columnHelper.accessor("staffCount", {
        id: "staffCount",
        header: "Số nhân viên",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{getValue() ?? "—"}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <EditButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ClinicStatusButton clinic={row.original} />
          </div>
        ),
        ...actionsColumnWidth(3),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    state: { globalFilter: { term, status: statusFilter } },
    globalFilterFn: (row, _column, value: { term: string; status: string }) => {
      const needle = value.term.trim().toLowerCase();
      const matchesStatus = value.status === "all" || (row.original.operatingStatus ?? "OPERATING") === value.status;
      return matchesStatus && (!needle || [row.original.name, row.original.address ?? ""].some((text) => text.toLowerCase().includes(needle)));
    },
    // Filtering on the client: the server answers with every clinic and takes no filter.
    refineCoreProps: { syncWithLocation: false, pagination: { mode: "off" }, filters: { mode: "off" } },
  });

  return (
    <ListView>
      <ListViewHeader
        description="Các phòng khám, trạng thái hoạt động và số nhân viên của từng cơ sở."
      />
      <DataTable
        table={table}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
          <Input
            className="max-w-sm"
            placeholder="Tìm theo tên hoặc địa điểm"
            aria-label="Tìm phòng khám"
            {...inputProps}
          />
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            table.reactTable.setPageIndex(0);
          }}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Lọc trạng thái hoạt động">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="OPERATING">Đang hoạt động</SelectItem>
              <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
            </SelectContent>
          </Select>
          </div>
        }
      />
    </ListView>
  );
};
