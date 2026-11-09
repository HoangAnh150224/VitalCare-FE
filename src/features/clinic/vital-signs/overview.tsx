import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Card } from "@/shared/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import type { MonitoredPatient } from "@/domains/vitals/types";
import { BatteryLevel, ConnectivityBadge } from "../devices/device-status";

/** How often the overview re-reads the latest values. */
const LIVE_MS = 30_000;

const fmt = (v: number | null, digits: number, unit: string) =>
  v == null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    `${Number(v).toFixed(digits)} ${unit}`
  );

/**
 * Vital Sign Monitoring Overview (FE-04): every patient wearing a device now
 * whom the caller may see, with the latest value of each measure.
 */
export const VitalSignOverview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["vital_signs", "overview"],
    queryFn: () =>
      kyInstance.get("vital_signs/overview").json<MonitoredPatient[]>(),
    refetchInterval: LIVE_MS,
  });
  const rows = data ?? [];

  return (
    <ListView>
      <ListViewHeader
        resource="vital_signs"
        canCreate={false}
        description="Bệnh nhân đang đeo thiết bị theo dõi và chỉ số gần nhất; tự cập nhật mỗi 30 giây."
      />
      <Card className="gap-0 py-0">
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
                    Chưa có bệnh nhân nào đang đeo thiết bị.
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
                      <Link
                        to={`/devices/show/${r.deviceId}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {r.deviceCode}
                      </Link>
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
