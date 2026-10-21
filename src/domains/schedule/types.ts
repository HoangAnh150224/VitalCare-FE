/**
 * One session of a doctor's week (`GET/PUT /doctors/{id}/working-hours`),
 * repeating every week. A morning and an afternoon are two sessions; a weekday
 * with none is a day the doctor sees nobody.
 */
export type WorkingHoursEntry = {
  /** ISO numbering: 1 = Monday … 7 = Sunday. */
  dayOfWeek: number;
  /** `HH:mm:ss` from the API; `HH:mm` is accepted going back. */
  startTime: string;
  endTime: string;
  /** How long one patient's visit takes; the session holds as many patients as fit. */
  visitMinutes: number;
  /** The examination room the doctor sits in for the session; null when none is set. */
  examRoomId?: number | null;
};

/**
 * What registering with one doctor on one day would get — the queue number and
 * about when it is called.
 */
export type DayAvailability = {
  date: string;
  /** The doctor sees patients that day at all. */
  working: boolean;
  /** How many patients the day holds. */
  capacity: number;
  taken: number;
  remaining: number;
  /** Null when there is no number left to give. */
  nextNumber: number | null;
  estimatedStart: string | null;
  estimatedEnd: string | null;
  bookable: boolean;
};

/** A doctor as somebody choosing who to see reads them (`GET /clinics/{id}/doctors`, `GET /doctors`). */
export type DoctorAvailability = {
  id: number;
  fullName: string;
  specialty: string | null;
  professionalTitle: string | null;
  workingHours: WorkingHoursEntry[];
  /** Only when a date was asked about. */
  day: DayAvailability | null;
  /** Whether the caller may change this doctor's schedule; only on `GET /doctors`. */
  manageable: boolean | null;
};

/** A period a doctor has blocked: no patients then (`GET /doctor_schedules`). */
export type DoctorSchedule = {
  id: number;
  doctor: { id: number; employeeCode: string; fullName: string; specialty: string | null };
  clinicId: string | null;
  /** `YYYY-MM-DD`, a date in the clinic's own time zone. */
  workDate: string;
  /** `HH:mm:ss`. */
  startTime: string;
  endTime: string;
  /** Why the doctor takes nobody then. */
  note: string | null;
  /** `write: false` on a colleague's period, for a doctor: readable, not theirs to change. */
  _can?: Record<string, boolean>;
};
