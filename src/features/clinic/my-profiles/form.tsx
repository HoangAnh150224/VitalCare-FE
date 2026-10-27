import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { ChevronLeftIcon, IdCardIcon, MapPinIcon, UserRoundIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { initials } from "@/shared/lib/format";
import { GENDER_LABELS, type Gender } from "@/domains/customer/types";
import type { IdType, Profile, Relationship } from "@/domains/profile/types";
import { ID_TYPE_LABELS, RELATIONSHIP_OPTIONS } from "@/domains/profile/types";
import { clinicToday } from "../appointments/clinic-day";
import { IconChip, type Tone } from "../portal/parts";

type ProfileFormValues = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
  relationship: Relationship | "";
  nationalIdType: IdType;
  nationalId: string;
  nationalIdIssuedOn: string;
  province: string;
  ward: string;
  ethnicity: string;
  nationality: string;
  occupation: string;
  address: string;
};

const GENDERS = Object.keys(GENDER_LABELS) as Gender[];
const ID_TYPES = Object.keys(ID_TYPE_LABELS) as IdType[];

/**
 * A patient profile, to add (a relative) or to fill in (one's own or a
 * relative's), in three cards a person can take one at a time: who it is,
 * the identity paper, then the rest. Two columns throughout, so fields line up.
 *
 * The owner's own name and phone are the account's and are shown, not edited;
 * a relative has neither an account nor a sign-in, so theirs are asked for,
 * with what they are to the owner.
 */
