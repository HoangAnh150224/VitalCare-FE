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
  /** Who the visit is with; null on rows from before a doctor was required. */
  doctor: { id: number; fullName: string; specialty: string | null } | null;
  /**
   * The number called at the doctor's door, issued when the visit was
   * registered. `startTime`/`endTime` are about when it is expected — nobody
   * chose them.
   */
  queueNumber: number | null;
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
  /** Why the clinic cancelled it; null when the customer cancelled their own. */
  cancelReason: string | null;
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

/** Registered, checked in at the desk, completed — or cancelled, or never came. */
export type AppointmentStatus = "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Đã đăng ký",
  checked_in: "Đã tiếp nhận",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
  no_show: "Không đến",
};

export const APPOINTMENT_STATUS_OPTIONS: { label: string; value: AppointmentStatus }[] = (
  Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]
).map((value) => ({ label: APPOINTMENT_STATUS_LABELS[value], value }));

/** A queue number as it is printed and called: at least two digits, `7` → `07`. */
export function formatQueueNumber(value: number | null | undefined): string {
  return value == null ? "—" : String(value).padStart(2, "0");
}
