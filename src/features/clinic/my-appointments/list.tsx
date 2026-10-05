import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";

import {
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS, formatBookingCode } from "@/domains/appointment/types";
import { ShowButton } from "@/shared/components/buttons/show";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import { AppointmentActions } from "../appointments/appointment-actions";

/**
 * A customer's own appointments.
 *
 * The API answers this from the signed-in account alone, so there is nothing
 * here to filter by customer and nothing a URL could change to see somebody
 * else's. No search either: a person's own appointments fit on a page.
 */
export const MyAppointmentList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Appointment>();

    return [
      columnHelper.accessor("appointmentDate", {
        id: "appointmentDate",
        header: "Thời gian",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{formatLocalDate(row.original.appointmentDate)}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatLocalTime(row.original.startTime)}
              {row.original.endTime ? ` – ${formatLocalTime(row.original.endTime)}` : ""}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("bookingCode", {
        id: "bookingCode",
        header: "Mã lịch hẹn",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-mono text-sm">{formatBookingCode(getValue())}</span>,
      }),
      columnHelper.display({
        id: "clinic",
        header: "Phòng khám",
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.clinic.name}</span>,
      }),
      columnHelper.accessor("reason", {
        id: "reason",
        header: "Lý do",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">{getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={APPOINTMENT_STATUS_VARIANTS[status] ?? "secondary"}>
              {APPOINTMENT_STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <ShowButton recordItemId={row.original.id} size="sm" variant="outline">
              Xem phiếu
            </ShowButton>
            <AppointmentActions appointment={row.original} resource="my_appointments" size="sm" />
          </div>
        ),
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
      <ListViewHeader description="Lịch khám bạn đã đặt. Khi đến phòng khám, nhân viên sẽ check-in cho bạn." />
      <DataTable table={table} />
    </ListView>
  );
};
