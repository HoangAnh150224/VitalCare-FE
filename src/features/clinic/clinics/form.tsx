import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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

type ClinicFormValues = { name: string; address: string; contactPhone: string };

/**
 * Creating and editing a clinic are the same three fields (`ClinicRequest`),
 * so one form serves both. Opening hours are set on the clinic's own page
 * afterwards; until then nothing can be booked there.
 */
function ClinicForm({ submitLabel }: { submitLabel: string }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<ClinicFormValues, HttpError, ClinicFormValues>({
    refineCoreProps: { redirect: "show" },
    defaultValues: { name: "", address: "", contactPhone: "" },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record also carries id and status.
          onFinish({ name: values.name, address: values.address ?? "", contactPhone: values.contactPhone ?? "" })
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection title="Phòng khám" description="Giờ làm việc được đặt ở trang chi tiết sau khi lưu.">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Vui lòng nhập tên phòng khám", maxLength: { value: 255, message: "Tối đa 255 ký tự" } }}
              render={({ field }) => (
                <FormItem className="md:col-span-4">
                  <FormLabel>Tên phòng khám</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="VitalCare Clinic – Cơ sở 3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              rules={{ maxLength: { value: 500, message: "Tối đa 500 ký tự" } }}
              render={({ field }) => (
                <FormItem className="md:col-span-4">
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              rules={{ maxLength: { value: 50, message: "Tối đa 50 ký tự" } }}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Điện thoại</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} className="font-mono" />
                  </FormControl>
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
    <ClinicForm submitLabel="Tạo phòng khám" />
  </CreateView>
);

export const ClinicEdit = () => (
  <EditView>
    <EditViewHeader />
    <ClinicForm submitLabel="Lưu thay đổi" />
  </EditView>
);
