import { useState } from "react";
import { useDataProvider, type HttpError } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import type { AuditEntry } from "./types";

export function AuditExport({ table }: { table: UseTableReturnType<AuditEntry, HttpError> }) {
  const provider = useDataProvider();
  const [busy, setBusy] = useState(false);
  async function exportFile(all: boolean) {
    setBusy(true);
    try {
      let rows: AuditEntry[] = [];
      if (all) {
        for (let currentPage = 1; ; currentPage++) {
          const result = await provider().getList<AuditEntry>({
            resource: "audit_logs", filters: table.refineCore.filters, sorters: table.refineCore.sorters,
            pagination: { currentPage, pageSize: 200, mode: "server" },
          });
          rows.push(...result.data);
          if (!result.data.length || rows.length >= result.total) break;
        }
      } else rows = table.reactTable.getRowModel().rows.map((row) => row.original);
      const { createAuditWorkbook } = await import("./workbook");
      const workbook = createAuditWorkbook(rows, all);
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "VitalCare-nhat-ky-hoat-dong.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Không thể xuất nhật ký. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" disabled={busy}><Download />{busy ? "Đang xuất..." : "Xuất Excel"}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={() => void exportFile(false)}>Trang đang xem</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void exportFile(true)}>Tất cả kết quả theo bộ lọc</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
