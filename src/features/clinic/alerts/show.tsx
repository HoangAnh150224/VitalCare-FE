import { useCan, useInvalidate, useNotification } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheckIcon,
  CheckIcon,
  MessageSquarePlusIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";
import { formatDateTime } from "@/shared/lib/format";
import {
  ACTION_LABELS,
  ALERT_STATUS_LABELS,
  ALERT_STATUS_VARIANTS,
  METRIC_LABELS,
  SEVERITY_LABELS,
  SEVERITY_VARIANTS,
  condition,
  valueWithUnit,
  type Alert,
  type AlertDetail,
  type Metric,
} from "@/domains/alerts/types";
import { CallLogPanel } from "../sharing/call-log-panel";
import { MonitorTrace, type TraceKind } from "./monitor-trace";

type Step = "notes" | "resolve" | "dismiss";

const STEP_TEXT: Record<
  Step,
  { title: string; description: string; label: string; required: string }
> = {
  notes: {
    title: "Thêm ghi chú",
    description: "Ghi lại việc đã làm hoặc thông tin mới về cảnh báo.",
    label: "Lưu ghi chú",
    required: "Nhập nội dung ghi chú",
  },
  resolve: {
    title: "Xử lý xong cảnh báo",
    description:
      "Ghi rõ đã xử lý thế nào (gọi điện, hẹn khám, điều chỉnh thuốc...). Bắt buộc.",
    label: "Xác nhận đã xử lý",
    required: "Cần ghi chú xử lý",
  },
  dismiss: {
    title: "Bỏ qua cảnh báo",
    description:
      "Cho biết vì sao không cần xử lý (đeo sai cách, số đo nhiễu...). Bắt buộc.",
    label: "Bỏ qua",
    required: "Cần lý do bỏ qua",
  },
};

type LiveReading = {
  id: number;
  measuredAt: string;
  heartRate: number | null;
  spo2: number | null;
  bodyTemperature: number | null;
  skinTemperature: number | null;
};

/** A reading older than this is no longer "now": the cards' traces lie flat. */
const FRESH_MS = 20_000;

const beyond = (a: Alert, metric: Metric, v: number | null) =>
  a.metric === metric &&
  v != null &&
  a.threshold != null &&
  (a.operator === "BELOW" ? v < a.threshold : v > a.threshold);

/**
 * The patient's readings as the band sends them, newest first: followed every
 * 3 seconds while the alert is being handled, so the numbers are seen moving
 * before it is taken up.
 */
