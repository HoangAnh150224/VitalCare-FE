/** A clinic as `GET /clinics` returns it — the list a booking chooses from. */
export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  contactPhone: string | null;
  operatingStatus: string | null;
};

/**
 * One session of a clinic's week (`GET/PUT /clinics/{id}/working-hours`). A
 * morning and an afternoon are two sessions; a weekday with none is closed.
 */
export type WorkingHoursEntry = {
  /** ISO numbering: 1 = Monday … 7 = Sunday. */
  dayOfWeek: number;
  /** `HH:mm:ss` from the API; `HH:mm` is accepted going back. */
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  capacityPerSlot: number;
};

export type SlotState = "available" | "full" | "past";

/** One bookable slot of one day, with how full it is. */
export type Slot = {
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  available: number;
  state: SlotState;
};

/** `GET /clinics/{id}/slots?date=` — a day's slots and why the grid may be empty. */
export type DaySlots = {
  date: string;
  /** The clinic has sessions on that weekday. */
  open: boolean;
  /** The day is between today and the end of the booking window. */
  bookable: boolean;
  /** The end of that window, so the date picker can stop there. */
  lastBookableDate: string;
  slots: Slot[];
};

/** Weekday names in ISO order, index 0 = Monday. */
export const WEEKDAY_LABELS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
