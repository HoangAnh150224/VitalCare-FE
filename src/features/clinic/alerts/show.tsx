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
  type AlertDetail,
} from "@/domains/alerts/types";

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
    refetchInterval: 30_000,
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
                      {a.ruleName} (
                      {condition(a.metric, a.operator, a.threshold)})
                    </Link>
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
