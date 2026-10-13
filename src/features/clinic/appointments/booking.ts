/**
 * The registration both forms send. `customerId` and `note` are the front
 * desk's; a customer's own registration never carries a customer — the API
 * takes that from the token.
 *
 * A doctor and a day, nothing finer: the visit gets that doctor's next queue
 * number. `clinicId` only narrows the doctors to choose from; the API takes
 * the clinic from the doctor.
 */
export type BookingFormValues = {
  customerId?: number | string;
  clinicId: string;
  employeeId: string;
  appointmentDate: string;
  reason: string;
  note?: string;
};

export const EMPTY_BOOKING: BookingFormValues = {
  clinicId: "",
  employeeId: "",
  appointmentDate: "",
  reason: "",
  note: "",
};

/** Who, which day and why, as the API reads them. */
export function toBookingPayload(values: BookingFormValues) {
  return {
    employeeId: Number(values.employeeId),
    appointmentDate: values.appointmentDate,
    reason: values.reason.trim(),
  };
}
