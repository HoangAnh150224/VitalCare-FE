import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
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
import { CLINIC_STATUS_LABELS, type ClinicStatus } from "@/domains/clinic/types";

type ClinicFormValues = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  address: string;
  operatingStatus: ClinicStatus;
};

type TextField = {
  name: Exclude<keyof ClinicFormValues, "operatingStatus">;
  label: string;
  required: string;
  max: number;
  placeholder?: string;
  type?: string;
  pattern?: { value: RegExp; message: string };
};

// KAN-44: the same Vietnamese number `ClinicRequest` takes — mobile (0 + 9 digits) or
// landline (0 + 10), or either after +84, spaces, dots, dashes and brackets allowed.
const PHONE = /^[\s.()-]*(?:\+?84|0)[\s.()-]*[1-9](?:[\s.()-]*\d){8,9}[\s.()-]*$/;

// SRS 3.18.2 / 3.18.4, in the order the wireframe lays them out.
const TEXT_FIELDS: TextField[] = [
  { name: "name", label: "Tên phòng khám", required: "Vui lòng nhập tên phòng khám", max: 255, placeholder: "VitalCare Clinic – Cơ sở 3" },
  { name: "contactEmail", label: "Email liên hệ", required: "Vui lòng nhập email liên hệ", max: 255, placeholder: "contact@vitalcare.vn", type: "email",
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Vui lòng nhập email hợp lệ" } },
  { name: "contactPhone", label: "Điện thoại liên hệ", required: "Vui lòng nhập điện thoại liên hệ", max: 50, placeholder: "+84 28 …",
    pattern: { value: PHONE, message: "Số điện thoại không hợp lệ. Vui lòng nhập một số khác" } },
  { name: "contactPerson", label: "Người liên hệ", required: "Vui lòng nhập người liên hệ", max: 255, placeholder: "Văn phòng phòng khám" },
  { name: "address", label: "Địa chỉ", required: "Vui lòng nhập địa chỉ", max: 500, placeholder: "Đường, phường/xã, tỉnh/thành phố" },
];

const FIELD_NAMES: Record<string, true> = Object.fromEntries(
  [...TEXT_FIELDS.map((field) => field.name), "operatingStatus"].map((name) => [name, true])
);

/**
 * Creating and editing a clinic are the same fields (`ClinicRequest`, SRS
 * 3.18.2 / 3.18.4), so one form serves both. A clinic marked as no longer
 * operating takes no new visits; what it already holds stays.
 */
function ClinicForm({ submitLabel, editing = false }: { submitLabel: string; editing?: boolean }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<ClinicFormValues, HttpError, ClinicFormValues>({
    refineCoreProps: {
      redirect: "show",
      // A refused field (a duplicate name, KAN-45) is said under that field by the
      // server-side validation useForm applies, not again as "Validation failed" in a toast.
      // A 422 naming no field of this form still says so.
      errorNotification: (error) =>
        error?.statusCode === 422 && Object.keys(error.errors ?? {}).some((key) => key in FIELD_NAMES)
          ? false
          : { type: "error", message: "Không lưu được phòng khám. Vui lòng thử lại." },
    },
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      contactPerson: "",
      address: "",
      operatingStatus: "OPERATING",
    },
  });

  // "Làm mới" means "back to what is saved": a refetch alone leaves the typed
  // values in place when the record has not changed (KAN-48).
  async function reload() {
    const fresh = (await query?.refetch())?.data?.data;
    if (!fresh) return;
    form.reset({
      name: fresh.name ?? "",
      contactEmail: fresh.contactEmail ?? "",
      contactPhone: fresh.contactPhone ?? "",
      contactPerson: fresh.contactPerson ?? "",
      address: fresh.address ?? "",
      operatingStatus: fresh.operatingStatus ?? "OPERATING",
    });
  }

  return (
    <>
    {editing && <EditViewHeader onRefresh={() => void reload()} />}
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record also carries id and counts.
          onFinish({
            name: values.name.trim(),
            contactEmail: values.contactEmail.trim(),
            contactPhone: values.contactPhone.trim(),
            contactPerson: values.contactPerson.trim(),
            address: values.address.trim(),
            operatingStatus: values.operatingStatus,
          })
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection
            title="Thông tin phòng khám"
            contentClassName="items-start"
            description="Thay đổi ảnh hưởng tới quản trị phòng khám. Truy cập dữ liệu sức khỏe bệnh nhân cần được cấp quyền riêng."
          >
            {TEXT_FIELDS.map(({ name, label, required, max, placeholder, type, pattern }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                rules={{
                  required,
                  validate: (value) => (value ?? "").trim() !== "" || required,
                  pattern,
                  maxLength: { value: max, message: `Tối đa ${max} ký tự` },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>{label} <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} aria-required="true" type={type} value={field.value ?? ""} placeholder={placeholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="operatingStatus"
              rules={{ required: "Vui lòng chọn trạng thái hoạt động" }}
              render={({ field }) => (
                <FormItem className="md:col-span-4">
                  <FormLabel>Trạng thái hoạt động <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full" aria-required="true">
                        <SelectValue placeholder="Chọn trạng thái hoạt động" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(CLINIC_STATUS_LABELS) as ClinicStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {CLINIC_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
    </>
  );
}

export const ClinicCreate = () => (
  <CreateView>
    <CreateViewHeader />
    <ClinicForm submitLabel="Lưu phòng khám" />
  </CreateView>
);

export const ClinicEdit = () => (
  <EditView>
    <ClinicForm submitLabel="Lưu thay đổi" editing />
  </EditView>
);
