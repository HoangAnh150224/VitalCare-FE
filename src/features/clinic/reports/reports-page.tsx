import { useCan, useNotification } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  cellText,
  REPORTS,
  reportErrorText,
  vnDay,
  type ReportKind,
  type SummaryReport,
} from "@/domains/reports/types";
import { ClinicPicker } from "./clinic-picker";

/**
 * BF-08's summary reports: patients, devices, vital signs and alerts over a
 * period, for the viewer's clinic; exported as Excel by those allowed to.
 */
export const ReportsPage = () => {
  const [kind, setKind] = useState<ReportKind>("patients");
  // From the first of this month to today, in the clinic's days whatever the browser's zone.
  const [from, setFrom] = useState(`${vnDay().slice(0, 8)}01`);
  const [to, setTo] = useState(vnDay());
  const [clinicId, setClinicId] = useState("");
  const [exporting, setExporting] = useState(false);
  const { data: canExport } = useCan({ resource: "reports", action: "export" });
  const { open: notify } = useNotification();
  const spec = REPORTS.find((r) => r.kind === kind)!;
  const valid = Boolean(from && to && from <= to);
  const searchParams = { from, to, ...(clinicId ? { clinicId } : {}) };

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", kind, from, to, clinicId],
    queryFn: () => kyInstance.get(`reports/${kind}`, { searchParams }).json<SummaryReport>(),
    enabled: valid,
    retry: false,
  });

  const exportExcel = async () => {
    if (!valid || exporting || !data || error) return;
    setExporting(true);
    try {
      // Asked of the server first: it holds the export to its permission and keeps a record of it.
      const report = await kyInstance.post(`reports/${kind}/export`, { searchParams }).json<SummaryReport>();
      const { createSummaryWorkbook } = await import("./report-excel");
      const buffer = await createSummaryWorkbook(report, spec).xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `VitalCare-bao-cao-${kind}-${report.from}-${report.to}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      notify?.({ type: "error", message: reportErrorText((e as { data?: unknown }).data ?? e) });
    } finally { setExporting(false); }
  };

  return (
    <ListView>
      <ListViewHeader resource="reports" title="Báo cáo tổng hợp" canCreate={false} description={spec.description} />

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Loại báo cáo">
        {REPORTS.map((r) => (
          <Button
            key={r.kind}
            role="tab"
            aria-selected={kind === r.kind}
            size="sm"
            variant={kind === r.kind ? "default" : "outline"}
            onClick={() => setKind(r.kind)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <Card className="py-4">
        <div className="flex flex-wrap items-end gap-4 px-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-from">Từ ngày</Label>
            <Input id="report-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-to">Đến ngày</Label>
            <Input id="report-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <ClinicPicker value={clinicId} onChange={setClinicId} answeredClinicId={data?.clinicId} />
          {canExport?.can && (
            <Button variant="outline" onClick={() => void exportExcel()} disabled={!data || !valid || Boolean(error) || exporting} className="ms-auto">
              <DownloadIcon />
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </Button>
          )}
        </div>
        {!valid && <p className="text-destructive px-6 pt-2 text-sm">Ngày bắt đầu phải trước ngày kết thúc.</p>}
        {error && (
          <p role="alert" className="text-destructive px-6 pt-2 text-sm">
            {reportErrorText((error as { data?: unknown }).data ?? error)}
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {spec.figures.map((f) => (
          <Card key={f.key} className="gap-1 px-5 py-4" data-testid={`figure-${f.key}`}>
            <span className="text-muted-foreground text-sm">{f.label}</span>
            <span className="text-2xl font-semibold tabular-nums">
              {data ? cellText(data.summary[f.key], "number") || "0" : "—"}
            </span>
          </Card>
        ))}
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm" data-testid="report-table">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                {spec.columns.map((c) => (
                  <th key={c.key} className={c.format === "number" ? "px-4 py-2 text-right font-medium" : "px-4 py-2 font-medium"}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {!isLoading && (data?.rows.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={spec.columns.length} className="text-muted-foreground px-4 py-8 text-center">
                    Không có dữ liệu trong khoảng ngày này.
                  </td>
                </tr>
              )}
              {data?.rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {spec.columns.map((c) => (
                    <td key={c.key} className={c.format === "number" ? "px-4 py-2 text-right" : "px-4 py-2"}>
                      {cellText(row[c.key], c.format) || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ListView>
  );
};