function ProfileForm({ title, creating }: { title: string; creating: boolean }) {
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
      nationalIdType: "cccd",
      nationalId: "",
      nationalIdIssuedOn: "",
      province: "",
      ward: "",
      // What nearly everybody enters; there to be changed, not typed.
      ethnicity: "Kinh",
      nationality: "Việt Nam",
      occupation: "",
      address: "",
    },
  });
  const record = query?.data?.data;
  // A relative's fields: on create, and on a relative's edit.
  const relative = creating || record?.self === false;
  const loading = !creating && query?.isLoading;

  return (
    <div className="screen-enter screen-enter-stagger mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground -ms-1 inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeftIcon className="size-4" />
          Hồ sơ
        </button>
        <h1>{title}</h1>
        <p className="text-muted-foreground text-sm">
          Thông tin cần khớp với giấy tờ tuỳ thân. Mục có dấu <span className="text-destructive">*</span> là bắt buộc.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-96 rounded-3xl" />
      ) : (
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
                nationalIdType: values.nationalIdType || "cccd",
                nationalId: values.nationalId.trim(),
                province: values.province ?? "",
                ward: values.ward ?? "",
                nationalIdIssuedOn: values.nationalIdIssuedOn || null,
                ethnicity: values.ethnicity ?? "",
                nationality: values.nationality ?? "",
                occupation: values.occupation ?? "",
                address: values.address ?? "",
              } as unknown as ProfileFormValues)
            )}
            className="flex min-w-0 flex-col gap-5"
          >
            <Group icon={UserRoundIcon} tone="teal" title="Thông tin cơ bản">
              {relative ? (
                <>
                  <FormField
                    control={form.control}
                    name="fullName"
                    rules={{ validate: (value) => value.trim() !== "" || "Vui lòng nhập họ và tên" }}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <Label required>Họ và tên</Label>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} maxLength={255} placeholder="Như trên giấy tờ" />
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
                      <FormItem>
                        <Label required>Số điện thoại</Label>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} inputMode="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="relationship"
                    rules={{ required: "Vui lòng chọn quan hệ" }}
                    render={({ field }) => (
                      <FormItem>
                        <Label required>Hồ sơ này của ai?</Label>
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
                </>
              ) : (
                <div className="bg-muted/60 flex items-center gap-3 rounded-2xl p-3 sm:col-span-2">
                  <span className="bg-primary text-primary-foreground font-display flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold">
                    {initials(record?.fullName ?? "")}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{record?.fullName ?? "—"}</span>
                    <span className="text-muted-foreground text-sm tabular-nums">{record?.phone ?? ""}</span>
                  </span>
                  <span className="text-muted-foreground ms-auto hidden max-w-48 text-end text-xs sm:block">
                    Họ tên và số điện thoại lấy theo tài khoản đăng nhập.
                  </span>
                </div>
              )}
              <FormField
                control={form.control}
                name="dateOfBirth"
                rules={{ required: "Vui lòng nhập ngày sinh" }}
                render={({ field }) => (
                  <FormItem>
                    <Label required>Ngày sinh</Label>
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
                  <FormItem>
                    <Label required>Giới tính</Label>
                    <Choices
                      label="Giới tính"
                      options={GENDERS.map((gender) => [gender, GENDER_LABELS[gender]])}
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Group>

            <Group icon={IdCardIcon} tone="sky" title="Giấy tờ tuỳ thân">
              <FormField
                control={form.control}
                name="nationalIdType"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Loại giấy tờ</FormLabel>
                    <Choices
                      label="Loại giấy tờ"
                      options={ID_TYPES.map((type) => [type, ID_TYPE_LABELS[type]])}
                      value={field.value ?? "cccd"}
                      onChange={field.onChange}
                    />
                    <FormDescription>
                      Trẻ chưa có CCCD dùng mã định danh trên giấy khai sinh; người nước ngoài dùng hộ chiếu.
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationalId"
                rules={{
                  validate: (value) => (value ?? "").trim() !== "" || "Vui lòng nhập số CCCD hoặc mã định danh",
                  maxLength: { value: 32, message: "Tối đa 32 ký tự" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <Label required>Số giấy tờ</Label>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} inputMode="numeric" className="tabular-nums" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationalIdIssuedOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày cấp</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" max={clinicToday()} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Group>

            <Group icon={MapPinIcon} tone="gold" title="Thông tin khác">
              <FormField
                control={form.control}
                name="occupation"
                rules={{ maxLength: { value: 128, message: "Tối đa 128 ký tự" } }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nghề nghiệp</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Ví dụ: học sinh, kế toán" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ethnicity"
                rules={{ maxLength: { value: 64, message: "Tối đa 64 ký tự" } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dân tộc</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationality"
                rules={{ maxLength: { value: 64, message: "Tối đa 64 ký tự" } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quốc tịch</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="province"
                rules={{ maxLength: { value: 128, message: "Tối đa 128 ký tự" } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tỉnh / Thành phố</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ward"
                rules={{ maxLength: { value: 128, message: "Tối đa 128 ký tự" } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xã / Phường</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
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
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Địa chỉ cụ thể</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Số nhà, đường, thôn / xóm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Group>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="h-11 rounded-full px-6" onClick={() => navigate(-1)}>
                Hủy
              </Button>
              <Button type="submit" className="h-11 rounded-full px-8" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Lưu hồ sơ"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

/** One card of the form: an icon, a heading, and its fields in two columns. */
function Group({ icon, tone, title, children }: { icon: LucideIcon; tone: Tone; title: string; children: ReactNode }) {
  return (
    <section className="card-soft flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <IconChip icon={icon} tone={tone} className="size-10 rounded-xl" />
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Label({ required, children }: { required?: boolean; children: ReactNode }) {
  return (
    <FormLabel>
      {children}
      {required && <span className="text-destructive -ms-1">*</span>}
    </FormLabel>
  );
}

/** A handful of options as pills: one tap, all of them in sight, unlike a dropdown. */
function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [T, string][];
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <FormControl>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
              "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-card hover:border-primary/50"
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </FormControl>
  );
}

export const MyProfileCreate = () => <ProfileForm title="Thêm người thân" creating />;

export const MyProfileEdit = () => <ProfileForm title="Hồ sơ cá nhân" creating={false} />;
