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
import type { Role } from "@/domains/role/types";
import { ExcelTableExport } from "@/shared/components/data-table/excel-export";

const ADVANCED_FILTER_FIELDS: AdvancedFilterField[] = [
  { field: "code", label: "Mã", type: "text", placeholder: "Nhập mã vai trò" },
  { field: "name", label: "Tên", type: "text", placeholder: "Nhập tên vai trò" },
];

export const RoleList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Role>();

    return [
      columnHelper.accessor("code", {
        id: "code",
        header: "Mã",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("name", {
        id: "name",
        enableResizing: true,
        header: "Tên",
        enableSorting: true,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      }),
      columnHelper.accessor("description", {
        id: "description",
        enableResizing: true,
        header: "Mô tả",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue() ?? "—"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "permissions",
        header: "Quyền",
        enableSorting: false,
        // The count rather than the codes: a role can grant a dozen, and the
        // full list belongs on the show page where there is room for it.
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.permissions.length}</Badge>
        ),
        size: 120,
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
    // Drag the divider in the header to resize; double-click it to go back to
    // the column's default width.
    // Resizing is opt-in per column: `RESIZABLE_COLUMN_DEFAULTS` turns it off
    // by default and a column asks for a handle with `enableResizing: true`.
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    // The row's actions are the cell somebody scrolls sideways *in order to*
    // reach, so they are the one cell that must not be what scrolls away.
    // `getCommonStyles` in `data-table.tsx` renders a pinned column sticky, but
    // only ever reads pinning state and never sets it, so a column stays where
    // it was declared until a table asks for this.
    //
    // Sticky positioning costs nothing while the table fits its card — the cell
    // never leaves its static position — so this is unconditional rather than
    // switched on once the table is measured to overflow.
    initialState: {
      columnPinning: { right: ["actions"] },
    },
    refineCoreProps: {
      syncWithLocation: true,
    },
  });

  return (
    <ListView>
      <ListViewHeader description="Hệ thống có 7 vai trò cố định, không thêm hay xoá: Khách, Bệnh nhân, Người chăm sóc, Bác sĩ, Nhân viên y tế (lễ tân), Quản trị phòng khám và Quản trị hệ thống. Người chăm sóc là Khách hoặc Bệnh nhân được bệnh nhân chia sẻ dữ liệu nên không có dòng riêng. Ở đây chỉ chỉnh quyền của từng vai trò." />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              exportAction={<ExcelTableExport table={table} resource="roles" title="Danh sách vai trò" columns={[
                { label: "Mã vai trò", width: 26, value: (r: Role) => r.code },
                { label: "Tên vai trò", width: 34, value: (r: Role) => r.name },
                { label: "Mô tả", width: 65, value: (r: Role) => r.description ?? "—" },
                { label: "Số quyền", width: 16, value: (r: Role) => r.permissions.length },
                { label: "Vai trò hệ thống", width: 22, value: (r: Role) => r.systemRole ? "Có" : "Không" },
              ]} />}
              search={<DataTableQuickFilter table={table} placeholder="Tìm theo mã, tên vai trò hoặc mô tả..." />}
              filters={<DataTableAdvancedFilter table={table} fields={ADVANCED_FILTER_FIELDS} />}
            />
            <DataTableFilterChips table={table} fields={ADVANCED_FILTER_FIELDS} />
          </>
        }
      />
    </ListView>
  );
};
