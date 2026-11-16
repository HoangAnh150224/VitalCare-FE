import { useCan, useNavigation, useNotification, type BaseKey, type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Textarea } from "@/shared/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  isEncounterLocked,
  VITAL_FIELDS,
  type Encounter,
  type VisitVitals,
} from "@/domains/encounter/types";
import { billingErrorNotification } from "@/domains/billing/messages";
import { monitoringOrdersKey, useMonitoringOrders } from "../monitoring/use-monitoring-orders";

type TextField = "chiefComplaint" | "examinationFindings" | "clinicalNote" | "diagnosis" | "followUp";

/** Number inputs hold text until sent; an empty one is "not measured". */
type EncounterFormValues = Record<TextField, string> & {
  vitals: Record<keyof VisitVitals, string | number | null>;
  /** BF-04, optional: home monitoring ordered at this visit. Not part of the encounter's own request. */
  monitoring: {
    ordered: boolean;
    reason: string;
    decision: "" | "ACCEPTED" | "DECLINED";
    note: string;
  };
};

const EXAMINATION: { name: TextField; label: string; rows: number; max: number; placeholder?: string }[] = [
  { name: "chiefComplaint", label: "Triệu chứng / lý do khám", rows: 3, max: 5000, placeholder: "Điều bệnh nhân khai" },
  { name: "examinationFindings", label: "Thông tin khám", rows: 4, max: 10000, placeholder: "Kết quả thăm khám lâm sàng" },
  { name: "clinicalNote", label: "Ghi chú lâm sàng", rows: 3, max: 10000 },
];

const EMPTY_VITALS = Object.fromEntries(VITAL_FIELDS.map((f) => [f.name, ""])) as EncounterFormValues["vitals"];

const toNumber = (value: string | number | null | undefined) =>
  value === "" || value == null || Number.isNaN(Number(value)) ? null : Number(value);

/**
 * Opening and editing an encounter are the same form (`EncounterRequest`), in
 * the order of the visit: what the patient says and what was found, the vital
 * signs, then the doctor's diagnosis and what to do next. Whose visit it is
 * comes from the page that opened the form — `?customerId=` and optionally
 * `&appointmentId=` — and is fixed after that.
 *
 * The diagnosis is the doctor's (`clinical_encounters:conclude`). Anyone else
 * sees it read-only: still sent back as it was, so saving the rest is not
 * mistaken for changing it.
 */
