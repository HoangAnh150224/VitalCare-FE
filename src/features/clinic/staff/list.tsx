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
import { ListToolbar, ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { EditButton } from "@/shared/components/buttons/edit";
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
import { useClinicOptions } from "../clinics/use-clinic-options";

const FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "staffType", label: "Loại", type: "select", options: STAFF_TYPE_OPTIONS },
  { field: "status", label: "Trạng thái", type: "select", options: EMPLOYEE_STATUS_OPTIONS },
];

/** Clinical staff — the people a patient's care team is made of. */
export const StaffList = () => {
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
        header: "Nhân viên",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.fullName}</span>
            <span className="text-muted-foreground font-mono text-xs">{row.original.phone}</span>
          </div>
        ),
      }),
      columnHelper.accessor("staffType", {
        id: "staffType",
        header: "Loại",
        enableSorting: true,
        cell: ({ getValue }) => <Badge variant="outline">{STAFF_TYPE_LABELS[getValue()]}</Badge>,
      }),
      columnHelper.accessor("specialty", {
        id: "specialty",
        header: "Chuyên khoa",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-sm">{getValue() ?? "—"}</span>,
      }),
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
          <Badge variant={EMPLOYEE_STATUS_VARIANTS[getValue()] ?? "secondary"}>
            {EMPLOYEE_STATUS_LABELS[getValue()]}
          </Badge>
        ),
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
  }, [severalClinics, clinicName]);

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
      <ListViewHeader description="Bác sĩ, điều dưỡng và lễ tân. Bác sĩ, điều dưỡng theo dõi bệnh nhân được gán; lễ tân chỉ thấy dữ liệu phòng khám của mình." />
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
