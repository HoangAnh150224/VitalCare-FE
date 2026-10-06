import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { InputPassword } from "@/shared/components/form/input-password";
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
import { STAFF_TYPE_OPTIONS, type StaffType } from "@/domains/employee/types";
import { ProfileFields } from "./profile-fields";

type StaffFormValues = {
  phone: string;
  fullName: string;
  password: string;
  staffType: StaffType;
  specialty: string;
  professionalTitle: string;
  licenseNo: string;
  clinicPosition: string;
};

const DEFAULT_VALUES: StaffFormValues = {
  phone: "",
  fullName: "",
  password: "",
  staffType: "doctor",
  specialty: "",
  professionalTitle: "",
  licenseNo: "",
  clinicPosition: "",
};

/**
 * A new member of staff: the account they sign in with and their professional
 * record, in one step. Their role follows from the type — a doctor gets the
 * doctor role — so there is no role picker to get wrong.
 */
export const StaffCreate = () => {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<StaffFormValues, HttpError, StaffFormValues>({
    refineCoreProps: { redirect: "show" },
    defaultValues: DEFAULT_VALUES,
  });

  return (
    <CreateView>
      <CreateViewHeader />
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => onFinish(values))} className="min-w-0">
          <SectionedFormPanel>
            <FormSection title="Tài khoản đăng nhập" description="Nhân viên đăng nhập bằng số điện thoại này.">
              <FormField
                control={form.control}
                name="phone"
                rules={{
                  required: "Vui lòng nhập số điện thoại",
                  pattern: {
                    value: /^[\s.()-]*(?:\+?84|0)(?:[\s.()-]*\d){9}[\s.()-]*$/,
                    message: "Nhập số điện thoại Việt Nam, ví dụ 0901234567",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" inputMode="tel" className="font-mono" placeholder="0901234567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                rules={{ required: "Vui lòng nhập họ tên", maxLength: { value: 255, message: "Tối đa 255 ký tự" } }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Họ và tên</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="BS. Nguyễn Văn A" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                rules={{
                  required: "Vui lòng nhập mật khẩu",
                  minLength: { value: 8, message: "Tối thiểu 8 ký tự" },
                  maxLength: { value: 72, message: "Tối đa 72 ký tự" },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Mật khẩu ban đầu</FormLabel>
                    <FormControl>
                      <InputPassword {...field} autoComplete="new-password" />
                    </FormControl>
                    <FormDescription>Gửi cho nhân viên và yêu cầu đổi sau lần đăng nhập đầu.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSection title="Hồ sơ chuyên môn" description="Loại nhân viên quyết định quyền trong hệ thống.">
              <FormField
                control={form.control}
                name="staffType"
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Loại nhân viên</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAFF_TYPE_OPTIONS.map((option) => (
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
              <ProfileFields control={form.control} />
            </FormSection>

            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Tạo nhân viên"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>
        </form>
      </Form>
    </CreateView>
  );
};
