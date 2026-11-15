import { createTableWorkbook } from "@/shared/components/data-table/excel-workbook";
import { cellText, type ReportSpec, type SummaryReport } from "@/domains/reports/types";

export function createSummaryWorkbook(report: SummaryReport, spec: ReportSpec) {
  const book = createTableWorkbook(report.rows, true, `Báo cáo ${spec.label.toLowerCase()}`, spec.columns.map((column) => ({
    label: column.label,
    width: column.format === "number" ? 24 : column.format === "datetime" ? 28 : 30,
    numFmt: column.format === "number" ? "#,##0.0#" : "@",
    value: (row: Record<string, unknown>) => {
      const value = row[column.key];
      if (value == null || value === "") return "—";
      return column.format === "number" ? Number(value) : cellText(value, column.format);
    },
  })));
  const details = book.worksheets[0];
  details.name = "Chi tiết";
  const scope = `Từ ${cellText(report.from, "date")} đến ${cellText(report.to, "date")} • ${report.rows.length} dòng chi tiết`;
  details.getCell("A3").value = scope;
  const summary = book.addWorksheet("Tổng hợp", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
    pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  summary.getColumn(1).width = 48;
  summary.getColumn(2).width = 32;
  [ `VITALCARE • BÁO CÁO ${spec.label.toLocaleUpperCase("vi-VN")}`, scope, details.getCell("A2").value as string, spec.description ].forEach((text, i) => {
    summary.mergeCells(i + 1, 1, i + 1, 2);
    const cell = summary.getCell(i + 1, 1);
    cell.value = text;
    cell.font = { name: "Calibri", size: i === 0 ? 18 : 11, bold: i === 0, color: { argb: "FF007D83" } };
    cell.alignment = { wrapText: true, vertical: "middle" };
    summary.getRow(i + 1).height = i === 0 || i === 3 ? 45 : 30;
  });
  summary.getRow(5).values = ["Chỉ tiêu", "Giá trị"];
  spec.figures.forEach((figure) => summary.addRow([figure.label, report.summary[figure.key] == null ? "—" : Number(report.summary[figure.key])]));
  for (let row = 5; row <= summary.rowCount; row++) {
    summary.getRow(row).height = 36;
    for (let col = 1; col <= 2; col++) {
      const cell = summary.getCell(row, col);
      cell.font = { name: "Calibri", size: 12, bold: row === 5, color: { argb: row === 5 ? "FFFFFFFF" : "FF23484B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row === 5 ? "FF008B91" : row % 2 === 0 ? "FFF0F8F7" : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: col === 2 ? "right" : "left", wrapText: true, indent: 1 };
      if (col === 2 && row > 5) cell.numFmt = "#,##0.0#";
    }
  }
  summary.pageSetup.printTitlesRow = "1:5";
  summary.headerFooter.oddFooter = "&LVitalCare&RTrang &P / &N";
  return book;
}
