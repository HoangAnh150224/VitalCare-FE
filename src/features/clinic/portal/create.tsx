import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { ChevronLeftIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { BookingFields } from "../appointments/booking-fields";
import { EMPTY_BOOKING, toBookingPayload, type BookingFormValues } from "../appointments/booking";

/**
 * Registering a visit, for a customer: the same fields as the console's form
 * (`MyAppointmentCreate`), laid out as one card with one button. The number
 * comes back at once, on the slip this lands on.
 */
export const PortalAppointmentCreate = () => {
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<BookingFormValues, HttpError, BookingFormValues>({
    // Straight to the slip: the number on it is what the customer needs next.
    refineCoreProps: { resource: "my_appointments", action: "create", redirect: "show" },
    defaultValues: EMPTY_BOOKING,
  });

  return (
    <div className="screen-enter screen-enter-stagger mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          to="/my-appointments"
          className="text-muted-foreground hover:text-foreground -ms-1 inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeftIcon className="size-4" />
          Lượt khám
        </Link>
        <h1>Đăng ký khám</h1>
        <p className="text-muted-foreground text-sm">
          Chọn người tới khám, bác sĩ và ngày khám. Bạn nhận số khám ngay sau khi đăng ký.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => onFinish(toBookingPayload(values) as never))}
          className="bg-card flex flex-col gap-6 rounded-2xl border border-border p-5 sm:p-6"
        >
          <div className="grid gap-5 md:grid-cols-8">
            <BookingFields control={form.control} forOwnAccount />
          </div>

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link to="/my-appointments">Huỷ</Link>
            </Button>
            <Button type="submit" size="lg" className="h-12 rounded-xl px-8 text-base" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang đăng ký…" : "Đăng ký khám"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
