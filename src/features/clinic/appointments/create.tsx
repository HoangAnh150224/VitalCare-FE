import { useSelect, type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
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
import { BookingFields } from "./booking-fields";
import { EMPTY_BOOKING, toBookingPayload, type BookingFormValues } from "./booking";

/**
 * The front desk booking on a customer's behalf — somebody who phoned in or is
 * standing at the counter. Booking never makes anybody a patient; the
 * check-in does.
 */
export const AppointmentCreate = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish },
    ...form
  } = useForm<BookingFormValues, HttpError, BookingFormValues>({
    refineCoreProps: { redirect: "show" },
    defaultValues: EMPTY_BOOKING,
  });

  // Searched through the list's quick filter (`q`), which matches name, phone
  // number and customer code at once — the label shows all three so two people
  // with one name stay distinguishable.
  const { options: customerOptions, onSearch } = useSelect<Customer>({
    resource: "customers",
    optionLabel: (customer) =>
      `${customer.fullName} · ${customer.phone} · ${customer.customerCode}`,
    optionValue: "id",
    onSearch: (value) => [{ field: "q", operator: "eq", value }],
  });

  function onSubmit(values: BookingFormValues) {
    onFinish({
      ...toBookingPayload(values),
      customerId: Number(values.customerId),
      note: values.note || null,
    } as never);
  }

  return (
    <CreateView>
      <CreateViewHeader />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0">
          <SectionedFormPanel>
            <FormSection title="Khách hàng" description="Lịch hẹn này của ai.">
              <FormField
                control={form.control}
                name="customerId"
                rules={{ required: "Vui lòng chọn khách hàng" }}
                render={({ field }) => (
                  <FormItem className="md:col-span-8">
                    <FormLabel>Khách hàng</FormLabel>
                    <Input
                      placeholder="Tìm theo tên, số điện thoại hoặc mã khách hàng"
                      onChange={(e) => onSearch(e.target.value)}
                    />
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn khách hàng" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customerOptions.map((option) => (
                          <SelectItem key={String(option.value)} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Khách chưa có tài khoản cần tự đăng ký trước.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSection title="Lịch hẹn" description="Phòng khám, thời gian và lý do khám.">
              <BookingFields control={form.control} />
              <FormField
                control={form.control}
                name="note"
                rules={{ maxLength: { value: 2000, message: "Tối đa 2000 ký tự" } }}
                render={({ field }) => (
                  <FormItem className="md:col-span-8">
                    <FormLabel>Ghi chú nội bộ</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Chỉ nhân viên phòng khám thấy.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Đặt lịch"}
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
