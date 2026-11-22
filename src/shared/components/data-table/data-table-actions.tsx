"use client";

import { useState } from "react";
import type { BaseRecord, HttpError } from "@refinedev/core";
import { useDataProvider, useResourceParams } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import type { Column } from "@tanstack/react-table";
import {
  Columns3Icon,
  DownloadIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { exportScopeLabel } from "./fetch-all";

/* --------------------------------------------------------------------------
   Refresh
   -------------------------------------------------------------------------- */

/**
 * Re-read the current page.
 *
 * Deliberately not the `RefreshButton` the detail screens use: that one is
 * built on `useRefreshButton`, which invalidates a *record* and needs an id. A
 * list has no id — what it has is a query with the current filters, sorters and
 * page already in it, so refetching that query is the whole operation.
 *
 * It spins on `isFetching` rather than `isLoading`, because `isLoading` is only
 * true on the very first fetch: a refresh of data already on screen would
 * otherwise give no sign it had happened at all.
 */
export function DataTableRefresh<TData extends BaseRecord>({
  table,
  className,
}: {
  table: UseTableReturnType<TData, HttpError>;
  className?: string;
}) {
  const { tableQuery } = table.refineCore;
  const isFetching = tableQuery.isFetching;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Làm mới"
          disabled={isFetching}
          onClick={() => void tableQuery.refetch()}
          className={className}
        >
          <RefreshCwIcon className={cn(isFetching && "animate-spin")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Làm mới</TooltipContent>
    </Tooltip>
  );
}

/* --------------------------------------------------------------------------
   Column visibility
   -------------------------------------------------------------------------- */

/** The header text, when it is a plain string — otherwise the column's id. */
function columnLabel<TData>(column: Column<TData, unknown>) {
  const header = column.columnDef.header;
  if (typeof header === "string" && header.trim()) return header;
  return column.id;
}

/**
 * Show and hide columns.
 *
 * The actions column is excluded on purpose. It is not data — it is how a row
 * is opened and deleted — so hiding it takes the screen's controls away and
 * leaves nothing to say where they went.
 */
export function DataTableColumnToggle<TData extends BaseRecord>({
  table,
  className,
}: {
  table: UseTableReturnType<TData, HttpError>;
  className?: string;
}) {
  const columns = table.reactTable
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && column.id !== "actions");

  if (columns.length === 0) return null;

  const hidden = columns.filter((column) => !column.getIsVisible()).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className={className}>
          <Columns3Icon />
          Cột
          {hidden > 0 && (
            <span className="text-muted-foreground tabular-nums">
              ({columns.length - hidden}/{columns.length})
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-52 overflow-y-auto">
        <DropdownMenuLabel>Cột hiển thị</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            // Radix closes on select by default, which would mean reopening the
            // menu for every column somebody wants to turn off.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
          >
            <span className="truncate">{columnLabel(column)}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {hidden > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                columns.forEach((column) => column.toggleVisibility(true))
              }
            >
              Hiện tất cả
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------------------------------------------------------
   Export
   -------------------------------------------------------------------------- */

/**
 * A cell value that reads cleanly in a spreadsheet.
 *
 * A list cell is often an object — an assignee, a department, a category — and
 * `String(value)` on one of those writes `[object Object]` into the file, which
 * is worse than leaving the column out. So a summary object is reduced to the
 * one field a person would have read on screen, and anything genuinely
 * structured falls back to JSON rather than to nonsense.
 */
function toField(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["fullName", "name", "title", "code", "username"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
    if (Array.isArray(value)) return value.map(toField).join("; ");
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Export the table as a formatted Excel workbook.
 *
 * Two items, because they answer different questions and only one of them is
 * cheap. **This page** is the rows already in the browser and needs no request:
 * the columns are the ones currently shown, in the order they are shown, so
 * hiding a column from the Columns menu takes it out of the file too. **All
 * rows** goes back to the API page by page,
 * carrying the current filters and sorters so the file matches the table
 * rather than the whole resource.
 *
 * Both write the stored column values, with widths and workbook formatting so
 * Excel does not clip dates or discard workbook features as it does with CSV.
 *
 * A row-level scope still applies to the second one: the export reads through
 * the same endpoint, so it can only ever contain rows the caller may read.
 */
export function DataTableExport<TData extends BaseRecord>({
  table,
  className,
}: {
  table: UseTableReturnType<TData, HttpError>;
  className?: string;
}) {
  const { resource, identifier } = useResourceParams();
  const name = identifier ?? resource?.name ?? "export";
  const { filters, sorters } = table.refineCore;
  const dataProvider = useDataProvider();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const exportFile = async (all: boolean) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const columns = table.reactTable
        .getVisibleLeafColumns()
        .filter((column) => column.id !== "actions" && column.accessorFn);
      if (!columns.length) {
        toast.error("Không có cột dữ liệu để xuất.");
        return;
      }

      let rows = table.reactTable.getRowModel().rows.map((row) => row.original);
      if (all) {
        if (!resource?.name) throw new Error("Không xác định được danh sách cần xuất.");
        rows = [];
        for (let currentPage = 1; ; currentPage++) {
          const result = await dataProvider().getList<TData>({
            resource: resource.name,
            filters,
            sorters,
            pagination: { currentPage, pageSize: 200, mode: "server" },
          });
          rows.push(...result.data);
          if (!result.data.length || rows.length >= result.total) break;
        }
      }

      const { createTableWorkbook } = await import("./excel-workbook");
      const workbook = createTableWorkbook(
        rows,
        all,
        `Danh sách ${name}`,
        columns.map((column) => ({
          label: columnLabel(column),
          width: Math.max(14, Math.min(48, Math.round(column.getSize() / 7))),
          value: (row: TData) => toField(column.accessorFn?.(row, 0)),
        })),
      );
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `VitalCare-${name}${all ? "" : "-trang"}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Không thể xuất Excel. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className={className}>
          {isLoading ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <DownloadIcon />
          )}
          {isLoading ? "Đang xuất..." : "Xuất Excel"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tải xuống dạng Excel</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isLoading} onSelect={() => void exportFile(false)}>
          <span className="flex flex-col">
            <span>{exportScopeLabel(false)}</span>
            <span className="text-muted-foreground text-xs">
              Các dòng và cột đang hiển thị
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={() => void exportFile(true)}
        >
          <span className="flex flex-col">
            <span>{exportScopeLabel(true)}</span>
            <span className="text-muted-foreground text-xs">
              Mọi kết quả khớp với bộ lọc hiện tại
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

DataTableRefresh.displayName = "DataTableRefresh";
DataTableColumnToggle.displayName = "DataTableColumnToggle";
DataTableExport.displayName = "DataTableExport";
