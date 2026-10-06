import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";
import { useWatch } from "react-hook-form";

import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import {
  FormSection,
  FormSectionActions,
  SectionedFormPanel,
} from "@/shared/components/form/form-section";
import type { Employee } from "@/domains/employee/types";
import { EMPLOYEE_STATUS_OPTIONS } from "@/domains/employee/types";
import { ProfileFields } from "./profile-fields";

/**
 * Editing a member of staff's record, and recording that they have left.
 *
 * Setting somebody inactive is the consequential change here, and the form
 * says what it does before it is saved: every care team they are on ends, and
 * their account stops signing in.
 */
export const StaffEdit = () => {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Employee, HttpError, Employee>({ refineCoreProps: {} });

  const original = query?.data?.data?.status;
  const status = useWatch({ control: form.control, name: "status" });
  const leaving = original === "active" && status === "inactive";

  function onSubmit(values: Employee) {
    onFinish({
      specialty: values.specialty ?? "",
      professionalTitle: values.professionalTitle ?? "",
      licenseNo: values.licenseNo ?? "",
      clinicPosition: values.clinicPosition ?? "",
      status: values.status,
    } as unknown as Employee);
  }

  return (
    <EditView>
      <EditViewHeader />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0">
          <SectionedFormPanel>
            <FormSection
              title="Hồ sơ chuyên môn"
              description="Họ tên và số điện thoại thuộc tài khoản đăng nhập, sửa ở màn hình Người dùng."
            >
              <ProfileFields control={form.control} />
            </FormSection>

            <FormSection title="Trạng thái" description="Nhân viên nghỉ việc được chuyển sang Đã nghỉ, không xoá.">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYEE_STATUS_OPTIONS.map((option) => (
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
              {leaving && (
                <p className="text-warning md:col-span-8 text-sm">
                  Khi lưu, nhân viên này sẽ được gỡ khỏi mọi nhóm chăm sóc đang theo dõi và tài khoản
                  không đăng nhập được nữa. Thiết bị bệnh nhân đang đeo không bị thu hồi.
                </p>
              )}
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
