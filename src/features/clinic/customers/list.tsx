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
import { EditButton } from "@/shared/components/buttons/edit";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import type { Customer } from "@/domains/customer/types";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_OPTIONS,
} from "@/domains/customer/types";
import { CUSTOMER_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatDate } from "@/shared/lib/format";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "status",
    label: "Trạng thái",
    type: "select",
    options: CUSTOMER_STATUS_OPTIONS,
  },
  { field: "customerCode", label: "Mã khách hàng", type: "text", placeholder: "Bất kỳ" },
];

/**
 * Everybody who registered, neutral and patient alike.
 *
 * The quick search matches name, phone number and customer code — the three
 * things a receptionist has in front of them when somebody walks in. No create
 * button: a customer comes into being by registering.
 */
export const CustomerList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Customer>();

    return [
      columnHelper.accessor("customerCode", {
        id: "customerCode",
        header: "Mã",
        enableSorting: true,
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
      }),
      columnHelper.accessor("fullName", {
        id: "fullName",
        enableResizing: true,
        header: "Khách hàng",
        // Name and number come from the account; the API cannot sort a
        // customer by a column of another table.
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.fullName}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {row.original.phone}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={CUSTOMER_STATUS_VARIANTS[status] ?? "secondary"}>
              {CUSTOMER_STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("patientActivatedAt", {
        id: "patientActivatedAt",
        header: "Thành bệnh nhân",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">{formatDate(getValue())}</span>
        ),
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: "Đăng ký",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">{formatDate(getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <EditButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />
          </div>
        ),
        enableSorting: false,
        ...actionsColumnWidth(2),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: {
      columnPinning: { right: ["actions"] },
    },
    refineCoreProps: {
      syncWithLocation: true,
    },
  });

  return (
    <ListView>
      <ListViewHeader description="Người đã đăng ký tài khoản. Khách chưa kích hoạt trở thành bệnh nhân khi check-in lịch hẹn hoặc khi nhân viên kích hoạt." />
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
