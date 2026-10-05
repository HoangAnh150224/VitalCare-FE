import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import {
  FormSection,
  FormSectionActions,
  SectionedFormPanel,
} from "@/shared/components/form/form-section";
import { BookingFields } from "../appointments/booking-fields";
import {
  EMPTY_BOOKING,
  toBookingPayload,
  type BookingFormValues,
} from "../appointments/booking";

/**
 * A customer booking for themselves. There is no "who" on this form: the API
 * books under the signed-in account and nobody else.
 */
export const MyAppointmentCreate = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish },
    ...form
  } = useForm<BookingFormValues, HttpError, BookingFormValues>({
    // Straight to the slip: the code on it is what the customer needs next.
    refineCoreProps: { redirect: "show" },
    defaultValues: EMPTY_BOOKING,
  });

  function onSubmit(values: BookingFormValues) {
    // Where, when and why only: neither the customer nor an internal note is
    // the customer's to set.
    onFinish(toBookingPayload(values) as never);
  }

  return (
    <CreateView>
      <CreateViewHeader />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0">
          <SectionedFormPanel>
            <FormSection
              title="Đặt lịch khám"
              description="Chọn phòng khám và thời gian. Lịch hẹn chưa kích hoạt hồ sơ bệnh nhân — việc đó diễn ra khi bạn check-in tại phòng khám."
            >
              <BookingFields control={form.control} />
            </FormSection>

            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang đặt..." : "Đặt lịch"}
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
