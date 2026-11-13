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

/** Nobody is older than this (the API refuses the same). */
export const MAX_AGE_YEARS = 120;

/** The earliest date of birth taken: today in the clinic, 120 years back, as `YYYY-MM-DD`. */
export function oldestBirthDate(): string {
  const [year, month, day] = clinicToday().split("-");
  return `${String(Number(year) - MAX_AGE_YEARS).padStart(4, "0")}-${month}-${day}`;
}

/**
 * A date of birth as every form checks it: before today, and no more than 120
 * years ago. ISO dates compare as strings. Empty passes; "required" says that.
 */
export function birthDateProblem(value: string | null | undefined): string | true {
  if (!value) return true;
  if (value >= clinicToday()) return "Ngày sinh phải nằm ở quá khứ";
  if (value < oldestBirthDate()) return "Vui lòng nhập năm sinh hợp lý.";
  return true;
}
