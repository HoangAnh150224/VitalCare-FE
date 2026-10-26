import { useCan } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { ChartColumnIcon } from "lucide-react";
import React from "react";
import { Link } from "react-router";

import { actionsColumnWidth, DataTable, RESIZABLE_COLUMN_DEFAULTS } from "@/shared/components/data-table/data-table";
import { DataTableQuickFilter } from "@/shared/components/data-table/data-table-quick-filter";
import {
  DataTableAdvancedFilter,
  DataTableFilterChips,
  type AdvancedFilterField,
} from "@/shared/components/data-table/data-table-advanced-filter";
import { ListToolbar, ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { Button } from "@/shared/ui/button";
import type { Invoice } from "@/domains/billing/types";
import { INVOICE_STATUS_OPTIONS } from "@/domains/billing/types";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { InvoiceStatusBadge } from "./invoice-lines";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "status", label: "Trạng thái", type: "select", options: INVOICE_STATUS_OPTIONS },
];

/** The clinic's bills, newest first (Report 1 FE-23). A bill is issued when a visit is concluded. */
export const InvoiceList = () => {
  const { data: canReport } = useCan({ resource: "invoices", action: "report" });
  const columns = React.useMemo(() => {
    const col = createColumnHelper<Invoice>();
    return [
      col.accessor("invoiceNumber", {
        id: "invoiceNumber",
        header: "Số hóa đơn",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-mono text-sm font-medium">{getValue()}</span>,
      }),
      col.accessor((row) => row.patient.fullName, {
        id: "patient",
        header: "Bệnh nhân",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.patient.fullName}</span>
            <span className="text-muted-foreground text-xs">{row.original.patient.phone ?? row.original.patient.customerCode}</span>
          </div>
        ),
      }),
      col.accessor("totalAmount", {
        id: "totalAmount",
        header: "Tổng tiền",
        enableSorting: true,
        cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue())}</span>,
      }),
      col.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => <InvoiceStatusBadge status={getValue()} />,
      }),
      col.accessor("issuedAt", {
        id: "issuedAt",
        header: "Ngày lập",
        enableSorting: true,
        cell: ({ getValue }) => <span className="text-sm">{formatDateTime(getValue())}</span>,
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => <ShowButton resource="invoices" recordItemId={row.original.id} iconOnly size="icon-sm" />,
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
    refineCoreProps: { resource: "invoices", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="invoices"
        canCreate={false}
        description="Hóa đơn được lập khi bác sĩ hoàn tất lần khám, gồm phí khám và các dịch vụ đã làm."
        actions={
          canReport?.can && (
            <Button asChild variant="outline">
              <Link to="/invoices/report">
                <ChartColumnIcon />
                Báo cáo doanh thu
              </Link>
            </Button>
          )
        }
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
