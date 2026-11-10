import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DropletIcon,
  HeartPulseIcon,
  ThermometerIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/shared/ui/chart";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type {
  VitalLatest,
  VitalTrend,
  VitalTrendPoint,
} from "@/domains/vitals/types";
import {
  HISTORY_PAGE,
  RANGE_LABELS,
  useVitalHistory,
  useVitalLatest,
  useVitalTrend,
  type VitalRange,
  type VitalScope,
} from "./use-vitals";

/** The three measures the bands report (BF-05), in one place for tiles, charts and tables. */
const MEASURES = [
  {
    key: "heartRate",
    label: "Nhịp tim",
    unit: "bpm",
    digits: 0,
    icon: HeartPulseIcon,
  },
  { key: "spo2", label: "SpO₂", unit: "%", digits: 0, icon: DropletIcon },
  {
    key: "skinTemperature",
    label: "Nhiệt độ da",
    unit: "°C",
    digits: 1,
    icon: ThermometerIcon,
  },
] as const;

/** Estimated from skin temperature; the temperature tile leads with it when there is one. */
const BODY_TEMPERATURE = {
  key: "bodyTemperature",
  label: "Nhiệt độ cơ thể (ước tính)",
  unit: "°C",
  digits: 1,
  icon: ThermometerIcon,
} as const;

/** One chart per measure, body temperature included. */
const CHARTS = [...MEASURES, BODY_TEMPERATURE] as const;

const show = (value: number | null | undefined, digits: number) =>
  value == null
    ? null
    : Number(value).toLocaleString("vi-VN", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });

