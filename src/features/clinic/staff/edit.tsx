import type { HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

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
import { StaffCreate } from "./create";
import { getAuthorities } from "@/shared/api/session";

/**
 * Editing a member of staff's record, and taking a former one back.
 *
 * Ending somebody's membership is not done here: it needs a reason, so it
 * lives in "Kết thúc thành viên" on the detail page and the staff list.
 */
export const StaffEdit = () => {
  const { result: employee, query } = useShow<Employee>({ resource: "employees", errorNotification: false });
  const navigate = useNavigate();
  if (query.isLoading) return <p>Đang tải hồ sơ...</p>;
  if (query.isError || !employee || (employee.staffType === "clinic_admin" && employee.status === "inactive")) {
    return <div className="space-y-4">
      <p role="alert">{employee?.status === "inactive" ? "Quản trị viên đã nghỉ việc." : "Không tải được hồ sơ. Vui lòng thử lại sau."}</p>
      <Button variant="outline" onClick={() => navigate("/employees")}>Quay lại danh sách</Button>
    </div>;
  }
  if (getAuthorities()?.roles.includes("ADMIN")) {
    // The system administrator edits clinic administrators only; StaffCreate's
    // edit mode is built for that type and nothing else.
    if (employee.staffType !== "clinic_admin") {
      return <div className="space-y-4">
        <p role="alert">Tài khoản này không chỉnh sửa được tại đây.</p>
        <Button variant="outline" onClick={() => navigate("/employees")}>Quay lại danh sách</Button>
      </div>;
    }
    return <StaffCreate editing />;
  }
  return <StaffProfileEdit />;
};

const StaffProfileEdit = () => {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Employee, HttpError, Employee>({ refineCoreProps: {} });

  // Only a former member of staff can have their status changed here (back to active).
  const returning = query?.data?.data?.status === "inactive";

  function onSubmit(values: Employee) {
    onFinish({
      specialty: values.specialty ?? "",
      professionalTitle: values.professionalTitle ?? "",
      licenseNo: values.licenseNo ?? "",
      clinicPosition: values.clinicPosition ?? "",
      ...(returning ? { status: values.status } : {}),
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

            <FormSection
              title="Trạng thái"
              description={returning
                ? "Nhân viên đã nghỉ có thể được nhận lại làm việc."
                : "Để cho nhân viên nghỉ, dùng \"Kết thúc thành viên\" ở trang chi tiết (mục Phòng khám trực thuộc) hoặc danh sách nhân viên — cần nhập lý do."}
            >
              {returning && <FormField
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
              />}
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
