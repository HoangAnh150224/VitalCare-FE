import ExcelJS from "exceljs";

export function createTableWorkbook<T>(records: T[], all: boolean, title: string,
  columns: { label: string; width: number; value: (row: T) => string | number }[]) {
  const book = new ExcelJS.Workbook();
  book.creator = "VitalCare";
  const sheet = book.addWorksheet(title.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const widths = [8, ...columns.map((c) => c.width)];
  widths.forEach((width, i) => { sheet.getColumn(i + 1).width = width; });
  for (let r = 1; r <= 3; r++) sheet.mergeCells(r, 1, r, widths.length);
  sheet.getCell(1, 1).value = "VITALCARE • " + title.toLocaleUpperCase("vi-VN");
  sheet.getCell(1, 1).font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF007D83" } };
  sheet.getRow(1).height = 40;
  sheet.getCell(2, 1).value = "Ngày xuất: " + new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + " (UTC+7)";
  sheet.getCell(3, 1).value = `Phạm vi: ${all ? "Tất cả kết quả theo bộ lọc hiện tại" : "Trang đang xem"} • Tổng số: ${records.length}`;
  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 24;
  sheet.getRow(5).values = ["STT", ...columns.map((c) => c.label)];
  sheet.getRow(5).height = 34;
  records.forEach((record, i) => {
    const values = [i + 1, ...columns.map((c) => c.value(record))];
    const row = sheet.addRow(values);
    const lines = values.map((value, col) => String(value).split("\n").reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / (widths[col] - 4))), 0));
    row.height = Math.min(409, Math.max(34, Math.max(...lines) * 16 + 12));
  });
  for (let r = 5; r <= sheet.rowCount; r++) for (let c = 1; c <= widths.length; c++) {
    const cell = sheet.getCell(r, c);
    cell.font = { name: "Calibri", size: 11, bold: r === 5, color: { argb: r === 5 ? "FFFFFFFF" : "FF23484B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: r === 5 ? "FF008B91" : r % 2 === 0 ? "FFF0F8F7" : "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: c === 1 ? "center" : "left", wrapText: true, indent: 1 };
    const edge = { style: "thin" as const, color: { argb: "FFCBDEDF" } };
    cell.border = { top: edge, bottom: edge, left: edge, right: edge };
  }
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, sheet.rowCount), column: widths.length } };
  sheet.pageSetup.printTitlesRow = "1:5";
  sheet.headerFooter.oddFooter = "&LVitalCare&RTrang &P / &N";
  return book;
}
