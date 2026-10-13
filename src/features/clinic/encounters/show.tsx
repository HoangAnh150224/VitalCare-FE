import { useCan, useCustomMutation, useInvalidate, useNotification, useShow } from "@refinedev/core";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
  MetaItem,
  MetaStrip,
} from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";
import type { Encounter } from "@/domains/encounter/types";
import { ENCOUNTER_STATUS_LABELS, isEncounterLocked } from "@/domains/encounter/types";
import { STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { ENCOUNTER_STATUS_VARIANTS } from "@/shared/lib/status-variants";

/** One encounter: what was recorded at the visit, and the step that closes it. */
export const EncounterShow = () => {
  const { result: record, query } = useShow<Encounter>({ resource: "clinical_encounters" });
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { mutate, mutation } = useCustomMutation<Encounter>();
  const [confirming, setConfirming] = useState(false);

  const { data: canWrite } = useCan({ resource: "clinical_encounters", action: "edit" });
  const locked = record ? isEncounterLocked(record) : false;
  // The permission, and the row's own flag: false there means this encounter
  // is outside the caller's write scope.
  const showComplete =
    record?.status === "in_progress" && (canWrite?.can ?? false) && record._can?.write !== false;

  const complete = () => {
    if (!record) return;
    mutate(
      {
        url: `${API_URL}/clinical_encounters/${record.id}/complete`,
        method: "post",
        values: {},
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "clinical_encounters", invalidates: ["detail", "list"], id: record.id });
          open?.({ type: "success", message: "Đã hoàn tất lần khám" });
        },
      }
    );
  };

  return (
    <ShowView>
      <ShowViewHeader resource="clinical_encounters" canEdit={!locked} />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4 px-6">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg leading-6 font-semibold tracking-tight">{record?.patient.fullName ?? "—"}</h2>
                {record && (
                  <Badge variant={ENCOUNTER_STATUS_VARIANTS[record.status] ?? "secondary"}>
                    {ENCOUNTER_STATUS_LABELS[record.status]}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground font-mono text-sm">{record?.patient.customerCode ?? ""}</p>
              {record?.status === "completed" && (
                <p className="text-muted-foreground text-xs">
                  {locked
                    ? "Lần khám đã khoá: hoàn tất quá 24 giờ nên không sửa được nữa."
                    : `Còn sửa được đến ${formatDateTime(record.editableUntil)}.`}
                </p>
              )}
              {showComplete && (
                <Button onClick={() => setConfirming(true)} disabled={mutation.isPending}>
                  <CheckIcon />
                  Hoàn tất lần khám
                </Button>
              )}
            </div>
            <MetaStrip className="shrink-0">
              <MetaItem label="Bắt đầu">{formatDateTime(record?.startedAt)}</MetaItem>
              <MetaItem label="Kết thúc">{record?.endedAt ? formatDateTime(record.endedAt) : "—"}</MetaItem>
            </MetaStrip>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <DetailPanel title="Nội dung khám">
          <DetailList>
            <DetailRow label="Lý do khám">
              <span className="whitespace-pre-wrap">{record?.chiefComplaint ?? <EmptyValue />}</span>
            </DetailRow>
            <DetailRow label="Ghi chú khám">
              {record?.clinicalNote ? <span className="whitespace-pre-wrap">{record.clinicalNote}</span> : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Kết luận">
              {record?.diagnosis ? <span className="whitespace-pre-wrap">{record.diagnosis}</span> : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Dặn dò / tái khám">
              {record?.followUp ? <span className="whitespace-pre-wrap">{record.followUp}</span> : <EmptyValue />}
            </DetailRow>
          </DetailList>
        </DetailPanel>

        <DetailPanel title="Thông tin">
          <DetailList>
            <DetailRow label="Người khám">
              {record?.clinician ? (
                <span>
                  {record.clinician.fullName}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {STAFF_TYPE_LABELS[record.clinician.staffType]}
                  </span>
                </span>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Lịch hẹn">
              {record?.appointmentId ? `#${record.appointmentId}` : <EmptyValue>Không gắn lịch hẹn</EmptyValue>}
            </DetailRow>
          </DetailList>
        </DetailPanel>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tất lần khám này?</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi hoàn tất, nội dung còn sửa được trong 24 giờ, rồi sẽ bị khoá vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Chưa</AlertDialogCancel>
            <AlertDialogAction onClick={complete}>Hoàn tất</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShowView>
  );
};
