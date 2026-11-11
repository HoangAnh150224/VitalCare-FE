import ExcelJS from "exceljs";
import type { RevenueReport } from "@/domains/billing/types";

const keys = ["invoices", "paidInvoices", "consultationRevenue", "serviceRevenue", "totalRevenue", "unpaidInvoices", "unpaidAmount"] as const;
const dateLabel = (date: string) => date.split("-").reverse().join("/");

export function createRevenueWorkbook(report: RevenueReport, period: string, label: string) {
  const book = new ExcelJS.Workbook();
  book.creator = "VitalCare";
  const details = report.days.map(day => ({ label: dateLabel(day.date ?? ""), values: keys.map(key => Number(day[key])) }));
  const groups = new Map<string, number[]>();
  for (const day of report.days) {
    if (!day.date) continue;
    const month = Number(day.date.slice(5, 7));
    const group = period === "year" ? `Quý ${Math.ceil(month / 3)}/${day.date.slice(0, 4)}`
      : period === "quarter" ? `Tháng ${month}/${day.date.slice(0, 4)}` : label;
    const values = groups.get(group) ?? keys.map(() => 0);
    keys.forEach((key, i) => { values[i] += Number(day[key]); });
    groups.set(group, values);
  }
  const summary = Array.from(groups, ([label, values]) => ({ label, values }));
  for (const [name, rows] of [["Tổng hợp", summary], ["Chi tiết theo ngày", details]] as const) {
    const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 5 }], pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    sheet.columns = [26, 16, 18, 23, 23, 25, 18, 25].map(width => ({ width }));
    ["BÁO CÁO DOANH THU", label, `Từ ${dateLabel(report.from)} đến ${dateLabel(report.to)} · Đơn vị: VNĐ`].forEach((text, i) => {
      sheet.mergeCells(i + 1, 1, i + 1, 8);
      const cell = sheet.getCell(i + 1, 1);
      cell.value = text;
      cell.font = { name: "Calibri", size: i === 0 ? 18 : 12, bold: i < 2, color: { argb: "FF155E63" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      sheet.getRow(i + 1).height = 30;
    });
    sheet.getRow(5).values = [name === "Tổng hợp" ? "Kỳ báo cáo" : "Ngày", "Tổng số\nhóa đơn", "Hóa đơn\nđã thanh toán", "Phí khám\n(VNĐ)", "Phí dịch vụ\n(VNĐ)", "Tổng đã thu\n(VNĐ)", "Hóa đơn\nchưa thanh toán", "Chưa thu\n(VNĐ)"];
    rows.forEach(row => sheet.addRow([row.label, ...row.values]));
    const total = sheet.addRow(["TỔNG CỘNG", ...keys.map(key => Number(report.total[key]))]);
    for (let n = 5; n <= total.number; n++) {
      const row = sheet.getRow(n);
      row.height = n === 5 ? 44 : 34;
      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        const edge = { style: "thin" as const, color: { argb: "FF9CBFC1" } };
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };
        cell.alignment = { vertical: "middle", horizontal: n === 5 ? "center" : c === 1 ? "left" : "right", wrapText: true };
        cell.font = { name: "Calibri", size: 11, bold: n === 5 || n === total.number, color: { argb: n === 5 ? "FFFFFFFF" : "FF163D40" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: n === 5 ? "FF007F86" : n === total.number ? "FFDDF2EE" : n % 2 === 0 ? "FFF3F8F8" : "FFFFFFFF" } };
        if (c > 1 && n > 5) cell.numFmt = "#,##0";
      }
    }
    sheet.autoFilter = "A5:H5";
    sheet.pageSetup.printTitlesRow = "1:5";
  }
  return book;
}
