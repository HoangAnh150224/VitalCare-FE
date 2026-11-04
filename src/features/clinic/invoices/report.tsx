import { useCustom } from "@refinedev/core";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { download, toCsv } from "@/shared/components/data-table/data-table-actions";
import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { customResult } from "@/shared/hooks/use-custom-result";
import type { RevenueReport } from "@/domains/billing/types";
import { formatLocalDate, formatMoney } from "@/shared/lib/format";

/** `YYYY-MM-DD` in the browser's own day, which is the clinic's. */
const isoDay = (date: Date) => date.toLocaleDateString("sv-SE");

/**
 * The clinic's revenue over a period (Report 1 FE-23): examination and
 * service fees collected, what is still owed, per day, and as a CSV.
 */
export const RevenueReportPage = () => {
  const today = new Date();
  const [from, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(isoDay(today));
  const valid = Boolean(from && to && from <= to);

  const { result, query } = useCustom<RevenueReport>({
    url: `${API_URL}/invoices/report`,
    method: "get",
    config: { query: { from, to } },
    queryOptions: { enabled: valid },
  });
  const report = customResult(result?.data, "total");

  const exportCsv = () => {
    if (!report) return;
    const head = ["Ngày", "Số hóa đơn", "Đã thu", "Phí khám", "Phí dịch vụ", "Tổng đã thu", "Chưa thu (HĐ)", "Chưa thu (đồng)"];
    const row = (label: string, day: RevenueReport["total"]) => [
      label,
      String(day.invoices),
      String(day.paidInvoices),
      String(day.consultationRevenue),
      String(day.serviceRevenue),
      String(day.totalRevenue),
      String(day.unpaidInvoices),
      String(day.unpaidAmount),
    ];
    download(
      `doanh-thu-${report.from}-${report.to}.csv`,
      toCsv([head, ...report.days.map((day) => row(day.date ?? "", day)), row("Tổng", report.total)]),
    );
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
            <Label htmlFor="report-from">Từ ngày</Label>
            <Input id="report-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-to">Đến ngày</Label>
            <Input id="report-to" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!report} className="ms-auto">
            <DownloadIcon />
            Xuất CSV
          </Button>
        </div>
        {!valid && <p className="text-destructive px-6 pt-2 text-sm">Ngày bắt đầu phải trước ngày kết thúc.</p>}
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
