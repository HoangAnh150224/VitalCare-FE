import { useCustom } from "@refinedev/core";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { toast } from "sonner";
import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { clinicToday } from "../appointments/clinic-day";
import { customResult } from "@/shared/hooks/use-custom-result";
import type { RevenueReport } from "@/domains/billing/types";
import { formatLocalDate, formatMoney } from "@/shared/lib/format";

/** Days shown per page of the table. */
const PAGE_SIZES = [10, 20, 31];

/** `YYYY-MM-DD` in the browser's own day, which is the clinic's. */
const isoDay = (date: Date) => date.toLocaleDateString("sv-SE");

/**
 * The clinic's revenue over a period (Report 1 FE-23): examination and
 * service fees collected, what is still owed, per day, and as an Excel workbook.
 */
export const RevenueReportPage = () => {
  const today = new Date(`${clinicToday()}T12:00:00`);
  const [period, setPeriod] = useState("month");
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [quarter, setQuarter] = useState(String(Math.floor(today.getMonth() / 3) + 1));
  const [customFrom, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [customTo, setTo] = useState(isoDay(today));
  const validYear = /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 9999;
  const startMonth = period === "year" ? 0 : period === "quarter" ? (Number(quarter) - 1) * 3 : Number(month) - 1;
  const months = period === "year" ? 12 : period === "quarter" ? 3 : 1;
  const from = period === "custom" ? customFrom : validYear ? isoDay(new Date(Number(year), startMonth, 1)) : "";
  const to = period === "custom" ? customTo : validYear ? isoDay(new Date(Number(year), startMonth + months, 0)) : "";
  const valid = Boolean(from && to && from <= to);

  const { result, query } = useCustom<RevenueReport>({
    url: `${API_URL}/invoices/report`,
    method: "get",
    config: { query: { from, to } },
    queryOptions: { enabled: valid },
  });
  const report = customResult(result?.data, "total");
  const days = report?.days ?? [];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(days.length / pageSize));
  // A new period or page size starts again from its first page.
  useEffect(() => setPage(0), [from, to, pageSize]);
  const current = Math.min(page, pages - 1);
  const shown = days.slice(current * pageSize, (current + 1) * pageSize);

  const [exporting, setExporting] = useState(false);
  const [downloadFile, setDownloadFile] = useState<{ url: string; name: string; from: string; to: string } | null>(null);
  useEffect(() => () => { if (downloadFile) URL.revokeObjectURL(downloadFile.url); }, [downloadFile]);
  const exportExcel = async () => {
    if (!report || !valid || query.isFetching || query.isError || exporting) return;
    setExporting(true);
    try {
      const label = period === "month" ? `Tháng ${month}/${year}` : period === "quarter" ? `Quý ${quarter}/${year}` : period === "year" ? `Năm ${year}` : "Theo khoảng ngày";
      const { createRevenueWorkbook } = await import("./revenue-excel");
      const buffer = await createRevenueWorkbook(report, period, label).xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const name = `doanh-thu-${report.from}-${report.to}.xlsx`;
      setDownloadFile({ url, name, from: report.from, to: report.to });
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("Không xuất được Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };
  return (
    // On a screen tall enough, the page is exactly one screen high: title, filters and the period
    // totals stay where they are and only the days scroll, inside their own panel, under a fixed
    // column header. On small or short screens everything scrolls with the page as usual.
    <ListView className="[@media(min-width:768px)_and_(min-height:640px)]:h-[calc(100dvh_-_4rem_-_2*var(--shell-gutter-y))]">
      <div className="flex shrink-0 flex-col gap-4">
      <ListViewHeader
        resource="invoices"
        title="Báo cáo doanh thu"
        canCreate={false}
        description="Theo ngày lập hóa đơn, tại cơ sở của bạn. Doanh thu tính trên hóa đơn đã thanh toán."
      />

      <Card className="py-4">
        <div className="flex flex-wrap items-end gap-4 px-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-period">Xem theo</Label>
            <Select value={period} onValueChange={(value) => {
              if (value === "custom") {
                setFrom(from);
                setTo(to);
              }
              setPeriod(value);
            }}>
              <SelectTrigger id="report-period" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Tháng</SelectItem>
                <SelectItem value="quarter">Quý</SelectItem>
                <SelectItem value="year">Năm</SelectItem>
                <SelectItem value="custom">Từ ngày đến ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === "month" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-month">Tháng</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="report-month" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>Tháng {i + 1}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {period === "quarter" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-quarter">Quý</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger id="report-quarter" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Quý {q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {period !== "custom" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-year">Năm</Label>
              <Input id="report-year" className="w-32" type="number" min={1900} max={9999} step={1} value={year} onChange={(event) => setYear(event.target.value)} />
            </div>
          )}
          {period === "custom" && <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-from">Từ ngày</Label>
            <Input id="report-from" type="date" value={from} max={to} onChange={(event) => {
              setFrom(event.target.value);
              setTo(to);
              setPeriod("custom");
            }} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-to">Đến ngày</Label>
            <Input id="report-to" type="date" value={to} min={from} onChange={(event) => {
              setFrom(from);
              setTo(event.target.value);
              setPeriod("custom");
            }} />
          </div>
          </>}
          <Button variant="outline" onClick={exportExcel} disabled={exporting || !valid || query.isFetching || query.isError || !report} className="ms-auto">
            <DownloadIcon />
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </Button>
        </div>
        {downloadFile && downloadFile.from === from && downloadFile.to === to && <div className="flex flex-wrap items-center gap-3 px-6 pt-3">
          <span className="text-sm text-muted-foreground">File Excel đã tạo. Nếu chưa tự tải xuống:</span>
          <Button variant="outline" size="sm" asChild><a href={downloadFile.url} download={downloadFile.name}>Tải file đã tạo</a></Button>
        </div>}
        {query.isError && <div role="alert" className="px-6 pt-3 text-destructive">Không tải được dữ liệu báo cáo nên chưa thể xuất Excel. <Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></div>}
        {valid && <p className="text-muted-foreground px-6 pt-2 text-sm">Từ {formatLocalDate(from)} đến {formatLocalDate(to)}</p>}
        {!valid && <p className="text-destructive px-6 pt-2 text-sm">{period === "custom" ? "Vui lòng chọn khoảng ngày hợp lệ, ngày bắt đầu không sau ngày kết thúc." : "Nhập năm hợp lệ từ 1900 đến 9999."}</p>}
      </Card>

        <LoadingOverlay loading={query.isLoading}>
          <Card className="border-primary/30 gap-0 py-0">
            <div className="text-muted-foreground border-b px-5 py-2 text-xs font-semibold uppercase tracking-wide">
              Tổng hợp {valid ? `· ${formatLocalDate(from)} – ${formatLocalDate(to)}` : ""}
            </div>
            <div className="grid grid-cols-2 divide-y sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              <Figure label="Tổng đã thu" value={formatMoney(report?.total.totalRevenue)} note={`${report?.total.paidInvoices ?? 0} hóa đơn`} strong />
              <Figure label="Phí khám" value={formatMoney(report?.total.consultationRevenue)} />
              <Figure label="Phí dịch vụ" value={formatMoney(report?.total.serviceRevenue)} />
              <Figure label="Chưa thu" value={formatMoney(report?.total.unpaidAmount)} note={`${report?.total.unpaidInvoices ?? 0} hóa đơn`} />
            </div>
          </Card>
        </LoadingOverlay>
      </div>

      <DetailPanel title="Theo ngày" className="[@media(min-width:768px)_and_(min-height:640px)]:min-h-0 [@media(min-width:768px)_and_(min-height:640px)]:flex-1" bodyClassName="[@media(min-width:768px)_and_(min-height:640px)]:flex [@media(min-width:768px)_and_(min-height:640px)]:min-h-0 [@media(min-width:768px)_and_(min-height:640px)]:flex-1 [@media(min-width:768px)_and_(min-height:640px)]:flex-col">
        {report && days.length > 0 ? (
          <>
          <div className="overflow-x-auto [@media(min-width:768px)_and_(min-height:640px)]:min-h-0 [@media(min-width:768px)_and_(min-height:640px)]:flex-1 [@media(min-width:768px)_and_(min-height:640px)]:overflow-y-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-muted-foreground bg-card sticky top-0 z-10 text-left shadow-[inset_0_-1px_0_var(--border)]">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 text-right font-medium">Hóa đơn</th>
                  <th className="px-4 py-2 text-right font-medium">Phí khám</th>
                  <th className="px-4 py-2 text-right font-medium">Phí dịch vụ</th>
                  <th className="px-4 py-2 text-right font-medium">Đã thu</th>
                  <th className="px-4 py-2 text-right font-medium">Chưa thu</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {shown.map((day) => (
                  <tr key={day.date} className="border-b last:border-0">
                    <td className="px-4 py-2">{formatLocalDate(day.date)}</td>
                    <td className="px-4 py-2 text-right">
                      {day.paidInvoices}/{day.invoices}
                    </td>
                    <td className="px-4 py-2 text-right">{formatMoney(day.consultationRevenue)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(day.serviceRevenue)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatMoney(day.totalRevenue)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(day.unpaidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground tabular-nums">
              Hiển thị {current * pageSize + 1}–{current * pageSize + shown.length} trên {days.length} ngày
            </span>
            <div className="flex items-center gap-2">
              <Label htmlFor="report-page-size" className="text-muted-foreground font-normal">Số dòng</Label>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger id="report-page-size" size="sm" className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="size-8" aria-label="Trang trước" disabled={current === 0} onClick={() => setPage(current - 1)}>
                <ChevronLeftIcon />
              </Button>
              <span className="tabular-nums">Trang {current + 1}/{pages}</span>
              <Button variant="outline" size="icon" className="size-8" aria-label="Trang sau" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
          </>
        ) : (
          <p className="text-muted-foreground px-4 py-6 text-sm">Không có hóa đơn nào trong khoảng ngày này.</p>
        )}
      </DetailPanel>
    </ListView>
  );
};

function Figure({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={strong ? "text-primary text-2xl font-semibold tabular-nums" : "text-xl font-semibold tabular-nums"}>{value}</span>
      {note && <span className="text-muted-foreground text-xs">{note}</span>}
    </div>
  );
}
