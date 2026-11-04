import { useCan, useInvalidate, useNotification } from "@refinedev/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { DetailPanel } from "@/shared/components/views/record-detail";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { formatDateTime } from "@/shared/lib/format";
import type { Encounter } from "@/domains/encounter/types";
import { resultsErrorText } from "@/domains/results/types";
import { refusal, send } from "./send";

/**
 * BF-07 Review Service Result and Consultation: once the results are back, the
 * doctor writes the final conclusion and what they told the patient. Kept
 * apart from the visit form, which locks 24 hours after the visit.
 */
export function ConsultationPanel({ encounter }: { encounter: Encounter }) {
  const { data: canConclude } = useCan({ resource: "clinical_encounters", action: "conclude" });
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();
  const [editing, setEditing] = useState(false);
  const [conclusion, setConclusion] = useState(encounter.finalConclusion ?? encounter.diagnosis ?? "");
  const [notes, setNotes] = useState(encounter.consultationNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const writable = (canConclude?.can ?? false) && encounter._can?.write !== false && encounter.status === "completed";
  const save = useMutation({
    mutationFn: () =>
      send("post", `clinical_encounters/${encounter.id}/consultation`, {
        finalConclusion: conclusion,
        consultationNotes: notes,
      }),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      notify?.({ type: "success", message: "Đã lưu kết luận tư vấn" });
      void invalidate({ resource: "clinical_encounters", invalidates: ["detail"], id: encounter.id });
    },
    onError: (e) => setError(resultsErrorText(refusal(e))),
  });

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
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
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
