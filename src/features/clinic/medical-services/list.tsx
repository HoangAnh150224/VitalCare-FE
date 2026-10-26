import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";

import { actionsColumnWidth, DataTable, RESIZABLE_COLUMN_DEFAULTS } from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { EditButton } from "@/shared/components/buttons/edit";
import { Badge } from "@/shared/ui/badge";
import type { MedicalService } from "@/domains/billing/types";
import { SERVICE_CATEGORY_LABELS, SERVICE_STATUS_LABELS } from "@/domains/billing/types";
import { SERVICE_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatMoney } from "@/shared/lib/format";

/** The catalogue of services and their prices, one for every clinic (Report 1 FE-22, FE-23). */
export const MedicalServiceList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<MedicalService>();
    return [
      col.accessor("code", {
        id: "code",
        header: "Mã",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-mono font-medium">{getValue()}</span>,
      }),
      col.accessor("name", {
        id: "name",
        header: "Dịch vụ",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-muted-foreground text-xs">{SERVICE_CATEGORY_LABELS[row.original.category]}</span>
          </div>
        ),
      }),
      col.accessor("price", {
        id: "price",
        header: "Giá",
        enableSorting: false,
        cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue())}</span>,
      }),
      col.accessor("turnaroundMinutes", {
        id: "turnaroundMinutes",
        header: "Trả kết quả sau",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.category === "consultation" ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="tabular-nums">{formatMinutes(row.original.turnaroundMinutes)}</span>
          ),
      }),
      col.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Badge variant={SERVICE_STATUS_VARIANTS[getValue()]}>{SERVICE_STATUS_LABELS[getValue()]}</Badge>
        ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <EditButton resource="medical_services" recordItemId={row.original.id} iconOnly size="icon-sm" />
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
    // The catalogue is short and comes whole.
    refineCoreProps: { resource: "medical_services", pagination: { mode: "off" }, syncWithLocation: false },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="medical_services"
        description="Dịch vụ y tế và giá, dùng chung cho mọi cơ sở. Bác sĩ chỉ định từ danh mục này trong lần khám."
      />
      <DataTable table={table} />
    </ListView>
  );
};

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}
