import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate, useSearchParams } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import {
  FormSection,
  FormSectionActions,
  SectionedFormPanel,
} from "@/shared/components/form/form-section";
import { isEncounterLocked, type Encounter } from "@/domains/encounter/types";

type EncounterFormValues = {
  chiefComplaint: string;
  clinicalNote: string;
  diagnosis: string;
  followUp: string;
};

const FIELDS: { name: keyof EncounterFormValues; label: string; rows: number; required?: boolean; max: number }[] = [
  { name: "chiefComplaint", label: "Lý do khám / triệu chứng", rows: 3, required: true, max: 5000 },
  { name: "clinicalNote", label: "Ghi chú khám", rows: 5, max: 10000 },
  { name: "diagnosis", label: "Kết luận của bác sĩ", rows: 3, max: 5000 },
  { name: "followUp", label: "Dặn dò / tái khám", rows: 3, max: 5000 },
];

/**
 * Opening and editing an encounter are the same four fields
 * (`EncounterRequest`). Whose visit it is comes from the page that opened the
 * form — `?customerId=` and optionally `&appointmentId=` — and is fixed after
 * that: an encounter does not move to another patient.
 */
function EncounterForm({ submitLabel, patient }: { submitLabel: string; patient?: Record<string, number> }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Encounter, HttpError, EncounterFormValues>({
    refineCoreProps: { resource: "clinical_encounters", redirect: "show" },
    defaultValues: { chiefComplaint: "", clinicalNote: "", diagnosis: "", followUp: "" },
  });
  const record = query?.data?.data;

  // Reached by URL after the 24 hours: say so instead of taking text the API will refuse.
  if (record && isEncounterLocked(record)) {
    return (
      <Alert>
        <AlertDescription>Lần khám này đã hoàn tất quá 24 giờ nên đã khoá, không sửa được nữa.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record carries far more.
          onFinish({
            ...patient,
            chiefComplaint: values.chiefComplaint,
            clinicalNote: values.clinicalNote ?? "",
            diagnosis: values.diagnosis ?? "",
            followUp: values.followUp ?? "",
          } as EncounterFormValues)
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection
            title={record ? `Lần khám của ${record.patient.fullName}` : "Lần khám"}
            description="Hệ thống chỉ ghi nhận nội dung do nhân viên y tế nhập; không tự chẩn đoán hay kê đơn."
          >
            {FIELDS.map(({ name, label, rows, required, max }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                rules={{
                  required: required ? "Vui lòng nhập lý do khám" : false,
                  maxLength: { value: max, message: `Tối đa ${max} ký tự` },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-6">
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} rows={rows} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </FormSection>
          <FormSectionActions>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu..." : submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Hủy
            </Button>
          </FormSectionActions>
        </SectionedFormPanel>
      </form>
    </Form>
  );
}

export const EncounterCreate = () => {
  const [params] = useSearchParams();
  const customerId = Number(params.get("customerId"));
  const appointmentId = Number(params.get("appointmentId"));
  const patientName = params.get("patient");

  return (
    <CreateView>
      <CreateViewHeader resource="clinical_encounters" title={patientName ? `Lần khám mới — ${patientName}` : undefined} />
      {customerId ? (
        <EncounterForm
          submitLabel="Bắt đầu lần khám"
          patient={{ customerId, ...(appointmentId ? { appointmentId } : {}) }}
        />
      ) : (
        <Alert>
          <AlertDescription>
            Lần khám được tạo từ trang bệnh nhân hoặc từ lượt đăng ký khám đã tiếp nhận, để biết đang khám cho ai.
          </AlertDescription>
        </Alert>
      )}
    </CreateView>
  );
};

export const EncounterEdit = () => (
  <EditView>
    <EditViewHeader resource="clinical_encounters" />
    <EncounterForm submitLabel="Lưu thay đổi" />
  </EditView>
);
