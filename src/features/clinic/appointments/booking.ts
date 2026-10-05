/**
 * The booking payload both forms send. `customerId` and `note` are the front
 * desk's; a customer's own booking never carries a customer — the API takes
 * that from the token.
 *
 * There is no end time: a booking is a place in one of the clinic's slots,
 * and the slot has one.
 */
export type BookingFormValues = {
  customerId?: number | string;
  clinicId: string;
  appointmentDate: string;
  /** The start of the chosen slot, `HH:mm:ss` as the slots endpoint gives it. */
  startTime: string;
  reason: string;
  note?: string;
};

export const EMPTY_BOOKING: BookingFormValues = {
  clinicId: "",
  appointmentDate: "",
  startTime: "",
  reason: "",
  note: "",
};

/** Where, when and why, as the API reads them. */
export function toBookingPayload(values: BookingFormValues) {
  return {
    clinicId: values.clinicId,
    appointmentDate: values.appointmentDate,
    startTime: values.startTime,
    reason: values.reason || null,
  };
}
