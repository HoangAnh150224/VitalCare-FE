import { useCan, useList, useNavigation, useNotification, type BaseKey, type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { formatMoney } from "@/shared/lib/format";
import type { MedicalService } from "@/domains/billing/types";
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
import { ServicePicker } from "../service-orders/service-picker";

type TextField = "chiefComplaint" | "examinationFindings" | "clinicalNote" | "diagnosis" | "followUp";

/** Number inputs hold text until sent; an empty one is "not measured". */
type EncounterFormValues = Record<TextField, string> & {
  vitals: Record<keyof VisitVitals, string | number | null>;
  /** Services ordered with a new visit, each sent once the visit exists. */
  services: { serviceId: string; instruction: string }[];
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
  const { data: canConclude } = useCan({ resource: "clinical_encounters", action: "conclude" });
  const writesDiagnosis = canConclude?.can ?? false;
  const customerId = patient?.customerId;
  // Services too are ordered with a new visit; later ones go on the visit's own page.
  const { data: canOrderServices } = useCan({ resource: "service_orders", action: "create" });
  const offersServices = Boolean(customerId && canOrderServices?.can);
  const { result: serviceList } = useList<MedicalService>({
    resource: "medical_services",
    pagination: { mode: "off" },
    queryOptions: { enabled: offersServices },
  });
  // The examination fee is on every bill, never ordered.
  const services = (serviceList?.data ?? []).filter((s) => s.status === "active" && s.category !== "consultation");
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Encounter, HttpError, EncounterFormValues>({
    refineCoreProps: {
      resource: "clinical_encounters",
      // A new visit opens once its service orders are saved too.
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
      services: [],
    },
  });
  const record = query?.data?.data;
  const serviceRows = useFieldArray({ control: form.control, name: "services" });
  const chosenServices = form.watch("services");
  const servicesTotal = chosenServices.reduce(
    (sum, row) => sum + (services.find((s) => String(s.id) === row.serviceId)?.price ?? 0),
    0
  );

  /** After the visit is saved: its service orders, then the visit itself. */
  const afterCreate = async (encounterId: BaseKey, values: EncounterFormValues) => {
    if (offersServices) {
      const failed: string[] = [];
      for (const row of values.services) {
        try {
          await kyInstance
            .post(`clinical_encounters/${encounterId}/service_orders`, {
              json: { serviceId: Number(row.serviceId), instruction: row.instruction.trim() || null },
            })
            .json();
        } catch {
          failed.push(services.find((s) => String(s.id) === row.serviceId)?.name ?? `dịch vụ #${row.serviceId}`);
        }
      }
      if (failed.length) {
        notify?.({
          type: "error",
          message: "Đã lưu lần khám nhưng chưa chỉ định được dịch vụ",
          description: `${failed.join(", ")}. Chỉ định lại trên trang lần khám.`,
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

          {offersServices && (
            <FormSection
              title="Chỉ định dịch vụ"
              description="Xét nghiệm, chẩn đoán hình ảnh... bệnh nhân đi làm sau khi lưu. Không bắt buộc."
            >
              {serviceRows.fields.map((row, index) => (
                <div key={row.id} className="grid grid-cols-1 gap-3 md:col-span-12 md:grid-cols-12 md:items-start">
                  <FormField
                    control={form.control}
                    name={`services.${index}.serviceId`}
                    rules={{ required: "Chọn dịch vụ" }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-5">
                        <FormControl>
                          <ServicePicker
                            ref={field.ref}
                            services={services}
                            value={field.value}
                            onChange={field.onChange}
                            aria-label={`Dịch vụ ${index + 1}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`services.${index}.instruction`}
                    rules={{ maxLength: { value: 1000, message: "Tối đa 1000 ký tự" } }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormControl>
                          <Input {...field} placeholder="Ghi chú cho người thực hiện (không bắt buộc)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:col-span-1"
                    aria-label="Bỏ dịch vụ này"
                    onClick={() => serviceRows.remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3 md:col-span-12">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => serviceRows.append({ serviceId: "", instruction: "" })}
                >
                  <PlusIcon />
                  Thêm dịch vụ
                </Button>
                {servicesTotal > 0 && (
                  <span className="text-muted-foreground text-sm tabular-nums">
                    Tổng {formatMoney(servicesTotal)}
                  </span>
                )}
              </div>
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
      {/* Only from a checked-in booking: the visit's result reaches the patient through it. */}
      {customerId && appointmentId ? (
        <EncounterForm
          submitLabel="Lưu"
          patient={{ customerId, appointmentId }}
        />
      ) : (
        <Alert>
          <AlertDescription>
            Lần khám được tạo từ lượt đăng ký khám đã tiếp nhận (trang Đăng ký khám hoặc bảng điều phối phòng
            khám), để kết quả gửi về đúng lượt khám của bệnh nhân. Bệnh nhân cần đặt lịch trước.
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
