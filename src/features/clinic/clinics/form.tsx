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
  required?: string;
  max: number;
  placeholder?: string;
  type?: string;
};

// SRS 3.18.2 / 3.18.4, in the order the wireframe lays them out.
const TEXT_FIELDS: TextField[] = [
  { name: "name", label: "Tên phòng khám", required: "Vui lòng nhập tên phòng khám", max: 255, placeholder: "VitalCare Clinic – Cơ sở 3" },
  { name: "contactEmail", label: "Email liên hệ", required: "Vui lòng nhập email liên hệ", max: 255, placeholder: "contact@vitalcare.vn", type: "email" },
  { name: "contactPhone", label: "Điện thoại liên hệ", required: "Vui lòng nhập điện thoại liên hệ", max: 50, placeholder: "+84 28 …" },
  { name: "contactPerson", label: "Người liên hệ", max: 255, placeholder: "Văn phòng phòng khám" },
  { name: "address", label: "Địa chỉ", required: "Vui lòng nhập địa chỉ", max: 500, placeholder: "Đường, phường/xã, tỉnh/thành phố" },
];

/**
 * Creating and editing a clinic are the same fields (`ClinicRequest`, SRS
 * 3.18.2 / 3.18.4), so one form serves both. A clinic marked as no longer
 * operating takes no new visits; what it already holds stays.
 */
function ClinicForm({ submitLabel }: { submitLabel: string }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<ClinicFormValues, HttpError, ClinicFormValues>({
    refineCoreProps: { redirect: "show" },
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      contactPerson: "",
      address: "",
      operatingStatus: "OPERATING",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record also carries id and counts.
          onFinish({
            name: values.name.trim(),
            contactEmail: values.contactEmail.trim(),
            contactPhone: values.contactPhone.trim(),
            contactPerson: values.contactPerson ?? "",
            address: values.address.trim(),
            operatingStatus: values.operatingStatus,
          })
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection
            title="Thông tin phòng khám"
            description="Thay đổi ảnh hưởng tới quản trị phòng khám. Truy cập dữ liệu sức khỏe bệnh nhân cần được cấp quyền riêng."
          >
            {TEXT_FIELDS.map(({ name, label, required, max, placeholder, type }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                rules={{
                  validate: required ? (value) => (value ?? "").trim() !== "" || required : undefined,
                  maxLength: { value: max, message: `Tối đa ${max} ký tự` },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input {...field} type={type} value={field.value ?? ""} placeholder={placeholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="operatingStatus"
              render={({ field }) => (
                <FormItem className="md:col-span-4">
                  <FormLabel>Trạng thái hoạt động</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "OPERATING"}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
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
    <EditViewHeader />
    <ClinicForm submitLabel="Lưu thay đổi" />
  </EditView>
);
