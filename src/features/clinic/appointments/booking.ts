/**
 * The registration both forms send. `customerId` and `note` are the front
 * desk's; a customer's own registration never carries a customer — the API
 * takes that from the token.
 *
 * The front desk names a doctor and a day; a customer names only the day
 * (and the clinic, when there are several) and the clinic places the visit
 * with one of its doctors working that day. Either way the visit gets that
 * doctor's next queue number.
 */
export type BookingFormValues = {
  customerId?: number | string;
  /** The customer's side: which of the account's profiles the visit is for. */
  patientId?: string;
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
    ...(values.patientId ? { patientId: Number(values.patientId) } : {}),
    // BF-02 shared line: a clinic and a day; the room that calls the visit in gives its doctor.
    clinicId: values.clinicId || undefined,
    appointmentDate: values.appointmentDate,
    reason: values.reason.trim(),
  };
}
