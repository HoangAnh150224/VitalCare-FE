import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

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
import type { Customer } from "@/domains/customer/types";
import { GENDER_OPTIONS } from "@/domains/customer/types";

/** What `PATCH /customers/{id}` accepts — the profile, nothing else. */
type CustomerFormValues = Pick<
  Customer,
  "dateOfBirth" | "gender" | "address" | "emergencyContactName" | "emergencyContactPhone"
>;

/**
 * Correcting a customer's profile.
 *
 * Name and phone number are not here: they belong to the account, and the
 * phone number is how the person signs in — it is changed on the user screen,
 * where changing it also ends the sessions opened with the old one. Status is
 * not here either: becoming a patient is its own action.
 */
export const CustomerEdit = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish },
    ...form
  } = useForm<Customer>({ refineCoreProps: {} });

  function onSubmit(values: Record<string, unknown>) {
    const v = values as CustomerFormValues;
    // Only the profile fields go back. An empty text field is sent as "" —
    // which the API reads as "clear it" — rather than dropped.
    onFinish({
      dateOfBirth: v.dateOfBirth || null,
      gender: v.gender ?? "",
      address: v.address ?? "",
      emergencyContactName: v.emergencyContactName ?? "",
      emergencyContactPhone: v.emergencyContactPhone ?? "",
    } as unknown as Customer);
  }

  return (
    <EditView>
      <EditViewHeader />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0">
          <SectionedFormPanel>
            <FormSection
              title="Hồ sơ"
              description="Thông tin phòng khám lưu về khách hàng. Họ tên và số điện thoại thuộc tài khoản đăng nhập, sửa ở màn hình Người dùng."
            >
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Ngày sinh</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Giới tính</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chưa chọn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                rules={{ maxLength: { value: 500, message: "Tối đa 500 ký tự" } }}
                render={({ field }) => (
                  <FormItem className="md:col-span-8">
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSection
              title="Liên hệ khẩn cấp"
              description="Người phòng khám gọi khi không liên lạc được với bệnh nhân."
            >
              <FormField
                control={form.control}
                name="emergencyContactName"
                rules={{ maxLength: { value: 255, message: "Tối đa 255 ký tự" } }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Họ và tên</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                rules={{ maxLength: { value: 50, message: "Tối đa 50 ký tự" } }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" inputMode="tel" value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Có thể là số cố định.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>
        </form>
      </Form>
    </EditView>
  );
};
