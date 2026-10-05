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
import type { Clinic } from "@/domains/clinic/types";

/** The clinics; open one to see or change its opening hours. */
export const ClinicList = () => {
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
        header: "Địa chỉ",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-muted-foreground text-sm">{getValue() ?? "—"}</span>,
      }),
      columnHelper.accessor("contactPhone", {
        id: "contactPhone",
        header: "Điện thoại",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() ?? "—"}</span>,
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
    refineCoreProps: { syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader description="Các phòng khám và giờ làm việc dùng để chia khung đặt lịch." />
      <DataTable table={table} />
    </ListView>
  );
};
