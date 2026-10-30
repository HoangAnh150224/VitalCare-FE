import type { Appointment } from "@/domains/appointment/types";

/** `2026-10-28` → "Thứ Tư, 28/10/2026": the day as a person says it, not as a table sorts it. */
export function formatVisitDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const text = new Date(year, month - 1, day).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Registered, at the desk or with the doctor: a visit still to happen. */
export function isUpcoming(appointment: Appointment, today: string): boolean {
  const open =
    appointment.status === "scheduled" ||
    appointment.status === "checked_in" ||
    appointment.status === "in_exam" ||
    appointment.status === "awaiting_results";
  return open && appointment.appointmentDate >= today;
}

/**
 * Newest first, and within a day the later number first — so if an account
 * ever has more visits than one page holds, what drops off the end is the
 * oldest history, never the visits still to come. Callers reverse the
 * upcoming ones back into the order they will happen.
 */
export const VISIT_SORTERS = [
  { field: "appointmentDate", order: "desc" },
  { field: "startTime", order: "desc" },
  { field: "queueNumber", order: "desc" },
] as const;
