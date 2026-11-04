import { useCan, useCustom, useCustomMutation, useNotification } from "@refinedev/core";
import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { DetailList, DetailPanel, DetailRow, EmptyValue } from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";
import type { MedicalRecord, MedicalRecordValues } from "@/domains/medical-record/types";
import { MEDICAL_RECORD_FIELDS } from "@/domains/medical-record/types";

/**
 * A patient's health background: blood type, allergies, history, medication.
 * Read by whoever holds `medical_records:read`, and edited in place by whoever
 * holds `medical_records:write` — the whole record is saved as written.
 *
 * Renders nothing without the read permission, like the encounter panel.
 */
export function MedicalRecordPanel({ customerId }: { customerId: number }) {
  const { open } = useNotification();
  const { data: canRead } = useCan({ resource: "medical_records", action: "show" });
  const { data: canWrite } = useCan({ resource: "medical_records", action: "edit" });

  const url = `${API_URL}/customers/${customerId}/medical-record`;
  const { result, query } = useCustom<MedicalRecord>({
    url,
    method: "get",
    queryOptions: { enabled: canRead?.can ?? false },
  });
  const record = result?.data;

  const { mutate, mutation } = useCustomMutation<MedicalRecord>();
  const [draft, setDraft] = useState<MedicalRecordValues | null>(null);

  if (!canRead?.can) return null;

  const startEditing = () =>
    setDraft(
      Object.fromEntries(MEDICAL_RECORD_FIELDS.map(({ name }) => [name, record?.[name] ?? ""])) as MedicalRecordValues
    );

  const save = () => {
    if (!draft) return;
    mutate(
      {
        url,
        method: "put",
        values: { ...draft, version: record?.version ?? null },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: () => {
          setDraft(null);
          query.refetch();
          open?.({ type: "success", message: "Đã lưu hồ sơ bệnh án" });
        },
      }
    );
  };

  return (
    <DetailPanel
      title="Hồ sơ bệnh án"
      action={
        canWrite?.can && !draft ? (
          <Button size="sm" variant="outline" onClick={startEditing}>
            <PencilIcon />
            Sửa
          </Button>
        ) : record?.updatedAt ? (
          <span className="text-muted-foreground text-xs">Cập nhật {formatDateTime(record.updatedAt)}</span>
        ) : undefined
      }
      bodyClassName={draft ? "p-4" : undefined}
    >
      {draft ? (
        <div className="flex flex-col gap-3">
          {MEDICAL_RECORD_FIELDS.map(({ name, label, rows, max }) => (
            <div key={name} className="flex flex-col gap-1.5">
              <Label htmlFor={`medical-record-${name}`}>{label}</Label>
              <Textarea
                id={`medical-record-${name}`}
                rows={rows}
                maxLength={max}
                value={draft[name]}
                onChange={(event) => setDraft({ ...draft, [name]: event.target.value })}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={save} disabled={mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : "Lưu hồ sơ"}
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={mutation.isPending}>
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <DetailList>
          {MEDICAL_RECORD_FIELDS.map(({ name, label }) => (
            <DetailRow key={name} label={label}>
              {record?.[name] ? <span className="whitespace-pre-wrap">{record[name]}</span> : <EmptyValue />}
            </DetailRow>
          ))}
        </DetailList>
      )}
    </DetailPanel>
  );
}
