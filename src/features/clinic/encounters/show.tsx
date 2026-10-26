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
import { bodyMassIndex, ENCOUNTER_STATUS_LABELS, isEncounterLocked, VITAL_FIELDS } from "@/domains/encounter/types";
import { STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { ENCOUNTER_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { billingErrorNotification } from "@/domains/billing/messages";
import { EncounterOrdersPanel, useEncounterOrders } from "../service-orders/encounter-orders-panel";

/** One encounter: what was recorded at the visit, and the step that closes it. */
export const EncounterShow = () => {
  const { result: record, query } = useShow<Encounter>({ resource: "clinical_encounters" });
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { mutate, mutation } = useCustomMutation<Encounter>();
  const [confirming, setConfirming] = useState(false);

  // Concluding is the doctor's sign-off (clinical_encounters:conclude); a nurse writes the form but does not close it.
  const { data: canConclude } = useCan({ resource: "clinical_encounters", action: "conclude" });
  const { data: canWrite } = useCan({ resource: "clinical_encounters", action: "edit" });
  const locked = record ? isEncounterLocked(record) : false;
  const { data: canReadOrders } = useCan({ resource: "service_orders", action: "list" });
  const readsOrders = canReadOrders?.can ?? false;
  // Report 1 FE-22: the visit is concluded once every ordered result has been read.
  const { outstanding } = useEncounterOrders(record?.id, readsOrders);
  // The permission, and the row's own flag: false there means this encounter
  // is outside the caller's write scope.
  const showComplete =
    record?.status === "in_progress" && (canConclude?.can ?? false) && record._can?.write !== false;
  const waitsForDoctor =
    record?.status === "in_progress" && !(canConclude?.can ?? false) && (canWrite?.can ?? false);
  const noDiagnosis = !record?.diagnosis;
  const bmi = bodyMassIndex(record?.vitals ?? null);

  const complete = () => {
    if (!record) return;
    mutate(
      {
        url: `${API_URL}/clinical_encounters/${record.id}/complete`,
        method: "post",
        values: {},
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
        // Concluding now also checks the ordered services and issues the bill.
        errorNotification: billingErrorNotification,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "clinical_encounters", invalidates: ["detail", "list"], id: record.id });
          invalidate({ resource: "invoices", invalidates: ["list"] });
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
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => setConfirming(true)}
                    disabled={mutation.isPending || outstanding > 0 || noDiagnosis}
                  >
                    <CheckIcon />
                    Hoàn tất lần khám
                  </Button>
                  {(noDiagnosis || outstanding > 0) && (
                    <span className="text-muted-foreground text-sm">
                      {[
                        noDiagnosis && "Ghi chẩn đoán trước khi hoàn tất.",
                        outstanding > 0 && `Còn ${outstanding} dịch vụ chưa có kết quả hoặc chưa xem.`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                  )}
                </div>
              )}
              {waitsForDoctor && (
                <p className="text-muted-foreground text-sm">Bác sĩ ghi chẩn đoán và hoàn tất lần khám.</p>
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
            <DetailRow label="Triệu chứng">
              <span className="whitespace-pre-wrap">{record?.chiefComplaint ?? <EmptyValue />}</span>
            </DetailRow>
            <DetailRow label="Thông tin khám">
              {record?.examinationFindings ? (
                <span className="whitespace-pre-wrap">{record.examinationFindings}</span>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
            <DetailRow label="Ghi chú lâm sàng">
              {record?.clinicalNote ? <span className="whitespace-pre-wrap">{record.clinicalNote}</span> : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Chẩn đoán">
              {record?.diagnosis ? <span className="whitespace-pre-wrap">{record.diagnosis}</span> : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Theo dõi / tái khám">
              {record?.followUp ? <span className="whitespace-pre-wrap">{record.followUp}</span> : <EmptyValue />}
            </DetailRow>
          </DetailList>
        </DetailPanel>

        <div className="flex min-w-0 flex-col gap-4">
        <DetailPanel title="Chỉ số sinh tồn">
          {record?.vitals ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
              {VITAL_FIELDS.filter((f) => f.name !== "systolicBp" && f.name !== "diastolicBp").map((f) => (
                <div key={f.name}>
                  <dt className="text-muted-foreground text-xs">{f.label}</dt>
                  <dd className="tabular-nums">
                    {record.vitals?.[f.name] != null ? (
                      <>
                        <span className="text-base font-semibold">{record.vitals[f.name]}</span>{" "}
                        <span className="text-muted-foreground text-xs">{f.unit}</span>
                      </>
                    ) : (
                      <EmptyValue />
                    )}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-muted-foreground text-xs">Huyết áp</dt>
                <dd className="tabular-nums">
                  {record.vitals.systolicBp != null || record.vitals.diastolicBp != null ? (
                    <>
                      <span className="text-base font-semibold">
                        {record.vitals.systolicBp ?? "—"}/{record.vitals.diastolicBp ?? "—"}
                      </span>{" "}
                      <span className="text-muted-foreground text-xs">mmHg</span>
                    </>
                  ) : (
                    <EmptyValue />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">BMI</dt>
                <dd className="tabular-nums">
                  {bmi != null ? <span className="text-base font-semibold">{bmi}</span> : <EmptyValue />}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground px-4 py-3 text-sm">Chưa đo tại lần khám này.</p>
          )}
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
            <DetailRow label="Đăng ký khám">
              {record?.appointmentId ? `#${record.appointmentId}` : <EmptyValue>Không gắn lượt đăng ký khám</EmptyValue>}
            </DetailRow>
          </DetailList>
        </DetailPanel>
        </div>
      </div>

      {record && readsOrders && (
        <EncounterOrdersPanel encounterId={record.id} open={record.status === "in_progress"} />
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tất lần khám này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống lập hóa đơn gồm phí khám và các dịch vụ đã làm. Nội dung khám còn sửa được trong 24 giờ, rồi
              sẽ bị khoá vĩnh viễn.
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