function EncounterForm({ submitLabel, patient }: { submitLabel: string; patient?: Record<string, number> }) {
  const navigate = useNavigate();
  const { show } = useNavigation();
  const { open: notify } = useNotification();
  const queryClient = useQueryClient();
  const { data: canConclude } = useCan({ resource: "clinical_encounters", action: "conclude" });
  const writesDiagnosis = canConclude?.can ?? false;
  const customerId = patient?.customerId;
  // Monitoring is ordered with a new visit only, and not over one already running.
  const { data: canOrder } = useCan({ resource: "monitoring_orders", action: "create" });
  const { data: orders } = useMonitoringOrders(customerId ?? 0, Boolean(customerId && canOrder?.can));
  const alreadyMonitored = orders?.some((o) => o.status === "ACTIVE") ?? false;
  const offersMonitoring = Boolean(customerId && canOrder?.can && orders && !alreadyMonitored);
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Encounter, HttpError, EncounterFormValues>({
    refineCoreProps: {
      resource: "clinical_encounters",
      // A new visit opens once its monitoring order (if any) is saved too.
      redirect: patient ? false : "show",
      // The refusal in Vietnamese: a 422 names what is missing (BF-02: the fee unpaid).
      errorNotification: billingErrorNotification,
    },
    defaultValues: {
      chiefComplaint: "",
      examinationFindings: "",
      clinicalNote: "",
      diagnosis: "",
      followUp: "",
      vitals: EMPTY_VITALS,
      monitoring: { ordered: false, reason: "", decision: "", note: "" },
    },
  });
  const record = query?.data?.data;
  const monitoringOrdered = form.watch("monitoring.ordered");

  /** After the visit is saved: its monitoring order, then the visit itself. */
  const afterCreate = async (encounterId: BaseKey, values: EncounterFormValues) => {
    const m = values.monitoring;
    if (offersMonitoring && m.ordered && customerId) {
      try {
        await kyInstance
          .post("monitoring_orders", {
            json: {
              customerId,
              encounterId,
              reason: m.reason.trim(),
              decision: m.decision,
              consentNote: m.note.trim() || null,
            },
          })
          .json();
        await queryClient.invalidateQueries({ queryKey: monitoringOrdersKey(customerId) });
      } catch {
        notify?.({
          type: "error",
          message: "Đã lưu lần khám nhưng chưa lưu được chỉ định theo dõi IoMT",
          description: "Bệnh nhân có thể đang có chỉ định theo dõi khác.",
        });
      }
    }
    show("clinical_encounters", encounterId);
  };

  // Reached by URL after the 24 hours: say so instead of taking text the API will refuse.
  if (record && isEncounterLocked(record)) {
    return (
      <Alert>
        <AlertDescription>Lần khám này đã hoàn tất quá 24 giờ nên đã khoá, không sửa được nữa.</AlertDescription>
      </Alert>
    );
  }

  const textField = (name: TextField, label: string, rows: number, max: number, extra?: {
    required?: string;
    placeholder?: string;
    readOnly?: boolean;
    description?: string;
    span?: string;
  }) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      rules={{
        required: extra?.required ?? false,
        maxLength: { value: max, message: `Tối đa ${max} ký tự` },
      }}
      render={({ field }) => (
        <FormItem className={extra?.span ?? "md:col-span-6"}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ""}
              rows={rows}
              placeholder={extra?.placeholder}
              readOnly={extra?.readOnly}
              className={extra?.readOnly ? "bg-muted/50 cursor-not-allowed" : undefined}
            />
          </FormControl>
          {extra?.description && <FormDescription>{extra.description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record carries far more.
          onFinish({
            ...patient,
            chiefComplaint: values.chiefComplaint,
            examinationFindings: values.examinationFindings ?? "",
            clinicalNote: values.clinicalNote ?? "",
            diagnosis: values.diagnosis ?? "",
            followUp: values.followUp ?? "",
            vitals: Object.fromEntries(VITAL_FIELDS.map((f) => [f.name, toNumber(values.vitals?.[f.name])])),
          } as unknown as EncounterFormValues)
            .then((result) => {
              const id = (result as { data?: { id?: BaseKey } } | void)?.data?.id;
              if (patient && id != null) return afterCreate(id, values);
            })
            .catch(() => {
              // Said by the notification above; nothing left to throw.
            })
        )}
        className="min-w-0"
        // The ranges are checked below with Vietnamese messages; the browser's own
        // tooltip would get there first and say it in the browser's language.
        noValidate
      >
        <SectionedFormPanel>
          <FormSection
            title={record ? `Lần khám của ${record.patient.fullName}` : "Thăm khám"}
            description="Hệ thống chỉ ghi nhận nội dung do nhân viên y tế nhập; không tự chẩn đoán hay kê đơn."
          >
            {EXAMINATION.map(({ name, label, rows, max, placeholder }) =>
              textField(name, label, rows, max, {
                placeholder,
                required: name === "chiefComplaint" ? "Vui lòng nhập triệu chứng hoặc lý do khám" : undefined,
                span: name === "clinicalNote" ? "md:col-span-12" : "md:col-span-6",
              })
            )}
          </FormSection>

          <FormSection title="Chỉ số sinh tồn" description="Đo tại lần khám. Bỏ trống chỉ số không đo.">
            {VITAL_FIELDS.map((vital) => (
              <FormField
                key={vital.name}
                control={form.control}
                name={`vitals.${vital.name}`}
                rules={{
                  validate: (value) => {
                    const number = toNumber(value);
                    if (value !== "" && value != null && number == null) return "Không phải số";
                    if (number != null && (number < vital.min || number > vital.max)) {
                      return `Từ ${vital.min} đến ${vital.max} ${vital.unit}`;
                    }
                    // The API keeps one decimal (numeric(4,1)/(5,1)) and whole numbers for the rest.
                    const scale = vital.step < 1 ? 10 : 1;
                    // A tolerance, because 38.6 * 10 is 386.00000000000006 in floating point.
                    if (number != null && Math.abs(Math.round(number * scale) - number * scale) > 1e-6) {
                      return scale === 10 ? "Tối đa 1 chữ số thập phân" : "Nhập số nguyên";
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>
                      {vital.label} <span className="text-muted-foreground font-normal">({vital.unit})</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="number"
                        inputMode="decimal"
                        min={vital.min}
                        max={vital.max}
                        step={vital.step}
                        className="tabular-nums"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </FormSection>

          <FormSection
            title="Chẩn đoán và hướng xử trí"
            description="Chẩn đoán do bác sĩ ghi; bác sĩ hoàn tất lần khám là xác nhận phiếu."
          >
            {textField("diagnosis", "Chẩn đoán", 3, 5000, {
              readOnly: !writesDiagnosis,
              placeholder: writesDiagnosis ? "Chẩn đoán chính, bệnh kèm theo nếu có" : undefined,
              description: writesDiagnosis ? undefined : "Bác sĩ ghi chẩn đoán.",
            })}
            {textField("followUp", "Hướng dẫn theo dõi / tái khám", 3, 5000)}
          </FormSection>

          {offersMonitoring && (
            <FormSection
              title="Chỉ định theo dõi IoMT"
              description="Không bắt buộc. Thiết bị chỉ được gán khi bệnh nhân đã đồng ý."
            >
              <FormField
                control={form.control}
                name="monitoring.ordered"
                render={({ field }) => (
                  <FormItem className="md:col-span-12">
                    <Label className="flex items-center gap-2 font-normal">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                      </FormControl>
                      Chỉ định theo dõi tại nhà bằng vòng đeo
                    </Label>
                  </FormItem>
                )}
              />
              {monitoringOrdered && (
                <>
                  <FormField
                    control={form.control}
                    name="monitoring.reason"
                    rules={{
                      validate: (v, all) =>
                        !all.monitoring.ordered || Boolean(v.trim()) || "Nhập lý do chỉ định",
                      maxLength: { value: 1000, message: "Tối đa 1000 ký tự" },
                    }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel>Lý do chỉ định</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="VD theo dõi SpO₂ sau viêm phổi" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monitoring.note"
                    rules={{ maxLength: { value: 1000, message: "Tối đa 1000 ký tự" } }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel>Ghi chú</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Đã giải thích mục đích, cách đeo, phạm vi theo dõi..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monitoring.decision"
                    rules={{
                      validate: (v, all) =>
                        !all.monitoring.ordered || v !== "" || "Chọn bệnh nhân đồng ý hay từ chối",
                    }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-12">
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                            <Label className="flex items-center gap-2 font-normal">
                              <RadioGroupItem value="ACCEPTED" />
                              Bệnh nhân đồng ý
                            </Label>
                            <Label className="flex items-center gap-2 font-normal">
                              <RadioGroupItem value="DECLINED" />
                              Bệnh nhân từ chối
                            </Label>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </FormSection>
          )}

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
          submitLabel="Lưu"
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
