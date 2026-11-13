import ExcelJS from "exceljs";
import type { AuditEntry } from "./types";
import { AUDIT_ACTION_LABELS } from "./types";
import { humanizeResource } from "@/domains/permission/types";

export function createAuditWorkbook(records: AuditEntry[], all: boolean) {
  const book = new ExcelJS.Workbook();
  book.creator = "VitalCare";
  book.created = new Date();
  const sheet = book.addWorksheet("Nhật ký hoạt động", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  [8, 16, 25, 32, 26, 28, 18, 40].forEach((width, i) => { sheet.getColumn(i + 1).width = width; });
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = "VITALCARE • NHẬT KÝ HOẠT ĐỘNG";
  sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF007D83" } };
  sheet.getRow(1).height = 40;
  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = "Ngày xuất: " + new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + " • Giờ Việt Nam (UTC+7)";
  sheet.mergeCells("A3:H3");
  sheet.getCell("A3").value = `Phạm vi: ${all ? "Tất cả kết quả theo bộ lọc hiện tại" : "Trang đang xem"} • Tổng số bản ghi: ${records.length}`;
  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 24;
  sheet.getRow(5).values = ["STT", "Mã nhật ký", "Thời điểm (UTC+7)", "Người thực hiện", "Hành động", "Loại dữ liệu", "Mã bản ghi", "Địa chỉ IP"];
  sheet.getRow(5).height = 34;
  records.forEach((record, i) => {
    const time = new Date(record.occurredAt);
    const date = Number.isNaN(time.getTime()) ? record.occurredAt : new Date(time.getTime() + 7 * 60 * 60 * 1000);
    const row = sheet.addRow([i + 1, String(record.id), date,
      record.actorName ?? (record.actorId != null ? "#" + record.actorId : "Hệ thống"),
      AUDIT_ACTION_LABELS[record.action] ?? record.action, humanizeResource(record.entityType),
      record.entityId == null ? "—" : String(record.entityId), record.ipAddress ?? "—"]);
    row.height = Math.max(34, Math.ceil((record.actorName?.length ?? 0) / 28) * 16 + 12);
    row.getCell(3).numFmt = "dd/mm/yyyy hh:mm:ss";
    [2, 7, 8].forEach((c) => { row.getCell(c).numFmt = "@"; });
  });
  for (let r = 5; r <= sheet.rowCount; r++) {
    for (let c = 1; c <= 8; c++) {
      const cell = sheet.getCell(r, c);
      cell.font = { name: "Calibri", size: 11, bold: r === 5, color: { argb: r === 5 ? "FFFFFFFF" : "FF23484B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: r === 5 ? "FF008B91" : r % 2 === 0 ? "FFF0F8F7" : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "center" : "left", wrapText: true, indent: 1 };
      const edge = { style: "thin" as const, color: { argb: "FFCBDEDF" } };
      cell.border = { top: edge, bottom: edge, left: edge, right: edge };
    }
  }
  sheet.autoFilter = "A5:H" + Math.max(5, sheet.rowCount);
  sheet.pageSetup.printTitlesRow = "1:5";
  sheet.headerFooter.oddFooter = "&LVitalCare&RTrang &P / &N";
  return book;
}
