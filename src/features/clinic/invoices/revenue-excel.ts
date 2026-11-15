import ExcelJS from "exceljs";
import type { RevenueReport } from "@/domains/billing/types";

const keys = ["invoices", "paidInvoices", "consultationRevenue", "serviceRevenue", "totalRevenue", "unpaidInvoices", "unpaidAmount"] as const;
const dateLabel = (date: string) => date.split("-").reverse().join("/");

export function createRevenueWorkbook(report: RevenueReport, period: string, label: string) {
  const book = new ExcelJS.Workbook();
  book.creator = "VitalCare";
  book.created = new Date();
  book.title = `Báo cáo doanh thu - ${label}`;
  const days = [...report.days].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const details = days.map(day => ({ label: dateLabel(day.date ?? ""), values: keys.map(key => Number(day[key])) }));
  const groups = new Map<string, number[]>();
  for (const day of days) {
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
    const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 7, showGridLines: false }], pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    sheet.columns = [26, 16, 18, 23, 23, 25, 18, 25].map(width => ({ width }));
    ["VITALCARE • BÁO CÁO DOANH THU", label, `Từ ${dateLabel(report.from)} đến ${dateLabel(report.to)} · Đơn vị: VNĐ`,
      `Ngày xuất: ${book.created.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (UTC+7)`,
      "Theo ngày lập hóa đơn. Doanh thu chỉ tính hóa đơn đã thanh toán; chưa thu được thống kê riêng.",
    ].forEach((text, i) => {
      sheet.mergeCells(i + 1, 1, i + 1, 8);
      const cell = sheet.getCell(i + 1, 1);
      cell.value = text;
      cell.font = { name: "Calibri", size: i === 0 ? 18 : 12, bold: i < 2, color: { argb: "FF155E63" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      sheet.getRow(i + 1).height = i === 0 ? 42 : 28;
    });
    sheet.getRow(7).values = [name === "Tổng hợp" ? "Kỳ báo cáo" : "Ngày", "Tổng số\nhóa đơn", "Hóa đơn\nđã thanh toán", "Đã thu phí khám\n(VNĐ)", "Đã thu dịch vụ\n(VNĐ)", "Tổng đã thu\n(VNĐ)", "Hóa đơn\nchưa thanh toán", "Chưa thu\n(VNĐ)"];
    rows.forEach(row => sheet.addRow([row.label, ...row.values]));
    const total = sheet.addRow(["TỔNG CỘNG", ...keys.map(key => Number(report.total[key]))]);
    for (let n = 7; n <= total.number; n++) {
      const row = sheet.getRow(n);
      row.height = n === 7 ? 44 : 34;
      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        const edge = { style: "thin" as const, color: { argb: "FF9CBFC1" } };
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };
        cell.alignment = { vertical: "middle", horizontal: n === 7 ? "center" : c === 1 ? "left" : "right", wrapText: true, indent: 1 };
        cell.font = { name: "Calibri", size: 11, bold: n === 7 || n === total.number, color: { argb: n === 7 ? "FFFFFFFF" : "FF163D40" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: n === 7 ? "FF007F86" : n === total.number ? "FFDDF2EE" : n % 2 === 0 ? "FFF3F8F8" : "FFFFFFFF" } };
        if (c > 1 && n > 7) cell.numFmt = "#,##0";
      }
    }
    sheet.autoFilter = `A7:H${Math.max(7, total.number - 1)}`;
    sheet.pageSetup.printTitlesRow = "1:7";
    sheet.pageSetup.printArea = `A1:H${total.number}`;
    sheet.headerFooter.oddFooter = "&LVitalCare • Báo cáo doanh thu&RTrang &P / &N";
  }
  return book;
}
