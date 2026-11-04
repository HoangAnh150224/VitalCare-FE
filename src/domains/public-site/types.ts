/**
 * What the public site reads, signed in or not (`/api/public`). Separate
 * types from the staff ones on purpose: these carry only what anybody may see.
 */
import type { ServiceCategory } from "@/domains/billing/types";

/** One opening session; ISO weekday, 1 = Monday … 7 = Sunday; times "HH:mm:ss". */
export type Opening = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
};

export type PublicClinic = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingHours: Opening[];
};

export type PublicDoctor = {
  id: number;
  fullName: string;
  specialty: string | null;
  professionalTitle: string | null;
  /** ISO weekdays the doctor sees patients. */
  workingDays: number[];
};

export type PublicClinicDetail = PublicClinic & { doctors: PublicDoctor[] };

export type PublicService = {
  id: number;
  name: string;
  description: string | null;
  category: ServiceCategory;
  price: number;
  turnaroundMinutes: number | null;
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};

/**
 * The week's sessions folded by day: "Thứ 2 – Thứ 6: 07:30–11:30, 13:30–16:30".
 * Consecutive days with the same sessions share one line.
 */
export function openingLines(
  hours: Opening[]
): { days: string; times: string }[] {
  const byDay = new Map<number, string[]>();
  for (const session of [...hours].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.openTime.localeCompare(b.openTime)
  )) {
    const times = byDay.get(session.dayOfWeek) ?? [];
    times.push(
      `${session.openTime.slice(0, 5)}–${session.closeTime.slice(0, 5)}`
    );
    byDay.set(session.dayOfWeek, times);
  }
  const lines: { from: number; to: number; times: string }[] = [];
  for (const [day, times] of byDay) {
    const joined = times.join(", ");
    const last = lines.at(-1);
    if (last && last.to === day - 1 && last.times === joined) last.to = day;
    else lines.push({ from: day, to: day, times: joined });
  }
  return lines.map((line) => ({
    days:
      line.from === line.to
        ? WEEKDAY_LABELS[line.from]
        : `${WEEKDAY_LABELS[line.from]} – ${WEEKDAY_LABELS[line.to]}`,
    times: line.times,
  }));
}

/** "+84900000000" → "0900 000 000", for reading and for a `tel:` link's label. */
export function displayPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const local = phone.startsWith("+84") ? `0${phone.slice(3)}` : phone;
  return local.length === 10
    ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
    : local;
}
