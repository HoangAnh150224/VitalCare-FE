import { useCan, useInvalidate, useNotification } from "@refinedev/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Textarea } from "@/shared/ui/textarea";
import { formatDateTime } from "@/shared/lib/format";
import type { Encounter } from "@/domains/encounter/types";
import { resultsErrorText } from "@/domains/results/types";
import { monitoringOrdersKey, useMonitoringOrders } from "../monitoring/use-monitoring-orders";
import { refusal, send } from "./send";

type Decision = "ACCEPTED" | "DECLINED";

/**
 * BF-07 Review Service Result and Consultation: once the results are back, the
 * doctor writes the final conclusion and what they told the patient. Kept
 * apart from the visit form, which locks 24 hours after the visit.
 *
 * BF-04 belongs here too: having read the results, the doctor may advise home
 * monitoring with a wearable and record whether the patient accepted. Optional,
 * and not offered while the patient is already being monitored.
 */
export function ConsultationPanel({ encounter }: { encounter: Encounter }) {
  const { data: canConclude } = useCan({ resource: "clinical_encounters", action: "conclude" });
  const { data: canOrder } = useCan({ resource: "monitoring_orders", action: "create" });
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const [editing, setEditing] = useState(false);
  const [conclusion, setConclusion] = useState(encounter.finalConclusion ?? encounter.diagnosis ?? "");
  const [notes, setNotes] = useState(encounter.consultationNotes ?? "");
  const [monitor, setMonitor] = useState(false);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [consentNote, setConsentNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const writable = (canConclude?.can ?? false) && encounter._can?.write !== false && encounter.status === "completed";

  const customerId = encounter.patient.id;
  const { data: orders } = useMonitoringOrders(customerId, writable && (canOrder?.can ?? false));
  const offersMonitoring =
    (canOrder?.can ?? false) && orders != null && !orders.some((o) => o.status === "ACTIVE");

  const save = useMutation({
    mutationFn: async () => {
      await send("post", `clinical_encounters/${encounter.id}/consultation`, {
        finalConclusion: conclusion,
        consultationNotes: notes,
      });
      if (!(offersMonitoring && monitor)) return { monitoring: "none" as const };
      try {
        await kyInstance
          .post("monitoring_orders", {
            json: {
              customerId,
              encounterId: encounter.id,
              reason: reason.trim(),
              decision,
              consentNote: consentNote.trim() || null,
            },
          })
          .json();
        return { monitoring: "saved" as const };
      } catch {
        return { monitoring: "failed" as const };
      }
    },
    onSuccess: ({ monitoring }) => {
      setEditing(false);
      setError(null);
      setMonitor(false);
      setReason("");
      setDecision(null);
      setConsentNote("");
      notify?.({ type: "success", message: "Đã lưu kết luận tư vấn" });
      if (monitoring === "failed") {
        notify?.({
          type: "error",
          message: "Đã lưu kết luận nhưng chưa lưu được chỉ định theo dõi IoMT",
          description: "Bệnh nhân có thể đang có chỉ định theo dõi khác.",
        });
      }
      void invalidate({ resource: "clinical_encounters", invalidates: ["detail"], id: encounter.id });
      void queryClient.invalidateQueries({ queryKey: monitoringOrdersKey(customerId) });
    },
    onError: (e) => setError(resultsErrorText(refusal(e))),
  });

  const submit = () => {
    if (offersMonitoring && monitor) {
      if (!reason.trim()) return setError("Nhập lý do chỉ định theo dõi IoMT");
      if (!decision) return setError("Chọn bệnh nhân đồng ý hay từ chối theo dõi IoMT");
    }
    save.mutate();
  };

  if (encounter.status !== "completed" && !encounter.finalConclusion) return null;
  return (
    <DetailPanel title="Tư vấn kết quả">
      {editing ? (
        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="final-conclusion">Kết luận cuối cùng</Label>
            <Textarea id="final-conclusion" value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consultation-notes">Nội dung tư vấn</Label>
            <Textarea id="consultation-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {offersMonitoring && (
            <div className="flex flex-col gap-3 rounded-md border border-dashed p-3" data-testid="consultation-monitoring">
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={monitor}
                  onCheckedChange={(v) => {
                    setMonitor(v === true);
                    setError(null);
                  }}
                />
                Chỉ định theo dõi tại nhà bằng vòng đeo IoMT
                <span className="text-muted-foreground text-xs">(không bắt buộc)</span>
              </Label>
              {monitor && (
                <>
                  <Textarea
                    aria-label="Lý do chỉ định theo dõi"
                    rows={2}
                    maxLength={1000}
                    value={reason}
                    placeholder="Lý do: VD theo dõi SpO₂ sau đợt cấp"
                    onChange={(e) => {
                      setReason(e.target.value);
                      setError(null);
                    }}
                  />
                  <RadioGroup
                    value={decision ?? ""}
                    onValueChange={(v) => {
                      setDecision(v as Decision);
                      setError(null);
                    }}
                    className="flex flex-wrap gap-4"
                  >
                    <Label className="flex items-center gap-2 font-normal">
                      <RadioGroupItem value="ACCEPTED" />
                      Bệnh nhân đồng ý
                    </Label>
                    <Label className="flex items-center gap-2 font-normal">
                      <RadioGroupItem value="DECLINED" />
                      Bệnh nhân từ chối
                    </Label>
                  </RadioGroup>
                  <Textarea
                    aria-label="Ghi chú đồng ý"
                    rows={2}
                    maxLength={1000}
                    value={consentNote}
                    placeholder="Ghi chú (đã giải thích mục đích, cách đeo, phạm vi theo dõi...)"
                    onChange={(e) => setConsentNote(e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">Thiết bị chỉ được gán khi bệnh nhân đã đồng ý.</p>
                </>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" disabled={save.isPending} onClick={submit}>
              Lưu kết luận
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Huỷ
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 py-3 text-sm">
          {encounter.finalConclusion ? (
            <>
              <p className="font-medium whitespace-pre-line">{encounter.finalConclusion}</p>
              {encounter.consultationNotes && (
                <p className="text-muted-foreground whitespace-pre-line">{encounter.consultationNotes}</p>
              )}
              <p className="text-muted-foreground text-xs">Tư vấn lúc {formatDateTime(encounter.consultedAt)}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Chưa có kết luận sau khi xem kết quả dịch vụ.</p>
          )}
          {writable && (
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setEditing(true)}>
              {encounter.finalConclusion ? "Sửa kết luận" : "Ghi kết luận tư vấn"}
            </Button>
          )}
        </div>
      )}
    </DetailPanel>
  );
}
