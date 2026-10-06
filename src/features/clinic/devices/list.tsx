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
import { ListToolbar, ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { EditButton } from "@/shared/components/buttons/edit";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import type { Device } from "@/domains/device/types";
import { DEVICE_STATUS_LABELS, DEVICE_STATUS_OPTIONS } from "@/domains/device/types";
import { DEVICE_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatDate } from "@/shared/lib/format";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "status", label: "Trạng thái", type: "select", options: DEVICE_STATUS_OPTIONS },
];

/** The clinic's monitoring devices, and who is wearing each one now. */
export const DeviceList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Device>();
    return [
      columnHelper.accessor("deviceCode", {
        id: "deviceCode",
        header: "Mã thiết bị",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono font-medium">{row.original.deviceCode}</span>
            <span className="text-muted-foreground text-xs">{row.original.model ?? "—"}</span>
          </div>
        ),
      }),
      columnHelper.accessor("serialNumber", {
        id: "serialNumber",
        header: "Serial",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() ?? "—"}</span>,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => (
          <Badge variant={DEVICE_STATUS_VARIANTS[getValue()] ?? "secondary"}>
            {DEVICE_STATUS_LABELS[getValue()]}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "currentPatient",
        header: "Người đang đeo",
        enableSorting: false,
        cell: ({ row }) => {
          const wearer = row.original.currentPatient;
          if (!wearer) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <div className="flex flex-col">
              <Link to={`/customers/show/${wearer.customerId}`} className="text-sm font-medium hover:underline">
                {wearer.fullName}
              </Link>
              <span className="text-muted-foreground text-xs">từ {formatDate(wearer.since)}</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <EditButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />
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
    refineCoreProps: { syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader description="Thiết bị IoMT của phòng khám. Gán thiết bị cho bệnh nhân ở trang chi tiết khách hàng." />
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
