import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  BatteryLowIcon,
  CalendarCheckIcon,
  HeartPulseIcon,
  RefreshCwIcon,
  SirenIcon,
  WatchIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { kyInstance } from "@/shared/api/data";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { METRIC_LABELS } from "@/domains/alerts/types";
import type { MonitoringDashboard as Data } from "@/domains/reports/types";
import { ClinicPicker } from "./clinic-picker";

const chart = {
  critical: { label: "Nguy hiểm", color: "var(--destructive)" },
  warning: { label: "Cảnh giác", color: "var(--warning)" },
} satisfies ChartConfig;

/**
 * BF-10 Clinic Monitoring Dashboard: patients monitored, devices, open alerts,
 * today's visits and how data is coming in, for the viewer's clinic. Refreshed
 * every 30 s; each figure links to the list it counts.
 */
export const MonitoringDashboard = () => {
  const [clinicId, setClinicId] = useState("");
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["monitoring_dashboard", clinicId],
    queryFn: () =>
      kyInstance
        .get("monitoring_dashboard", { searchParams: clinicId ? { clinicId } : {} })
        .json<Data>(),
    refetchInterval: 30_000,
  });

  return (
    <div className="screen-enter flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Tổng quan theo dõi</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cập nhật mỗi 30 giây{dataUpdatedAt ? ` · lần cuối ${new Date(dataUpdatedAt).toLocaleTimeString("vi-VN")}` : ""}
          </p>
        </div>
        <ClinicPicker value={clinicId} onChange={setClinicId} answeredClinicId={data?.clinicId} />
      </div>

      {isError && (
        <Card className="px-5 py-4 text-sm">
          Không tải được số liệu.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </Card>
      )}

      {isLoading || !data ? (
        !isError && <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              to="/vital-signs"
              icon={<HeartPulseIcon />}
              label="Bệnh nhân đang theo dõi"
              value={data.monitoredPatients}
              testId="tile-monitored"
            />
            <Tile
              to="/devices"
              icon={<WatchIcon />}
              label="Thiết bị trực tuyến"
              value={`${data.devices.online}/${data.devices.total}`}
              note={`${data.devices.offline} mất kết nối · ${data.devices.assigned} đang giao`}
              testId="tile-devices"
            />
            <Tile
              to="/alerts"
              icon={<SirenIcon />}
              label="Cảnh báo nguy hiểm đang mở"
              value={data.alerts.openCritical}
              note={`${data.alerts.openWarning} cảnh giác · ${data.alerts.acknowledged} đã tiếp nhận`}
              tone={data.alerts.openCritical > 0 ? "critical" : undefined}
              testId="tile-alerts"
            />
            <Tile
              to="/appointments"
              icon={<CalendarCheckIcon />}
              label="Lượt khám hôm nay"
              value={data.appointmentsToday.total}
              note={`${data.appointmentsToday.completed} xong · ${data.appointmentsToday.waiting} chờ khám · ${data.appointmentsToday.awaitingPayment} chờ thanh toán`}
              testId="tile-appointments"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gap-3 p-5 lg:col-span-2">
              <h2 className="text-base font-semibold">Cảnh báo 7 ngày qua</h2>
              <ChartContainer config={chart} className="aspect-auto h-56 w-full">
                <BarChart data={data.alertsByDay} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d: string) => d.slice(8, 10) + "/" + d.slice(5, 7)}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="critical" stackId="a" fill="var(--color-critical)" isAnimationActive={false} />
                  <Bar dataKey="warning" stackId="a" fill="var(--color-warning)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            </Card>

            <Card className="gap-3 p-5">
              <h2 className="text-base font-semibold">Nguy hiểm chưa xử lý</h2>
              {data.recentCritical.length === 0 ? (
                <p className="text-muted-foreground text-sm">Không có cảnh báo nguy hiểm nào đang mở.</p>
              ) : (
                <ul className="flex flex-col gap-2" data-testid="recent-critical">
                  {data.recentCritical.map((a) => (
                    <li key={a.id}>
                      <Link to={`/alerts/show/${a.id}`} className="hover:bg-accent/40 -mx-2 flex flex-col rounded-md px-2 py-1.5">
                        <span className="flex items-center justify-between gap-2 text-sm font-medium">
                          {a.customerName}
                          <Badge variant={a.status === "OPEN" ? "destructive" : "outline"}>
                            {a.status === "OPEN" ? "Mới" : "Đã tiếp nhận"}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {METRIC_LABELS[a.metric as keyof typeof METRIC_LABELS] ?? a.metric}
                          {a.measuredValue != null ? ` ${a.measuredValue}` : ""} · {formatDateTime(a.triggeredAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              to="/vital-signs"
              icon={<ActivityIcon />}
              label="Số đo nhận trong 1 giờ"
              value={data.intake.lastHour}
              note={`${data.intake.lastDay} trong 24 giờ · ${data.intake.invalidLastDay} không hợp lệ`}
              testId="tile-intake"
            />
            <Tile
              to="/device-syncs"
              icon={<RefreshCwIcon />}
              label="Lần đồng bộ hôm nay"
              value={data.sync.batchesToday}
              note={data.sync.lastSyncAt ? `gần nhất ${formatDateTime(data.sync.lastSyncAt)}` : "chưa có lần nào"}
              testId="tile-syncs"
            />
            <Tile
              to="/sync-failures"
              icon={<RefreshCwIcon />}
              label="Bản ghi đồng bộ lỗi chờ xử lý"
              value={data.sync.openFailures}
              note={`${data.sync.rejectedToday} bị từ chối hôm nay`}
              tone={data.sync.openFailures > 0 ? "warning" : undefined}
              testId="tile-sync-failures"
            />
            <Tile
              to="/devices"
              icon={<BatteryLowIcon />}
              label="Thiết bị pin yếu (dưới 20%)"
              value={data.devices.lowBattery}
              tone={data.devices.lowBattery > 0 ? "warning" : undefined}
              testId="tile-battery"
            />
          </div>
        </>
      )}
    </div>
  );
};

function Tile({
  to,
  icon,
  label,
  value,
  note,
  tone,
  testId,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  value: number | string;
  note?: string;
  tone?: "critical" | "warning";
  testId: string;
}) {
  return (
    <Link to={to} data-testid={testId}>
      <Card
        className={cn(
          "hover:bg-accent/30 h-full gap-1 px-5 py-4 transition-colors",
          tone === "critical" && "border-destructive",
          tone === "warning" && "border-warning",
        )}
      >
        <span className="text-muted-foreground flex items-center gap-2 text-sm [&_svg]:size-4">
          {icon}
          {label}
        </span>
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        {note && <span className="text-muted-foreground text-xs">{note}</span>}
      </Card>
    </Link>
  );
}