/** The latest value of each measure, each with when it was taken: the headline numbers. */
export function VitalTiles({
  latest,
  loading,
}: {
  latest: VitalLatest | undefined;
  loading?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="vital-tiles">
      {MEASURES.map((measure) => {
        const skin = measure.key === "skinTemperature";
        const lead =
          skin && latest?.bodyTemperature != null ? BODY_TEMPERATURE : null;
        const m = lead ?? measure;
        const value = latest?.[m.key];
        const at = latest?.[`${m.key}At` as const];
        return (
          <Card key={m.key} className="gap-1 px-4 py-3">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <m.icon className="size-3.5" />
              {m.label}
            </span>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : value == null ? (
              <span className="text-muted-foreground text-2xl font-semibold">
                —
              </span>
            ) : (
              <span className="text-2xl font-semibold tabular-nums">
                {show(value, m.digits)}
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  {m.unit}
                </span>
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              {at ? `lúc ${formatDateTime(at)}` : "Chưa có số đo"}
            </span>
            {lead && latest?.skinTemperature != null && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {measure.label} {show(latest.skinTemperature, measure.digits)}{" "}
                {measure.unit}
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/** One row of range buttons above the charts. */
export function RangePicker({
  value,
  onChange,
}: {
  value: VitalRange;
  onChange: (range: VitalRange) => void;
}) {
  return (
    <div
      className="bg-muted/50 inline-flex rounded-md p-0.5"
      role="group"
      aria-label="Khoảng thời gian"
    >
      {(Object.keys(RANGE_LABELS) as VitalRange[]).map((r) => (
        <Button
          key={r}
          size="sm"
          variant={r === value ? "secondary" : "ghost"}
          aria-pressed={r === value}
          className={cn("h-7 px-3", r === value && "shadow-sm")}
          onClick={() => onChange(r)}
        >
          {RANGE_LABELS[r]}
        </Button>
      ))}
    </div>
  );
}

const config = {
  avg: { label: "Trung bình", color: "var(--chart-1)" },
} satisfies ChartConfig;

const bucketLabel = (at: string, unit: VitalTrend["unit"]) => {
  const d = new Date(at);
  const dd = `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
  return unit === "hour"
    ? `${String(d.getHours()).padStart(2, "0")}:00 ${dd}`
    : dd;
};

/**
 * One measure over time: the average as a line, the lowest–highest as a band
 * behind it. One chart per measure — they are on different scales, so never
 * one chart with two axes.
 */
function MeasureChart({
  trend,
  measure,
}: {
  trend: VitalTrend;
  measure: (typeof CHARTS)[number];
}) {
  const data = trend.points
    .filter((p) => p[`${measure.key}Avg` as keyof VitalTrendPoint] != null)
    .map((p) => ({
      label: bucketLabel(p.at, trend.unit),
      avg: Number(p[`${measure.key}Avg` as keyof VitalTrendPoint]),
      band: [
        Number(
          p[`${measure.key}Min` as keyof VitalTrendPoint] ??
            p[`${measure.key}Avg` as keyof VitalTrendPoint]
        ),
        Number(
          p[`${measure.key}Max` as keyof VitalTrendPoint] ??
            p[`${measure.key}Avg` as keyof VitalTrendPoint]
        ),
      ],
      readings: p.readings,
    }));

  return (
    <Card className="gap-2 px-4 py-3" data-testid={`trend-${measure.key}`}>
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <measure.icon className="text-muted-foreground size-4" />
        {measure.label}
        <span className="text-muted-foreground text-xs font-normal">
          ({measure.unit})
        </span>
      </span>
      {data.length === 0 ? (
        <p className="text-muted-foreground flex h-36 items-center justify-center text-sm">
          Không có số đo trong khoảng này.
        </p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-36 w-full">
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 8, bottom: 0, left: -12 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => show(v, measure.digits) ?? ""}
            />
            <ChartTooltip
              cursor={{ strokeWidth: 1 }}
              content={({ active, payload }) => {
                const row = active && payload?.[0]?.payload;
                if (!row) return null;
                return (
                  <div className="bg-background rounded-md border px-2.5 py-1.5 text-xs shadow-sm">
                    <div className="font-medium">{row.label}</div>
                    <div className="tabular-nums">
                      TB {show(row.avg, measure.digits)} {measure.unit}
                    </div>
                    <div className="text-muted-foreground tabular-nums">
                      {show(row.band[0], measure.digits)}–
                      {show(row.band[1], measure.digits)} · {row.readings} lần
                      đo
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--color-avg)"
              fillOpacity={0.15}
              isAnimationActive={false}
            />
            <Line
              dataKey="avg"
              stroke="var(--color-avg)"
              strokeWidth={2}
              dot={data.length < 30 ? { r: 3 } : false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      )}
    </Card>
  );
}

export function VitalTrends({
  scope,
  range,
}: {
  scope: VitalScope;
  range: VitalRange;
}) {
  const { data: trend, isLoading } = useVitalTrend(scope, range);
  if (isLoading || !trend) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CHARTS.map((m) => (
          <Skeleton key={m.key} className="h-48" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CHARTS.map((m) => (
        <MeasureChart key={m.key} trend={trend} measure={m} />
      ))}
    </div>
  );
}

/**
 * The readings themselves, newest first, a page at a time. Staff may include
 * the readings set aside as implausible (marked); a patient never sees those.
 */
export function VitalHistory({
  scope,
  range,
  detailHref,
}: {
  scope: VitalScope;
  range: VitalRange;
  /** Where a row leads, if anywhere. */
  detailHref?: (id: number) => string;
}) {
  const [page, setPage] = useState(0);
  const [includeInvalid, setIncludeInvalid] = useState(false);
  const staff = scope.kind === "staff";
  const { data, isLoading } = useVitalHistory(
    scope,
    range,
    page,
    staff && includeInvalid
  );
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE));

  const cell = (value: number | null, digits: number, unit: string) =>
    value == null ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      `${show(value, digits)} ${unit}`
    );

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <span className="text-sm font-medium">Lịch sử số đo</span>
        {staff && (
          <Label className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
            <Checkbox
              checked={includeInvalid}
              onCheckedChange={(v) => {
                setIncludeInvalid(v === true);
                setPage(0);
              }}
            />
            Gồm cả bản ghi không hợp lệ
          </Label>
        )}
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm whitespace-nowrap"
          data-testid="vital-history"
        >
          <thead className="text-muted-foreground text-xs">
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Thời điểm đo</th>
              <th className="px-4 py-2 text-right font-medium">Nhịp tim</th>
              <th className="px-4 py-2 text-right font-medium">SpO₂</th>
              <th className="px-4 py-2 text-right font-medium">Nhiệt độ da</th>
              <th className="px-4 py-2 text-right font-medium">
                Nhiệt độ cơ thể
              </th>
              {staff && (
                <th className="px-4 py-2 text-left font-medium">Thiết bị</th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={staff ? 6 : 5}
                  className="text-muted-foreground px-4 py-6 text-center"
                >
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={staff ? 6 : 5}
                  className="text-muted-foreground px-4 py-6 text-center"
                >
                  Không có số đo trong khoảng này.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2 tabular-nums">
                    {detailHref ? (
                      <Link to={detailHref(r.id)} className="hover:underline">
                        {formatDateTime(r.measuredAt)}
                      </Link>
                    ) : (
                      formatDateTime(r.measuredAt)
                    )}
                    {r.validationStatus === "INVALID" && (
                      <Badge
                        variant="destructive"
                        className="ml-2"
                        title={r.validationError ?? undefined}
                      >
                        Không hợp lệ
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {cell(r.heartRate, 0, "bpm")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {cell(r.spo2, 0, "%")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {cell(r.skinTemperature, 2, "°C")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {cell(r.bodyTemperature, 2, "°C")}
                  </td>
                  {staff && (
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.deviceCode ?? "—"}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-muted-foreground flex items-center justify-between gap-2 border-t px-4 py-2 text-xs">
        <span className="tabular-nums">{total} số đo</span>
        <span className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Trang trước"
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular-nums">
            {page + 1}/{pages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Trang sau"
          >
            <ChevronRightIcon />
          </Button>
        </span>
      </div>
    </Card>
  );
}

/** Tiles, then a range picker over the trends and the history — one patient's whole monitoring view. */
export function VitalMonitor({
  scope,
  detailHref,
  header,
}: {
  scope: VitalScope;
  detailHref?: (id: number) => string;
  header?: ReactNode;
}) {
  const [range, setRange] = useState<VitalRange>("24h");
  const { data: latest, isLoading } = useVitalLatest(scope);
  return (
    <div className="flex flex-col gap-4">
      {header}
      <VitalTiles latest={latest} loading={isLoading} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Xu hướng</span>
        <RangePicker value={range} onChange={setRange} />
      </div>
      <VitalTrends scope={scope} range={range} />
      <VitalHistory
        key={range}
        scope={scope}
        range={range}
        detailHref={detailHref}
      />
    </div>
  );
}