function LiveReadings({ alert, live }: { alert: Alert; live: boolean }) {
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["alerts", "live", alert.id],
    queryFn: () =>
      kyInstance.get(`alerts/${alert.id}/live`).json<LiveReading[]>(),
    refetchInterval: live ? 3_000 : false,
  });
  const rows = data ?? [];
  const latest = rows[0];
  // Read at fetch time, not at render: the query's own clock says how old the newest reading is.
  const fresh =
    live &&
    latest != null &&
    dataUpdatedAt - new Date(latest.measuredAt).getTime() < FRESH_MS;
  const bpm = fresh ? latest.heartRate ?? 0 : 0;
  const body = latest?.bodyTemperature ?? null;
  const cards: {
    label: string;
    metric: Metric;
    value: number | null;
    unit: string;
    kind: TraceKind;
    color: string;
  }[] = [
    {
      label: "SpO₂",
      metric: "SPO2",
      value: latest?.spo2 ?? null,
      unit: "%",
      kind: "pleth",
      color: "#1f6f8a",
    },
    {
      label: "Nhịp tim",
      metric: "HEART_RATE",
      value: latest?.heartRate ?? null,
      unit: " bpm",
      kind: "ecg",
      color: "#b23a48",
    },
    {
      label: body != null ? "Nhiệt độ cơ thể" : "Nhiệt độ da",
      metric: body != null ? "BODY_TEMPERATURE" : "SKIN_TEMPERATURE",
      value: body ?? latest?.skinTemperature ?? null,
      unit: " °C",
      kind: "ripple",
      color: "#8a5a12",
    },
  ];
  const cell = (metric: Metric, v: number | null, unit: string) =>
    v == null ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <span
        className={
          beyond(alert, metric, v) ? "text-destructive font-semibold" : ""
        }
      >
        {Number(v)}
        {unit}
      </span>
    );
  return (
    <DetailPanel
      title={live ? "Số đo trực tiếp · cập nhật mỗi 3 giây" : "Số đo gần nhất"}
      bodyClassName="p-0"
    >
      <div
        className="grid gap-3 border-b p-4 sm:grid-cols-3"
        data-testid="alert-live-cards"
      >
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">{c.label}</p>
            <p
              className={`mt-1 text-3xl font-bold tabular-nums ${
                c.value != null && beyond(alert, c.metric, c.value)
                  ? "text-destructive"
                  : ""
              }`}
            >
              {c.value == null ? "--" : Number(c.value)}
              <span className="text-sm font-normal">{c.unit}</span>
            </p>
            <MonitorTrace
              kind={c.kind}
              bpm={c.value == null ? 0 : bpm}
              color={c.color}
            />
          </div>
        ))}
      </div>
      {rows.length ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm" data-testid="alert-live-readings">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">
                  Thời điểm đo
                </th>
                <th className="px-4 py-2 text-right font-medium">SpO₂</th>
                <th className="px-4 py-2 text-right font-medium">Nhịp tim</th>
                <th className="px-4 py-2 text-right font-medium">
                  Nhiệt độ cơ thể
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b last:border-0 ${
                    i === 0 ? "bg-muted/40 text-base" : ""
                  }`}
                >
                  <td className="px-4 py-2 tabular-nums">
                    {new Date(r.measuredAt).toLocaleTimeString("vi-VN")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {cell("SPO2", r.spo2, "%")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {cell("HEART_RATE", r.heartRate, " bpm")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {cell("BODY_TEMPERATURE", r.bodyTemperature, " °C")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground p-4 text-sm">
          Chưa có số đo nào từ thiết bị của bệnh nhân.
        </p>
      )}
    </DetailPanel>
  );
}

/**
 * Alert Details (FE-05): who, which measure and how far off, the rule that
 * fired, and the whole Action History — with acknowledge, notes, resolve (with
 * handling notes) and dismiss (with a reason) for staff who handle alerts.
 */
export const AlertShow = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const { data: can } = useCan({ resource: "alerts", action: "edit" });
  const [step, setStep] = useState<Step | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isError } = useQuery({
    queryKey: ["alerts", "detail", id],
    queryFn: () => kyInstance.get(`alerts/${id}`).json<AlertDetail>(),
    enabled: Boolean(id),
    // An alert still being handled is followed live: the band sends a reading every few seconds.
    refetchInterval: (query) => {
      const status = query.state.data?.alert.status;
      return status === "OPEN" || status === "ACKNOWLEDGED" ? 3_000 : 30_000;
    },
  });
  const act = useMutation({
    mutationFn: ({ path, note }: { path: string; note?: string }) =>
      kyInstance
        .post(`alerts/${id}/${path}`, {
          json: note === undefined ? {} : { note },
        })
        .json<AlertDetail>(),
    onSuccess: (fresh) => {
      queryClient.setQueryData(["alerts", "detail", id], fresh);
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      invalidate({ resource: "alerts", invalidates: ["list", "many"] });
      setStep(null);
      setText("");
    },
    onError: () =>
      notify?.({
        type: "error",
        message: "Không thực hiện được",
        description: "Cảnh báo có thể vừa được người khác xử lý.",
      }),
  });

  const a = data?.alert;
  const active = a && (a.status === "OPEN" || a.status === "ACKNOWLEDGED");
  const submit = () => {
    if (!step) return;
    if (!text.trim()) {
      setError(STEP_TEXT[step].required);
      return;
    }
    act.mutate({ path: step, note: text.trim() });
  };

  return (
    <ShowView>
      <ShowViewHeader
        resource="alerts"
        title="Chi tiết cảnh báo"
        canEdit={false}
        actions={
          can?.can && active ? (
            <>
              {a.status === "OPEN" && (
                <Button
                  size="sm"
                  onClick={() => act.mutate({ path: "acknowledge" })}
                  disabled={act.isPending}
                >
                  <CheckIcon />
                  Tiếp nhận
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep("notes");
                }}
              >
                <MessageSquarePlusIcon />
                Ghi chú
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep("resolve");
                }}
              >
                <CheckCheckIcon />
                Xử lý xong
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setStep("dismiss");
                }}
              >
                <XIcon />
                Bỏ qua
              </Button>
            </>
          ) : null
        }
      />
      {isError ? (
        <p className="text-muted-foreground text-sm">
          Không tìm thấy cảnh báo này.
        </p>
      ) : (
        <>
          <Card className="gap-2 px-6 py-5" data-testid="alert-headline">
            {a && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={SEVERITY_VARIANTS[a.severity]}>
                    {SEVERITY_LABELS[a.severity]}
                  </Badge>
                  <Badge variant={ALERT_STATUS_VARIANTS[a.status]}>
                    {ALERT_STATUS_LABELS[a.status]}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold">{a.message}</h2>
                <p className="text-muted-foreground text-sm">
                  {a.patient ? (
                    <Link
                      to={`/vital-signs/patient/${a.patient.id}`}
                      className="text-foreground font-medium hover:underline"
                    >
                      {a.patient.fullName}
                    </Link>
                  ) : null}
                  {" · "}phát sinh {formatDateTime(a.triggeredAt)}
                  {a.occurrences > 1
                    ? ` · ${a.occurrences} lần, gần nhất ${formatDateTime(
                        a.lastTriggeredAt
                      )}`
                    : ""}
                </p>
              </>
            )}
          </Card>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <DetailPanel title="Chỉ số">
              <DetailList>
                <DetailRow label="Chỉ số">
                  {a ? METRIC_LABELS[a.metric] : <EmptyValue />}
                </DetailRow>
                <DetailRow label="Lần đầu">
                  {a ? (
                    valueWithUnit(a.metric, a.measuredValue)
                  ) : (
                    <EmptyValue />
                  )}
                </DetailRow>
                <DetailRow label="Gần nhất">
                  {a ? valueWithUnit(a.metric, a.lastValue) : <EmptyValue />}
                </DetailRow>
                <DetailRow label="Quy tắc">
                  {a?.ruleId ? (
                    <Link
                      to={`/alert-rules/show/${a.ruleId}`}
                      className="hover:underline"
                    >
                      {a.ruleName}
                      {a.operator && a.threshold != null
                        ? ` (${condition(a.metric, a.operator, a.threshold)})`
                        : ""}
                    </Link>
                  ) : a?.source === "DEVICE" ? (
                    <>
                      Thiết bị báo
                      {a.operator && a.threshold != null
                        ? ` (${condition(a.metric, a.operator, a.threshold)})`
                        : ""}
                    </>
                  ) : (
                    <EmptyValue />
                  )}
                </DetailRow>
                <DetailRow label="Thiết bị">
                  {a?.deviceId ? (
                    <Link
                      to={`/devices/show/${a.deviceId}`}
                      className="font-mono hover:underline"
                    >
                      {a.deviceCode}
                    </Link>
                  ) : (
                    <EmptyValue />
                  )}
                </DetailRow>
              </DetailList>
            </DetailPanel>
            <DetailPanel title="Xử lý">
              <DetailList>
                <DetailRow label="Tiếp nhận">
                  {a?.acknowledgedAt ? (
                    formatDateTime(a.acknowledgedAt)
                  ) : (
                    <EmptyValue>Chưa</EmptyValue>
                  )}
                </DetailRow>
                <DetailRow label="Xử lý xong">
                  {a?.resolvedAt ? (
                    formatDateTime(a.resolvedAt)
                  ) : (
                    <EmptyValue>Chưa</EmptyValue>
                  )}
                </DetailRow>
                {data?.handlingNotes && (
                  <DetailRow label="Ghi chú xử lý">
                    {data.handlingNotes}
                  </DetailRow>
                )}
                {a?.dismissedAt && (
                  <DetailRow label="Bỏ qua lúc">
                    {formatDateTime(a.dismissedAt)}
                  </DetailRow>
                )}
                {data?.dismissReason && (
                  <DetailRow label="Lý do bỏ qua">
                    {data.dismissReason}
                  </DetailRow>
                )}
              </DetailList>
            </DetailPanel>
          </div>
          {a && <LiveReadings alert={a} live={Boolean(active)} />}
          {a && <CallLogPanel alertId={a.id} />}
          <DetailPanel title="Lịch sử xử lý" bodyClassName="p-4">
            <ol className="flex flex-col gap-3" data-testid="alert-history">
              {(data?.history ?? []).map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground w-36 shrink-0 tabular-nums">
                    {formatDateTime(h.occurredAt)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      {ACTION_LABELS[h.action]}
                      {h.value != null && a
                        ? ` · ${valueWithUnit(a.metric, h.value)}`
                        : ""}
                      {h.actorName ? ` · ${h.actorName}` : ""}
                    </span>
                    {h.note && (
                      <span className="text-muted-foreground whitespace-pre-wrap">
                        {h.note}
                      </span>
                    )}
                    {h.vitalSignId && (
                      <Link
                        to={`/vital-signs/show/${h.vitalSignId}`}
                        className="text-xs hover:underline"
                      >
                        Xem số đo
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </DetailPanel>
        </>
      )}

      <Dialog
        open={step != null}
        onOpenChange={(open) => !open && setStep(null)}
      >
        <DialogContent>
          {step && (
            <>
              <DialogHeader>
                <DialogTitle>{STEP_TEXT[step].title}</DialogTitle>
                <DialogDescription>
                  {STEP_TEXT[step].description}
                </DialogDescription>
              </DialogHeader>
              <Textarea
                aria-label={STEP_TEXT[step].title}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(null);
                }}
                rows={4}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(null)}>
                  Huỷ
                </Button>
                <Button
                  onClick={submit}
                  disabled={act.isPending}
                  variant={step === "dismiss" ? "destructive" : "default"}
                >
                  {STEP_TEXT[step].label}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ShowView>
  );
};
