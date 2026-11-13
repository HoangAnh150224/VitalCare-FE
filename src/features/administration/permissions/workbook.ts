import ExcelJS from "exceljs";
import { humanizeResource, splitPermissionCode, type Permission } from "@/domains/permission/types";
import { actionLabel } from "@/domains/row-level-policy/types";

export function createPermissionWorkbook(records: Permission[], all: boolean) {
  const book = new ExcelJS.Workbook();
  book.creator = "VitalCare";
  book.created = new Date();
  const sheet = book.addWorksheet("Danh sách quyền", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const widths = [8, 34, 30, 24, 38, 62, 20];
  widths.forEach((width, i) => { sheet.getColumn(i + 1).width = width; });
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "VITALCARE • DANH SÁCH QUYỀN";
  sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF007D83" } };
  sheet.getRow(1).height = 40;
  sheet.mergeCells("A2:G2");
  sheet.getCell("A2").value = "Ngày xuất: " + new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + " • Giờ Việt Nam (UTC+7)";
  sheet.mergeCells("A3:G3");
  sheet.getCell("A3").value = `Phạm vi: ${all ? "Tất cả kết quả theo bộ lọc hiện tại" : "Trang đang xem"} • Tổng số quyền: ${records.length}`;
  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 24;
  sheet.getRow(5).values = ["STT", "Mã quyền", "Tài nguyên", "Hành động", "Tên quyền", "Mô tả", "Quyền hệ thống"];
  sheet.getRow(5).height = 34;
  records.forEach((record, i) => {
    const { resource, action } = splitPermissionCode(record.code);
    const values = [i + 1, record.code, humanizeResource(resource), actionLabel(action),
      record.name, record.description ?? "—", record.systemPermission ? "Có" : "Không"];
    const row = sheet.addRow(values);
    const lines = values.map((value, col) => String(value).split("\n")
      .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / (widths[col] - 4))), 0));
    row.height = Math.max(34, Math.max(...lines) * 16 + 12);
    row.getCell(2).numFmt = "@";
  });
  for (let r = 5; r <= sheet.rowCount; r++) {
    for (let c = 1; c <= 7; c++) {
      const cell = sheet.getCell(r, c);
      cell.font = { name: "Calibri", size: 11, bold: r === 5, color: { argb: r === 5 ? "FFFFFFFF" : "FF23484B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: r === 5 ? "FF008B91" : r % 2 === 0 ? "FFF0F8F7" : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: c === 1 || c === 7 ? "center" : "left", wrapText: true, indent: 1 };
      const edge = { style: "thin" as const, color: { argb: "FFCBDEDF" } };
      cell.border = { top: edge, bottom: edge, left: edge, right: edge };
    }
  }
  sheet.autoFilter = "A5:G" + Math.max(5, sheet.rowCount);
  sheet.pageSetup.printTitlesRow = "1:5";
  sheet.headerFooter.oddFooter = "&LVitalCare&RTrang &P / &N";
  return book;
}
