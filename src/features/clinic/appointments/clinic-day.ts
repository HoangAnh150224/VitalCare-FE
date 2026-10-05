/**
 * The clinic's time zone — the same one `app.clinic.time-zone` gives the API.
 *
 * Check-in is only accepted on the appointment's own date *as the clinic
 * counts days*, so the screen has to count them the same way to know when to
 * offer the button. The browser's own zone would be wrong for anybody using
 * the system from elsewhere, and UTC would be wrong before 07:00 here.
 */
export const CLINIC_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Today in the clinic, as `YYYY-MM-DD` — the shape the API uses for a date. */
export function clinicToday(): string {
  // en-CA formats a date as YYYY-MM-DD, which is the point of using it here.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
