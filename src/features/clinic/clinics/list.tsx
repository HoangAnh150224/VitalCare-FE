import { useCan } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { Link } from "react-router";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import type { Clinic } from "@/domains/clinic/types";
import { CLINIC_STATUS_LABELS } from "@/domains/clinic/types";
import { CLINIC_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { Button } from "@/shared/ui/button";
import { useSearchOnEnter } from "@/shared/hooks/use-search-on-enter";

/**
 * The clinics (SRS 3.18.1). The API answers with all of them, so the search
 * filters the rows already here.
 */
export const ClinicList = () => {
  const { term, inputProps } = useSearchOnEnter();
  const { data: canCreateStaff } = useCan({ resource: "employees", action: "create" });

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
        cell: ({ row }) => <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />,
        ...actionsColumnWidth(1),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    state: { globalFilter: term },
    globalFilterFn: (row, _column, value: string) => {
      const needle = value.trim().toLowerCase();
      return !needle || [row.original.name, row.original.address ?? ""].some((text) => text.toLowerCase().includes(needle));
    },
    // Filtering on the client: the server answers with every clinic and takes no filter.
    refineCoreProps: { syncWithLocation: false, pagination: { mode: "off" }, filters: { mode: "off" } },
  });

  return (
    <ListView>
      <ListViewHeader
        description="Các phòng khám, trạng thái hoạt động và số nhân viên của từng cơ sở."
        actions={
          canCreateStaff?.can ? (
            <Button asChild>
              <Link to="/employees/create">Tạo tài khoản nhân sự</Link>
            </Button>
          ) : undefined
        }
      />
      <DataTable
        table={table}
        toolbar={
          <Input
            className="max-w-sm"
            placeholder="Tìm theo tên hoặc địa điểm"
            aria-label="Tìm phòng khám"
            {...inputProps}
          />
        }
      />
    </ListView>
  );
};
