import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";

import { actionsColumnWidth, DataTable, RESIZABLE_COLUMN_DEFAULTS } from "@/shared/components/data-table/data-table";
import { DataTableQuickFilter } from "@/shared/components/data-table/data-table-quick-filter";
import {
  DataTableAdvancedFilter,
  DataTableFilterChips,
  type AdvancedFilterField,
} from "@/shared/components/data-table/data-table-advanced-filter";
import { ListToolbar, ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import type { ServiceOrder } from "@/domains/billing/types";
import { SERVICE_CATEGORY_LABELS, SERVICE_ORDER_STATUS_OPTIONS } from "@/domains/billing/types";
import { formatDateTime } from "@/shared/lib/format";
import { OrderStatusBadge } from "./order-parts";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "status", label: "Trạng thái", type: "select", options: SERVICE_ORDER_STATUS_OPTIONS },
];

/**
 * The clinic's worklist of ordered services (Report 1 FE-22): what is waiting
 * to be done, soonest expected result first.
 */
export const ServiceOrderList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<ServiceOrder>();
    return [
      col.accessor((row) => row.patient.fullName, {
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
      col.accessor((row) => row.service.name, {
        id: "service",
        header: "Dịch vụ",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.service.name}</span>
            <span className="text-muted-foreground text-xs">{SERVICE_CATEGORY_LABELS[row.original.service.category]}</span>
          </div>
        ),
      }),
      col.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => <OrderStatusBadge status={getValue()} />,
      }),
      col.accessor("expectedResultAt", {
        id: "expectedResultAt",
        header: "Dự kiến có kết quả",
        enableSorting: true,
        cell: ({ row }) => {
          const late =
            (row.original.status === "ordered" || row.original.status === "in_progress") &&
            row.original.expectedResultAt != null &&
            new Date(row.original.expectedResultAt).getTime() < Date.now();
          return (
            <span className={late ? "text-destructive text-sm font-medium" : "text-sm"}>
              {formatDateTime(row.original.expectedResultAt)}
              {late && " · trễ"}
            </span>
          );
        },
      }),
      col.accessor("orderedBy", {
        id: "orderedBy",
        header: "Bác sĩ chỉ định",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-sm">{getValue() ?? "—"}</span>,
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <ShowButton resource="service_orders" recordItemId={row.original.id} iconOnly size="icon-sm" />
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
    refineCoreProps: { resource: "service_orders", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="service_orders"
        canCreate={false}
        description="Dịch vụ bác sĩ đã chỉ định trong các lần khám của cơ sở. Mở một dòng để thực hiện và trả kết quả."
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
