import {
  useCustomMutation,
  useNotification,
  useSelect,
  type HttpError,
} from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useNavigate } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { translateRegistrationMessage } from "@/shared/api/registration";
import {
  CreateView,
  CreateViewHeader,
} from "@/shared/components/views/create-view";
import {
  FormSection,
  FormSectionActions,
  SectionedFormPanel,
} from "@/shared/components/form/form-section";
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import type { Appointment } from "@/domains/appointment/types";
import type { Customer } from "@/domains/customer/types";
import { BookingFields } from "./booking-fields";
import { EMPTY_BOOKING, type BookingFormValues } from "./booking";
import { clinicToday } from "./clinic-day";

type WalkInValues = BookingFormValues & {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  nationalId: string;
  gender: string;
};

/**
 * Walk-in registration (FE-10): somebody at the counter to be seen today.
 * The desk picks an existing profile, or creates a new accountless patient
 * profile; the visit
 * is registered with the next number of the doctor's day and checked in at
 * once. The examination fee is taken next, on the visit's page: the patient
 * queues once it is paid (BF-02).
 */
export const WalkInRegistration = () => {
  const navigate = useNavigate();
  const { open } = useNotification();
  const [who, setWho] = useState<"known" | "new">("known");
  const { mutate, mutation } = useCustomMutation<Appointment>();
  const { refineCore, ...form } = useForm<
    WalkInValues,
    HttpError,
    WalkInValues
  >({
    refineCoreProps: { resource: "appointments", action: "create" },
    defaultValues: {
      ...EMPTY_BOOKING,
      appointmentDate: clinicToday(),
      fullName: "",
      phone: "",
      dateOfBirth: "",
      nationalId: "",
      gender: "",
    },
  });
  void refineCore;

  const { options: customerOptions, onSearch } = useSelect<Customer>({
    resource: "customers",
    optionLabel: (customer) =>
      `${customer.fullName} · ${customer.phone} · ${customer.customerCode}${customer.nationalId ? ` · ID …${customer.nationalId.slice(-4)}` : ""}`,
    optionValue: "id",
    onSearch: (value) => [{ field: "q", operator: "eq", value }],
  });

  const submit = (values: WalkInValues) =>
    mutate(
      {
        url: `${API_URL}/appointments/walk-in`,
        method: "post",
        values: {
          customerId: who === "known" ? Number(values.customerId) : null,
          newPatient:
            who === "new"
              ? {
                  fullName: values.fullName.trim(),
                  phone: values.phone,
                  dateOfBirth: values.dateOfBirth,
                  nationalId: values.nationalId.trim(),
                  gender: values.gender,
                }
              : null,
          clinicId: values.clinicId || undefined,
          reason: values.reason.trim(),
          note: values.note?.trim() || null,
        },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
        errorNotification: (error) => {
          const errors =
            (error as { errors?: Record<string, string> } | undefined)
              ?.errors ?? {};
          for (const [field, message] of Object.entries(errors)) {
            const name = field.replace(
              /^newPatient\./,
              ""
            ) as keyof WalkInValues;
            form.setError(name, {
              message: translateRegistrationMessage(message),
            });
          }
          const first =
            Object.values(errors)[0] ??
            (error as { message?: string } | undefined)?.message;
          return {
            type: "error",
            message: first
              ? translateRegistrationMessage(first)
              : "Không đăng ký được.",
          };
        },
      },
      {
        onSuccess: ({ data }) => {
          open?.({
            type: "success",
            message:
              "Đã đăng ký và tiếp nhận. Thu phí khám để bệnh nhân vào hàng chờ.",
          });
          navigate(`/appointments/show/${data.id}`);
        },
      }
    );

  return (
    <CreateView>
      <CreateViewHeader title="Đăng ký khám vãng lai" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="min-w-0">
          <SectionedFormPanel>
            <FormSection
              title="Bệnh nhân"
              description="Tìm hồ sơ theo tên, số điện thoại, mã hồ sơ hoặc giấy tờ định danh để tránh tạo trùng. Khách mới được tạo hồ sơ bệnh nhân mà chưa cần tài khoản."
            >
              <div className="md:col-span-12">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={who}
                  onValueChange={(value) =>
                    value && setWho(value as "known" | "new")
                  }
                >
                  <ToggleGroupItem value="known">Đã có hồ sơ</ToggleGroupItem>
                  <ToggleGroupItem value="new">Khách mới</ToggleGroupItem>
                </ToggleGroup>
              </div>
              {who === "known" ? (
                <FormField
                  control={form.control}
                  name="customerId"
                  rules={{ required: "Vui lòng chọn khách hàng" }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-8">
                      <FormLabel>Khách hàng</FormLabel>
                      <Input
                        placeholder="Tìm theo tên, số điện thoại, mã hồ sơ hoặc giấy tờ định danh"
                        onChange={(event) => onSearch(event.target.value)}
                      />
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="w-full"
                            aria-label="Khách hàng"
                          >
                            <SelectValue placeholder="Chọn khách hàng" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customerOptions.map((option) => (
                            <SelectItem
                              key={String(option.value)}
                              value={String(option.value)}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="fullName"
                    rules={{
                      required: "Nhập họ tên",
                      validate: (value) => value.trim() !== "" || "Nhập họ tên",
                      maxLength: { value: 255, message: "Tối đa 255 ký tự" },
                    }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel>Họ và tên</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nhập họ và tên bệnh nhân" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    rules={{
                      required: "Nhập số điện thoại",
                      pattern: {
                        value: /^(0\d{9}|\+84\d{9})$/,
                        message: "Số điện thoại Việt Nam, ví dụ 0901234567",
                      },
                    }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel>Số điện thoại</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="tel"
                            placeholder="0901234567"
                          />
                        </FormControl>
                        <FormDescription>Số liên hệ của hồ sơ; không tạo tài khoản đăng nhập cho bệnh nhân vãng lai.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    rules={{ required: "Nhập ngày sinh" }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel>Ngày sinh</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" max={clinicToday()} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationalId"
                    rules={{
                      required: "Nhập số giấy tờ định danh",
                      validate: (value) =>
                        value.trim() !== "" || "Nhập số giấy tờ định danh",
                      maxLength: { value: 32, message: "Tối đa 32 ký tự" },
                    }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel>Số giấy tờ định danh</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={32}
                            placeholder="Nhập số CCCD hoặc hộ chiếu"
                          />
                        </FormControl>
                        <FormDescription>Dùng cùng họ tên, ngày sinh và số liên hệ để phát hiện hồ sơ trùng.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    rules={{ required: "Chọn giới tính" }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel>Giới tính</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger
                              className="w-full"
                              aria-label="Giới tính"
                            >
                              <SelectValue placeholder="Chọn giới tính" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Nam</SelectItem>
                            <SelectItem value="female">Nữ</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </FormSection>

            <FormSection
              title="Khám hôm nay"
              description="Số khám là số tiếp theo của bác sĩ trong ngày. Thứ tự gọi vào phòng tính theo thời điểm trả phí khám."
            >
              {/* The booking half of this form is the shared one; the patient fields only add to it. */}
              <BookingFields
                control={form.control as unknown as Control<BookingFormValues>}
                todayOnly
              />
            </FormSection>

            <FormSectionActions>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Đang đăng ký..."
                  : "Đăng ký và tiếp nhận"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>
        </form>
      </Form>
    </CreateView>
  );
};
