import type { CustomerStatus } from "@/domains/customer/types";

/**
 * An appointment as `GET /appointments` and `GET /my_appointments` return it
 * (`AppointmentResponse`).
 *
 * The customer's status rides along so the check-in button can say, before it
 * is pressed, that this arrival will also make them a patient.
 */
export type Appointment = {
  id: number;
  /** The code on the appointment slip and in its QR, e.g. `K7M29QXA`. */
  bookingCode: string;
  customer: {
    id: number;
    customerCode: string;
    fullName: string;
    phone: string;
    status: CustomerStatus;
  };
  clinic: { id: string; name: string };
  /** `YYYY-MM-DD`, a date in the clinic's own time zone. */
  appointmentDate: string;
  /** `HH:mm:ss`. */
  startTime: string;
  endTime: string | null;
  reason: string | null;
  status: AppointmentStatus;
  note: string | null;
  checkedInAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

/**
 * A booking code in two groups of four, the way it is printed and read aloud:
 * `K7M29QXA` → `K7M2-9QXA`. The API accepts it with or without the dash.
 */
export function formatBookingCode(code: string | null | undefined): string {
  if (!code) return "—";
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Both ways out of `scheduled` are final. */
export type AppointmentStatus = "scheduled" | "checked_in" | "cancelled";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Đã đặt",
  checked_in: "Đã check-in",
  cancelled: "Đã huỷ",
};

export const APPOINTMENT_STATUS_OPTIONS: { label: string; value: AppointmentStatus }[] = [
  { label: "Đã đặt", value: "scheduled" },
  { label: "Đã check-in", value: "checked_in" },
  { label: "Đã huỷ", value: "cancelled" },
];
