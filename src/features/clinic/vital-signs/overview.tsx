import { useCan } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { kyInstance } from "@/shared/api/data";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { formatDateTime } from "@/shared/lib/format";
import { CONNECTIVITY_LABELS } from "@/domains/device/types";
import type { MonitoredPatient } from "@/domains/vitals/types";
import { BatteryLevel, ConnectivityBadge } from "../devices/device-status";

/** How often the overview re-reads the latest values. */
const LIVE_MS = 30_000;
/** At or under this a battery is low, as the battery icon shows it. */
const LOW_BATTERY = 20;

const fmt = (v: number | null, digits: number, unit: string) =>
  v == null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    `${Number(v).toFixed(digits)} ${unit}`
  );

/** The same value as plain text, for the workbook. */
const text = (v: number | null, digits: number, unit: string) =>
  v == null ? "—" : `${Number(v).toFixed(digits)} ${unit}`;

/** "Nguyễn Văn Bình" is found by "nguyen van binh" too: accents dropped, case ignored. */
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

type Filter = { search: string; connectivity: string; battery: string; readings: string };
const NO_FILTER: Filter = { search: "", connectivity: "all", battery: "all", readings: "all" };

function matches(row: MonitoredPatient, filter: Filter): boolean {
  const term = fold(filter.search);
  if (term && ![row.customerName, row.customerCode, row.deviceCode].some((field) => fold(field ?? "").includes(term))) {
    return false;
  }
  if (filter.connectivity !== "all" && row.connectivity !== filter.connectivity) return false;
  if (filter.battery === "low" && !(row.batteryLevel != null && row.batteryLevel <= LOW_BATTERY)) return false;
  if (filter.readings === "some" && row.latest.readings24h === 0) return false;
  if (filter.readings === "none" && row.latest.readings24h > 0) return false;
  return true;
}

/**
 * Vital Sign Monitoring Overview (FE-04): every patient wearing a device now
 * whom the caller may see, with the latest value of each measure. The list is
 * small and whole, so searching, filtering and the export work on it in place.
 */
