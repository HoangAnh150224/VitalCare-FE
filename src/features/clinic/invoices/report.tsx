import { useCustom } from "@refinedev/core";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";

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

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    if (!report || !valid || query.isFetching) return;
    setExporting(true);
    try {
      const label = period === "month" ? `Tháng ${month}/${year}` : period === "quarter" ? `Quý ${quarter}/${year}` : period === "year" ? `Năm ${year}` : "Theo khoảng ngày";
      const { createRevenueWorkbook } = await import("./revenue-excel");
      const buffer = await createRevenueWorkbook(report, period, label).xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `doanh-thu-${report.from}-${report.to}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Không xuất được Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <ListView>
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
          <Button variant="outline" onClick={exportExcel} disabled={exporting || !valid || query.isFetching || !report} className="ms-auto">
            <DownloadIcon />
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </Button>
        </div>
        {valid && <p className="text-muted-foreground px-6 pt-2 text-sm">Từ {formatLocalDate(from)} đến {formatLocalDate(to)}</p>}
        {!valid && <p className="text-destructive px-6 pt-2 text-sm">{period === "custom" ? "Vui lòng chọn khoảng ngày hợp lệ, ngày bắt đầu không sau ngày kết thúc." : "Nhập năm hợp lệ từ 1900 đến 9999."}</p>}
      </Card>

      <LoadingOverlay loading={query.isLoading}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Tổng đã thu" value={formatMoney(report?.total.totalRevenue)} note={`${report?.total.paidInvoices ?? 0} hóa đơn`} />
          <Figure label="Phí khám" value={formatMoney(report?.total.consultationRevenue)} />
          <Figure label="Phí dịch vụ" value={formatMoney(report?.total.serviceRevenue)} />
          <Figure
            label="Chưa thu"
            value={formatMoney(report?.total.unpaidAmount)}
            note={`${report?.total.unpaidInvoices ?? 0} hóa đơn`}
          />
        </div>
      </LoadingOverlay>

      <DetailPanel title="Theo ngày">
        {report && report.days.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 text-right font-medium">Hóa đơn</th>
                  <th className="px-4 py-2 text-right font-medium">Phí khám</th>
                  <th className="px-4 py-2 text-right font-medium">Phí dịch vụ</th>
                  <th className="px-4 py-2 text-right font-medium">Đã thu</th>
                  <th className="px-4 py-2 text-right font-medium">Chưa thu</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {report.days.map((day) => (
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
        ) : (
          <p className="text-muted-foreground px-4 py-6 text-sm">Không có hóa đơn nào trong khoảng ngày này.</p>
        )}
      </DetailPanel>
    </ListView>
  );
};

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="gap-1 px-5 py-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {note && <span className="text-muted-foreground text-xs">{note}</span>}
    </Card>
  );
}
