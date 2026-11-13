import { useState } from "react";
import { useDataProvider } from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import { EMPLOYEE_STATUS_LABELS, STAFF_TYPE_LABELS, type Employee } from "@/domains/employee/types";

export function StaffExport({ table, clinicName, adminsOnly }: {
  table: UseTableReturnType<Employee, HttpError>;
  clinicName: (id: string | null) => string;
  adminsOnly: boolean;
}) {
  const provider = useDataProvider();
  const [busy, setBusy] = useState(false);
  async function exportFile(all: boolean) {
    setBusy(true);
    try {
      let records: Employee[] = [];
      if (all) {
        for (let currentPage = 1; ; currentPage++) {
          const result = await provider().getList<Employee>({
            resource: "employees", filters: table.refineCore.filters,
            sorters: table.refineCore.sorters,
            pagination: { currentPage, pageSize: 200, mode: "server" },
          });
          records.push(...result.data);
          if (!result.data.length || records.length >= result.total) break;
        }
      } else records = table.reactTable.getRowModel().rows.map((row) => row.original);
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "VitalCare";
      const sheet = workbook.addWorksheet("Danh sách nhân viên", {
        views: [{ state: "frozen", ySplit: 5 }],
        pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });
      const title = adminsOnly ? "DANH SÁCH QUẢN TRỊ PHÒNG KHÁM" : "DANH SÁCH NHÂN VIÊN";
      const widths = [8, 20, 32, 20, 26, 34, 23];
      widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
      sheet.mergeCells("A1:G1");
      sheet.getCell("A1").value = "VITALCARE • " + title;
      sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF006B70" } };
      sheet.getRow(1).height = 38;
      sheet.mergeCells("A2:G2");
      sheet.getCell("A2").value = "Ngày xuất: " + new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      sheet.mergeCells("A3:G3");
      sheet.getCell("A3").value = `Phạm vi: ${all ? "Tất cả kết quả theo bộ lọc hiện tại" : "Trang đang xem"}  •  Tổng số: ${records.length}`;
      sheet.getRow(2).height = 24;
      sheet.getRow(3).height = 24;
      sheet.getRow(5).values = ["STT", "Mã nhân viên", "Họ và tên", "Số điện thoại", "Loại nhân viên", "Phòng khám", "Trạng thái"];
      sheet.getRow(5).height = 32;
      records.forEach((record, index) => {
        const row = sheet.addRow([index + 1, record.employeeCode, record.fullName,
          record.phone?.replace(/^\+84(?=\d{9}$)/, "0") ?? "",
          STAFF_TYPE_LABELS[record.staffType], clinicName(record.clinicId), EMPLOYEE_STATUS_LABELS[record.status]]);
        row.height = Math.max(32, Math.ceil(Math.max(record.fullName.length / 28, clinicName(record.clinicId).length / 30)) * 16 + 12);
        row.getCell(4).numFmt = "@";
      });
      for (let r = 5; r <= sheet.rowCount; r++) {
        for (let c = 1; c <= 7; c++) {
          const cell = sheet.getCell(r, c);
          cell.font = { name: "Calibri", size: 11, bold: r === 5, color: { argb: r === 5 ? "FFFFFFFF" : "FF23484B" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: r === 5 ? "FF008B91" : r % 2 === 0 ? "FFF0F8F7" : "FFFFFFFF" } };
          cell.alignment = { vertical: "middle", horizontal: c === 1 ? "center" : "left", wrapText: true, indent: 1 };
          const edge = { style: "thin" as const, color: { argb: "FFCBDEDF" } };
          cell.border = { top: edge, bottom: edge, left: edge, right: edge };
        }
      }
      sheet.autoFilter = "A5:G" + Math.max(5, sheet.rowCount);
      sheet.pageSetup.printTitlesRow = "1:5";
      sheet.headerFooter.oddFooter = "&LVitalCare&RTrang &P / &N";
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "VitalCare-danh-sach-nhan-vien.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Không thể xuất Excel. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" disabled={busy}><Download />{busy ? "Đang xuất..." : "Xuất Excel"}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={() => void exportFile(false)}>Trang đang xem</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void exportFile(true)}>Tất cả kết quả theo bộ lọc</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
