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
import { GENDER_LABELS, type Gender } from "@/domains/customer/types";
import type { Profile, Relationship } from "@/domains/profile/types";
import { RELATIONSHIP_OPTIONS } from "@/domains/profile/types";
import { clinicToday } from "../appointments/clinic-day";

type ProfileFormValues = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
  relationship: Relationship | "";
  nationalId: string;
  address: string;
};

const GENDERS = Object.keys(GENDER_LABELS) as Gender[];

/**
 * A patient profile, to add (a relative) or to fill in (one's own or a
 * relative's).
 *
 * The owner's own name and phone are the account's and are shown, not edited;
 * a relative has neither an account nor a sign-in, so theirs are asked for,
 * with what they are to the owner.
 */
function ProfileForm({ submitLabel, creating }: { submitLabel: string; creating: boolean }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Profile, HttpError, ProfileFormValues>({
    refineCoreProps: { resource: "my_profiles", redirect: "list" },
    defaultValues: {
      fullName: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      relationship: "",
      nationalId: "",
      address: "",
    },
  });
  const record = query?.data?.data;
  // A relative's fields: on create, and on a relative's edit.
  const relative = creating || record?.self === false;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record carries far more.
          onFinish({
            ...(relative
              ? { fullName: values.fullName.trim(), phone: values.phone.trim(), relationship: values.relationship }
              : {}),
            dateOfBirth: values.dateOfBirth,
            gender: values.gender,
            nationalId: values.nationalId ?? "",
            address: values.address ?? "",
          } as unknown as ProfileFormValues)
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection
            title={relative ? "Hồ sơ người thân" : "Hồ sơ của bạn"}
            description="Ngày sinh và giới tính là bắt buộc để đăng ký khám. Thông tin cần khớp với giấy tờ tuỳ thân."
          >
            {relative ? (
              <>
                <FormField
                  control={form.control}
                  name="fullName"
                  rules={{ validate: (value) => value.trim() !== "" || "Vui lòng nhập họ và tên" }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-5">
                      <FormLabel>Họ và tên</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} maxLength={255} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  rules={{
                    validate: (value) => /^[0-9+ ]{8,20}$/.test(value.trim()) || "Số điện thoại không hợp lệ",
                  }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>Số điện thoại</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} inputMode="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <div className="md:col-span-8">
                <p className="text-sm font-medium">{record?.fullName ?? "—"}</p>
                <p className="text-muted-foreground font-mono text-sm">{record?.phone ?? ""}</p>
                <p className="text-muted-foreground text-xs">Họ tên và số điện thoại lấy theo tài khoản đăng nhập.</p>
              </div>
            )}
            <FormField
              control={form.control}
              name="dateOfBirth"
              rules={{ required: "Vui lòng nhập ngày sinh" }}
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Ngày sinh</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" max={clinicToday()} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              rules={{ required: "Vui lòng chọn giới tính" }}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Giới tính</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDERS.map((gender) => (
                        <SelectItem key={gender} value={gender}>
                          {GENDER_LABELS[gender]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {relative && (
              <FormField
                control={form.control}
                name="relationship"
                rules={{ required: "Vui lòng chọn quan hệ" }}
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Hồ sơ này của ai?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn quan hệ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIP_OPTIONS.map((option) => (
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
            )}
            <FormField
              control={form.control}
              name="nationalId"
              rules={{ maxLength: { value: 32, message: "Tối đa 32 ký tự" } }}
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Số CCCD</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} inputMode="numeric" />
                  </FormControl>
                  <FormDescription>Không bắt buộc.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              rules={{ maxLength: { value: 500, message: "Tối đa 500 ký tự" } }}
              render={({ field }) => (
                <FormItem className="md:col-span-5">
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>Không bắt buộc.</FormDescription>
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

export const MyProfileCreate = () => (
  <CreateView>
    <CreateViewHeader resource="my_profiles" title="Thêm người thân" />
    <ProfileForm submitLabel="Lưu hồ sơ" creating />
  </CreateView>
);

export const MyProfileEdit = () => (
  <EditView>
    <EditViewHeader resource="my_profiles" title="Hồ sơ người bệnh" />
    <ProfileForm submitLabel="Lưu hồ sơ" creating={false} />
  </EditView>
);
