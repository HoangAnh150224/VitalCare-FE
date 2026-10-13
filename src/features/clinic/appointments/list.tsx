import { useCan, useCustom } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { ScanLineIcon } from "lucide-react";
import React, { useState } from "react";
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
  formatQueueNumber,
} from "@/domains/appointment/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { API_URL } from "@/shared/api/constants";
import type { DoctorAvailability } from "@/domains/schedule/types";
import { CUSTOMER_STATUS_LABELS } from "@/domains/customer/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import { useClinicOptions } from "../clinics/use-clinic-options";
import { AppointmentActions } from "./appointment-actions";
import { clinicToday } from "./clinic-day";

/** Monday and Sunday of the clinic's current week, `YYYY-MM-DD`: the list opens on "this week". */
function thisWeek(): [string, string] {
  const today = new Date(`${clinicToday()}T00:00:00Z`);
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const day = (offset: number) =>
    new Date(today.getTime() + (offset - sinceMonday) * 86_400_000).toISOString().slice(0, 10);
  return [day(0), day(6)];
}

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "status",
    label: "Trạng thái",
    type: "select",
    options: APPOINTMENT_STATUS_OPTIONS,
  },
];

/**
 * `clinicId` locks the list to one clinic and `readOnly` drops the actions
 * that change something: together, an administrator looking at what that
 * clinic's front desk sees. Left out, the list is the screen it always was.
 */
type FrontDeskListProps = {
  clinicId?: string;
  readOnly?: boolean;
  /**
   * Where the rows come from. An administrator holds no `appointments:read`
   * (SRS 3.1.3), so their view of this screen reads `view_as/appointments`.
   */
  resource?: string;
};

/**
 * The clinic's registered visits, this week's by default.
 *
 * Check-in sits on the row itself, beside the name: at the front desk the
 * person is standing there, and opening a detail page first is one step too
 * many. The row says when that check-in will also make somebody a patient.
 * Everything else that can be done to a visit is on its own page.
 */
export const AppointmentList = ({ clinicId, readOnly = false, resource = "appointments" }: FrontDeskListProps = {}) => {
  const { data: canCheckIn } = useCan({ resource: "appointments", action: "check_in" });
  const clinics = useClinicOptions();
  const [[from, to], setRange] = useState(thisWeek);
  // The doctors of the caller's own clinic, for the filter.
  const { data: canReadSchedules } = useCan({ resource: "doctor_schedules", action: "list" });
  const { result: doctorsResult } = useCustom<DoctorAvailability[]>({
    url: `${API_URL}/doctors`,
    method: "get",
    queryOptions: { enabled: canReadSchedules?.can ?? false },
  });
  const doctorOptions = React.useMemo(
    () =>
      (Array.isArray(doctorsResult?.data) ? doctorsResult.data : []).map((doctor) => ({
        label: doctor.fullName,
        value: String(doctor.id),
      })),
    [doctorsResult?.data],
  );
  // A clinic filter only says something when there is more than one clinic,
  // and none when the list is already locked to one.
  const filterFields = React.useMemo<AdvancedFilterField[]>(
    () => [
      ...FILTER_FIELDS,
      ...(doctorOptions.length
        ? [{ field: "employeeId", label: "Bác sĩ", type: "select" as const, options: doctorOptions }]
        : []),
      ...(clinics.several && !clinicId
        ? [{ field: "clinicId", label: "Phòng khám", type: "select" as const, options: clinics.options }]
        : []),
    ],
    [clinics.several, clinics.options, clinicId, doctorOptions],
  );

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
            {!readOnly && (
              <AppointmentActions appointment={row.original} resource="appointments" size="sm" compact />
            )}
            {/* The detail page is the desk's own; a view stops at the list. */}
            {!readOnly && (
              <ShowButton resource="appointments" recordItemId={row.original.id} iconOnly size="icon-sm" />
            )}
          </div>
        ),
        enableSorting: false,
        ...actionsColumnWidth(3),
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
    refineCoreProps: {
      resource,
      // Off the URL: the range lives in this screen's own inputs, and a list
      // locked to one clinic must not be unlocked by anything typed there.
      syncWithLocation: false,
      filters: {
        permanent: [
          ...(clinicId ? [{ field: "clinicId", operator: "eq" as const, value: clinicId }] : []),
          { field: "appointmentDate", operator: "gte" as const, value: from },
          { field: "appointmentDate", operator: "lte" as const, value: to },
        ],
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="appointments"
        canCreate={readOnly ? false : undefined}
        description="Các lượt đăng ký khám của phòng khám. Tiếp nhận một khách chưa kích hoạt sẽ đồng thời kích hoạt hồ sơ bệnh nhân."
        actions={
          canCheckIn?.can && !readOnly ? (
            <Button asChild variant="outline">
              <Link to="/appointments/check-in">
                <ScanLineIcon />
                Tiếp nhận nhanh
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
              search={
                <div className="flex flex-wrap items-center gap-2">
                  {/* Never empty: clearing a box goes back to this week's end of the range. */}
                  <Input
                    type="date"
                    aria-label="Từ ngày"
                    title="Từ ngày"
                    className="w-40"
                    value={from}
                    onChange={(event) => setRange([event.target.value || thisWeek()[0], to])}
                  />
                  <Input
                    type="date"
                    aria-label="Đến ngày"
                    title="Đến ngày"
                    className="w-40"
                    value={to}
                    onChange={(event) => setRange([from, event.target.value || thisWeek()[1]])}
                  />
                  <DataTableQuickFilter table={table} />
                </div>
              }
              filters={<DataTableAdvancedFilter table={table} fields={filterFields} />}
            />
            <DataTableFilterChips table={table} fields={filterFields} />
          </>
        }
      />
    </ListView>
  );
};
