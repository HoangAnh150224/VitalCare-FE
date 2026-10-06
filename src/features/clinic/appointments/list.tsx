import { useCan } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { ScanLineIcon } from "lucide-react";
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
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import type { Appointment } from "@/domains/appointment/types";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_OPTIONS,
  formatBookingCode,
} from "@/domains/appointment/types";
import { Button } from "@/shared/ui/button";
import { CUSTOMER_STATUS_LABELS } from "@/domains/customer/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import { useClinicOptions } from "../clinics/use-clinic-options";
import { AppointmentActions } from "./appointment-actions";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "status",
    label: "Trạng thái",
    type: "select",
    options: APPOINTMENT_STATUS_OPTIONS,
  },
  { field: "appointmentDate", label: "Ngày khám", type: "text", placeholder: "YYYY-MM-DD" },
];

/**
 * `clinicId` locks the list to one clinic and `readOnly` drops the actions
 * that change something: together, an administrator looking at what that
 * clinic's front desk sees. Left out, the list is the screen it always was.
 */
type FrontDeskListProps = {
  clinicId?: string;
  readOnly?: boolean;
};

/**
 * The clinic's appointment book.
 *
 * Check-in sits on the row itself, beside the name: at the front desk the
 * person is standing there, and opening a detail page first is one step too
 * many. The row says when that check-in will also make somebody a patient.
 */
export const AppointmentList = ({ clinicId, readOnly = false }: FrontDeskListProps = {}) => {
  const { data: canCheckIn } = useCan({ resource: "appointments", action: "check_in" });
  const clinics = useClinicOptions();
  // A clinic filter only says something when there is more than one clinic,
  // and none when the list is already locked to one.
  const filterFields = React.useMemo<AdvancedFilterField[]>(
    () =>
      clinics.several && !clinicId
        ? [...FILTER_FIELDS, { field: "clinicId", label: "Phòng khám", type: "select", options: clinics.options }]
        : FILTER_FIELDS,
    [clinics.several, clinics.options, clinicId],
  );

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
        header: "Mã",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-mono text-sm">{formatBookingCode(getValue())}</span>,
      }),
      columnHelper.display({
        id: "customer",
        enableResizing: true,
        header: "Khách hàng",
        enableSorting: false,
        cell: ({ row }) => {
          const { customer } = row.original;
          return (
            <div className="flex flex-col">
              <Link to={`/customers/show/${customer.id}`} className="font-medium hover:underline">
                {customer.fullName}
              </Link>
              <span className="text-muted-foreground font-mono text-xs">
                {customer.phone} · {customer.customerCode}
                {customer.status === "neutral" && (
                  <span className="ms-1 font-sans">
                    · {CUSTOMER_STATUS_LABELS.neutral}
                  </span>
                )}
              </span>
            </div>
          );
        },
      }),
      ...(clinics.several && !clinicId
        ? [
            columnHelper.display({
              id: "clinic",
              header: "Phòng khám",
              enableSorting: false,
              cell: ({ row }) => <span className="text-sm">{row.original.clinic.name}</span>,
            }),
          ]
        : []),
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
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {!readOnly && <AppointmentActions appointment={row.original} resource="appointments" size="sm" />}
            <ShowButton resource="appointments" recordItemId={row.original.id} iconOnly size="icon-sm" />
          </div>
        ),
        enableSorting: false,
        ...actionsColumnWidth(4),
      }),
    ];
  }, [clinics.several, clinicId, readOnly]);

  const table = useTable({
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: {
      columnPinning: { right: ["actions"] },
    },
    refineCoreProps: clinicId
      ? // Locked to one clinic: off the URL, so nothing there can unlock it.
        { resource: "appointments", syncWithLocation: false, filters: { permanent: [{ field: "clinicId", operator: "eq", value: clinicId }] } }
      : { resource: "appointments", syncWithLocation: true },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="appointments"
        canCreate={readOnly ? false : undefined}
        description="Lịch hẹn của phòng khám. Check-in một khách chưa kích hoạt sẽ đồng thời kích hoạt hồ sơ bệnh nhân."
        actions={
          canCheckIn?.can && !readOnly ? (
            <Button asChild variant="outline">
              <Link to="/appointments/check-in">
                <ScanLineIcon />
                Check-in nhanh
              </Link>
            </Button>
          ) : undefined
        }
      />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={<DataTableQuickFilter table={table} />}
              filters={<DataTableAdvancedFilter table={table} fields={filterFields} />}
            />
            <DataTableFilterChips table={table} fields={filterFields} />
          </>
        }
      />
    </ListView>
  );
};
