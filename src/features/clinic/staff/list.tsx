import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { EndMembershipButton } from "./end-membership-button";

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
import { DeleteButton } from "@/shared/components/buttons/delete";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import type { Employee } from "@/domains/employee/types";
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_OPTIONS,
  STAFF_TYPE_LABELS,
  STAFF_TYPE_OPTIONS,
} from "@/domains/employee/types";
import { EMPLOYEE_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { getAuthorities } from "@/shared/api/session";
import { useClinicOptions } from "../clinics/use-clinic-options";
import { formatDateTime } from "@/shared/lib/format";
import { StaffExport } from "./staff-export";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "staffType", label: "Loại", type: "select", options: STAFF_TYPE_OPTIONS },
  { field: "status", label: "Trạng thái", type: "select", options: EMPLOYEE_STATUS_OPTIONS, operators: ["eq"] },
];

/** Clinical staff — the people a patient's care team is made of. */
export const StaffList = () => {
  const clinicAdminsOnly = getAuthorities()?.roles.includes("ADMIN") ?? false;
  const filterFields = clinicAdminsOnly
    ? FILTER_FIELDS.filter((field) => field.field !== "staffType")
    // A clinic's own list never holds its administrators, so the filter does not offer them.
    : FILTER_FIELDS.map((field) => field.field === "staffType"
        ? { ...field, options: STAFF_TYPE_OPTIONS.filter((option) => option.value !== "clinic_admin") }
        : field);
  const clinics = useClinicOptions();
  const { several: severalClinics, nameOf: clinicName } = clinics;
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Employee>();
    return [
      columnHelper.accessor("employeeCode", {
        id: "employeeCode",
        header: "Mã",
        enableSorting: true,
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
      }),
      columnHelper.accessor("fullName", {
        id: "fullName",
        enableResizing: true,
        header: clinicAdminsOnly ? "Quản trị phòng khám" : "Nhân viên",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.fullName}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {row.original.phone?.replace(/^\+84(?=\d{9}$)/, "0") || "—"}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("staffType", {
        id: "staffType",
        header: "Loại",
        enableSorting: true,
        cell: ({ getValue }) => <Badge variant="outline">{STAFF_TYPE_LABELS[getValue()]}</Badge>,
      }),
      ...(!clinicAdminsOnly ? [columnHelper.accessor("specialty", {
        id: "specialty",
        header: "Chuyên khoa",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-sm">{getValue() ?? "—"}</span>,
      })] : []),
      ...(severalClinics
        ? [
            columnHelper.accessor("clinicId", {
              id: "clinic",
              header: "Phòng khám",
              enableSorting: false,
              cell: ({ getValue }) => <span className="text-sm">{clinicName(getValue())}</span>,
            }),
          ]
        : []),
      columnHelper.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: true,
        cell: ({ getValue }) => (
          <div className="flex flex-wrap gap-1">
          <Badge variant={EMPLOYEE_STATUS_VARIANTS[getValue()] ?? "secondary"}>
            {EMPLOYEE_STATUS_LABELS[getValue()]}
          </Badge>
          </div>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            {row.original.deletedAt ? (
              <span className="text-muted-foreground text-sm">Đã nghỉ {formatDateTime(row.original.membershipEndedAt ?? row.original.deletedAt)}</span>
            ) : row.original.status === "inactive" ? (
              <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            ) : <>
            <EditButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />
            <EndMembershipButton employee={row.original} />
            {clinicAdminsOnly && <DeleteButton recordItemId={row.original.id} iconOnly size="icon-sm" />}
            </>}
          </div>
        ),
        ...actionsColumnWidth(clinicAdminsOnly ? 4 : 3),
      }),
    ];
  }, [severalClinics, clinicName, clinicAdminsOnly]);

  const table = useTable({
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: { columnPinning: { right: ["actions"] } },
    refineCoreProps: {
      syncWithLocation: true,
      filters: {
        permanent: clinicAdminsOnly
          ? [{ field: "staffType", operator: "eq", value: "clinic_admin" }]
          : [],
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader description={clinicAdminsOnly
        ? "Danh sách tài khoản quản trị phòng khám và phòng khám trực thuộc."
        : "Bác sĩ và lễ tân. Bác sĩ theo dõi bệnh nhân được gán; lễ tân chỉ thấy dữ liệu phòng khám của mình."} />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              exportAction={<StaffExport table={table} clinicName={clinicName} adminsOnly={clinicAdminsOnly} />}
              search={<DataTableQuickFilter table={table} placeholder="Tìm theo mã, họ tên hoặc số điện thoại..." />}
              filters={<DataTableAdvancedFilter table={table} fields={filterFields} />}
            />
            <DataTableFilterChips table={table} fields={filterFields} />
          </>
        }
      />
    </ListView>
  );
};
