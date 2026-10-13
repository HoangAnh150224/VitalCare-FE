/** One period of a doctor's day as `GET /doctor_schedules` returns it. */
export type DoctorSchedule = {
  id: number;
  doctor: { id: number; employeeCode: string; fullName: string; specialty: string | null };
  clinicId: string | null;
  /** `YYYY-MM-DD`, a date in the clinic's own time zone. */
  workDate: string;
  /** `HH:mm:ss`. */
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  note: string | null;
  /** `write: false` on a colleague's period, for a doctor: readable, not theirs to change. */
  _can?: Record<string, boolean>;
};

export type ScheduleStatus = "working" | "leave";

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  working: "Làm việc",
  leave: "Nghỉ",
};

export const SCHEDULE_STATUS_OPTIONS: { label: string; value: ScheduleStatus }[] = [
  { label: "Làm việc", value: "working" },
  { label: "Nghỉ", value: "leave" },
];