export const VitalSignOverview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["vital_signs", "overview"],
    queryFn: () =>
      kyInstance.get("vital_signs/overview").json<MonitoredPatient[]>(),
    refetchInterval: LIVE_MS,
  });
  const all = useMemo(() => data ?? [], [data]);
  const [filter, setFilter] = useState<Filter>(NO_FILTER);
  const rows = useMemo(() => all.filter((row) => matches(row, filter)), [all, filter]);
  const filtered = JSON.stringify(filter) !== JSON.stringify(NO_FILTER);
  // The front desk does not manage devices: for it the code is text, not a link to a closed screen.
  const { data: devices } = useCan({ resource: "devices", action: "list" });

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const { createTableWorkbook } = await import("@/shared/components/data-table/excel-workbook");
      const book = createTableWorkbook(rows, true, "Theo dõi sinh hiệu", [
        { label: "Bệnh nhân", width: 28, value: (r: MonitoredPatient) => r.customerName },
        { label: "Mã khách hàng", width: 16, value: (r: MonitoredPatient) => r.customerCode },
        { label: "Thiết bị", width: 18, value: (r: MonitoredPatient) => r.deviceCode },
        { label: "Kết nối", width: 16, value: (r: MonitoredPatient) => CONNECTIVITY_LABELS[r.connectivity] ?? r.connectivity },
        { label: "Pin", width: 10, value: (r: MonitoredPatient) => (r.batteryLevel == null ? "—" : `${r.batteryLevel}%`) },
        { label: "Nhịp tim", width: 12, value: (r: MonitoredPatient) => text(r.latest.heartRate, 0, "bpm") },
        { label: "SpO₂", width: 10, value: (r: MonitoredPatient) => text(r.latest.spo2, 0, "%") },
        { label: "Nhiệt độ da", width: 14, value: (r: MonitoredPatient) => text(r.latest.skinTemperature, 1, "°C") },
        { label: "Nhiệt độ cơ thể", width: 16, value: (r: MonitoredPatient) => text(r.latest.bodyTemperature, 1, "°C") },
        { label: "Đo gần nhất", width: 22, value: (r: MonitoredPatient) => (r.latest.lastMeasuredAt ? formatDateTime(r.latest.lastMeasuredAt) : "Chưa có") },
        { label: "Số lần đo / 24 giờ", width: 18, value: (r: MonitoredPatient) => r.latest.readings24h },
      ]);
      const buffer = await book.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "VitalCare-theo-doi-sinh-hieu.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Không thể xuất Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ListView>
      <ListViewHeader
        resource="vital_signs"
        canCreate={false}
        description="Bệnh nhân đang đeo thiết bị theo dõi và chỉ số gần nhất; tự cập nhật mỗi 30 giây."
      />
      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              aria-label="Tìm bệnh nhân"
              placeholder="Tìm theo tên, mã khách hàng hoặc mã thiết bị..."
              className="pl-8"
              value={filter.search}
              onChange={(event) => setFilter({ ...filter, search: event.target.value })}
            />
          </div>
          <Select value={filter.connectivity} onValueChange={(connectivity) => setFilter({ ...filter, connectivity })}>
            <SelectTrigger aria-label="Kết nối" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi kết nối</SelectItem>
              <SelectItem value="ONLINE">{CONNECTIVITY_LABELS.ONLINE}</SelectItem>
              <SelectItem value="OFFLINE">{CONNECTIVITY_LABELS.OFFLINE}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.battery} onValueChange={(battery) => setFilter({ ...filter, battery })}>
            <SelectTrigger aria-label="Pin" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi mức pin</SelectItem>
              <SelectItem value="low">Pin yếu (≤ {LOW_BATTERY}%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.readings} onValueChange={(readings) => setFilter({ ...filter, readings })}>
            <SelectTrigger aria-label="Số đo 24 giờ" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi số đo 24 giờ</SelectItem>
              <SelectItem value="some">Có số đo trong 24 giờ</SelectItem>
              <SelectItem value="none">Không có số đo 24 giờ</SelectItem>
            </SelectContent>
          </Select>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => setFilter(NO_FILTER)}>
              <XIcon />
              Xóa bộ lọc
            </Button>
          )}
          <span className="text-muted-foreground text-sm tabular-nums">
            {rows.length} / {all.length} bệnh nhân
          </span>
          <Button variant="outline" className="ms-auto" onClick={() => void exportExcel()} disabled={exporting || isLoading}>
            <DownloadIcon />
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="vital-overview">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left font-medium">Bệnh nhân</th>
                <th className="px-4 py-2.5 text-left font-medium">Thiết bị</th>
                <th className="px-4 py-2.5 text-right font-medium">Nhịp tim</th>
                <th className="px-4 py-2.5 text-right font-medium">SpO₂</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Nhiệt độ da
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Nhiệt độ cơ thể
                </th>
                <th className="px-4 py-2.5 text-left font-medium">
                  Đo gần nhất
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground px-4 py-8 text-center"
                  >
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground px-4 py-8 text-center"
                  >
                    {all.length === 0
                      ? "Chưa có bệnh nhân nào đang đeo thiết bị."
                      : "Không có bệnh nhân nào khớp tìm kiếm hoặc bộ lọc."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={`${r.customerId}-${r.deviceId}`}
                    className="hover:bg-accent/30 border-b last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/vital-signs/patient/${r.customerId}`}
                        className="font-medium hover:underline"
                      >
                        {r.customerName}
                      </Link>
                      <div className="text-muted-foreground font-mono text-xs">
                        {r.customerCode}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {devices?.can ? (
                        <Link
                          to={`/devices/show/${r.deviceId}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {r.deviceCode}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs">{r.deviceCode}</span>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <ConnectivityBadge connectivity={r.connectivity} />
                        <BatteryLevel level={r.batteryLevel} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmt(r.latest.heartRate, 0, "bpm")}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmt(r.latest.spo2, 0, "%")}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmt(r.latest.skinTemperature, 1, "°C")}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmt(r.latest.bodyTemperature, 1, "°C")}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.latest.lastMeasuredAt ? (
                        formatDateTime(r.latest.lastMeasuredAt)
                      ) : (
                        <span className="text-muted-foreground">Chưa có</span>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {r.latest.readings24h} lần đo / 24 giờ
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </ListView>
  );
};
