import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { Link } from "react-router";

import {
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS, formatBookingCode, formatQueueNumber } from "@/domains/appointment/types";
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
 *
 * An administrator viewing as a customer gets the same table from
 * `view_as`: `resource` points it there and `slipPath` links each row to that
 * screen's slip, with no cancel button — viewing as somebody is read-only.
 * `showCustomer` adds whose appointment it is, for the view of everybody's.
 */
type MyAppointmentListProps = {
  resource?: string;
  slipPath?: (appointment: Appointment) => string;
  showCustomer?: boolean;
  title?: string;
  description?: string;
};

export const MyAppointmentList = ({
  resource,
  slipPath,
  showCustomer = false,
  title,
  description = "Các lượt khám bạn đã đăng ký. Khi đến phòng khám, đưa phiếu cho lễ tân để được tiếp nhận.",
}: MyAppointmentListProps = {}) => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Appointment>();

    return [
      columnHelper.accessor("queueNumber", {
        id: "queueNumber",
        header: "Số khám",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-lg font-semibold tabular-nums">{formatQueueNumber(getValue())}</span>
        ),
      }),
      columnHelper.accessor("appointmentDate", {
        id: "appointmentDate",
        header: "Ngày khám",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{formatLocalDate(row.original.appointmentDate)}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              dự kiến {formatLocalTime(row.original.startTime)}
            </span>
          </div>
        ),
      }),
      columnHelper.display({
        id: "doctor",
        header: "Bác sĩ",
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.doctor?.fullName ?? "—"}</span>,
      }),
      // On the customer's own list the account may hold several people's visits.
      ...(!showCustomer
        ? [
            columnHelper.display({
              id: "patient",
              header: "Người tới khám",
              enableSorting: false,
              cell: ({ row }) => <span className="text-sm">{row.original.customer.fullName}</span>,
            }),
          ]
        : []),
      ...(showCustomer
        ? [
            columnHelper.display({
              id: "customer",
              header: "Khách hàng",
              enableSorting: false,
              cell: ({ row }) => (
                <div className="flex flex-col">
                  <span className="font-medium">{row.original.customer.fullName}</span>
                  <span className="text-muted-foreground font-mono text-xs">{row.original.customer.customerCode}</span>
                </div>
              ),
            }),
          ]
        : []),
      columnHelper.accessor("bookingCode", {
        id: "bookingCode",
        header: "Mã phiếu",
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
            {slipPath ? (
              <Button asChild size="sm" variant="outline">
                <Link to={slipPath(row.original)}>Xem phiếu</Link>
              </Button>
            ) : (
              <>
                <ShowButton recordItemId={row.original.id} size="sm" variant="outline">
                  Xem phiếu
                </ShowButton>
                <AppointmentActions appointment={row.original} resource="my_appointments" size="sm" />
              </>
            )}
          </div>
        ),
      }),
    ];
  }, [slipPath, showCustomer]);

  const table = useTable({
    columns,
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    // Off the URL when it is somebody else's list: the page's own URL is the
    // view-as path, not this resource's.
    refineCoreProps: { resource, syncWithLocation: !resource },
  });

  return (
    <ListView>
      <ListViewHeader
        title={title}
        canCreate={resource ? false : undefined}
        description={description}
      />
      <DataTable table={table} />
    </ListView>
  );
};
