import { useState } from "react";
import { useDataProvider, type HttpError } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportScopeLabel, fetchAllForExport } from "./fetch-all";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import type { BaseRecord } from "@refinedev/core";

export function ExcelTableExport<T extends BaseRecord>({ table, resource, title, columns }: { table: UseTableReturnType<T, HttpError>; resource: string; title: string; columns: { id?: string; label: string; width: number; numFmt?: string; value: (row: T) => string | number }[] }) {
  const provider = useDataProvider();
  const [busy, setBusy] = useState(false);
  async function exportFile(all: boolean) {
    setBusy(true);
    try {
      let rows: T[];
      if (all) rows = await fetchAllForExport<T>(provider(), resource, table.refineCore.filters, table.refineCore.sorters);
      else rows = table.reactTable.getRowModel().rows.map((row) => row.original);
      const visibleIds = new Set(table.reactTable.getVisibleLeafColumns().map((column) => column.id));
      const visibleColumns = columns.filter((column) => !column.id || visibleIds.has(column.id));
      if (!visibleColumns.length) throw new Error("No visible columns to export");
      const { createTableWorkbook } = await import("./excel-workbook");
      const workbook = createTableWorkbook(rows, all, title, visibleColumns);
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `VitalCare-${resource}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Không thể xuất Excel. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" disabled={busy}><Download />{busy ? "Đang xuất..." : "Xuất Excel"}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Tải xuống dạng Excel</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={busy} onSelect={() => void exportFile(false)}>
        <span className="flex flex-col">
          <span>{exportScopeLabel(false)}</span>
          <span className="text-muted-foreground text-xs">Các dòng và cột đang hiển thị</span>
        </span>
      </DropdownMenuItem>
      <DropdownMenuItem disabled={busy} onSelect={() => void exportFile(true)}>
        <span className="flex flex-col">
          <span>{exportScopeLabel(true)}</span>
          <span className="text-muted-foreground text-xs">Mọi kết quả khớp với bộ lọc hiện tại</span>
        </span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
