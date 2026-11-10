import { useCustom } from "@refinedev/core";

import { API_URL } from "@/shared/api/constants";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { WEEKDAY_LABELS } from "@/domains/clinic/types";
import type { DoctorAvailability } from "@/domains/schedule/types";

/**
 * A clinic's doctors and, once a day is chosen, what that day would give with
 * each: the registration form's two questions are who and which day.
 */
export function useClinicDoctors(clinicId: string | undefined, date: string | undefined) {
  const { result, query } = useCustom<DoctorAvailability[]>({
    url: `${API_URL}/clinics/${clinicId}/doctors`,
    method: "get",
    config: { query: date ? { date } : {} },
    queryOptions: {
      enabled: Boolean(clinicId),
      // A day can fill up while somebody is looking at it.
      refetchInterval: 30_000,
    },
  });
  const doctors = Array.isArray(result?.data) ? result.data : [];
  return { doctors, isLoading: query.isLoading };
}

export const doctorLabel = (doctor: Pick<DoctorAvailability, "fullName" | "specialty">) =>
  doctor.specialty ? `${doctor.fullName} · ${doctor.specialty}` : doctor.fullName;

/** The days of the week a doctor sees patients, as one line: "Thứ Hai 08:00–12:00, 13:00–17:00 · …". */
function weekSummary(doctor: DoctorAvailability): string {
  const byDay = new Map<number, string[]>();
  for (const session of doctor.workingHours) {
    const range = `${formatLocalTime(session.startTime)}–${formatLocalTime(session.endTime)}`;
    byDay.set(session.dayOfWeek, [...(byDay.get(session.dayOfWeek) ?? []), range]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, ranges]) => `${WEEKDAY_LABELS[day - 1]} ${ranges.join(", ")}`)
    .join(" · ");
}

/**
 * Why a doctor and a day cannot be had, said before anybody presses the
 * button: the doctor is off that day, or the day is full.
 *
 * Nothing when the registration would go through. The form is a doctor, a
 * day and Register; the queue number is on the slip that follows, not
 * previewed here.
 */
export function DoctorDayHint({ doctor, date }: { doctor: DoctorAvailability | undefined; date: string }) {
  const day = doctor?.day;
  if (!doctor || !date || !day) {
    return null;
  }
  const week = weekSummary(doctor);
  if (!week) {
    return <Hint>Bác sĩ này chưa có giờ làm việc nên chưa nhận đăng ký.</Hint>;
  }
  if (!day.working) {
    return <Hint>Bác sĩ không khám ngày này. Lịch khám: {week}.</Hint>;
  }
  if (!day.bookable) {
    return (
      <Hint>
        {day.remaining <= 0 ? "Ngày này đã hết lượt khám." : "Ngày này không còn nhận đăng ký."} Lịch khám: {week}.
      </Hint>
    );
  }
  return null;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-destructive text-sm md:col-span-8">{children}</p>;
}

/** A day a clinic still has places on (BR-01/02): online and walk-in visits share them. */
type OpenDay = { date: string; remaining: number };

/**
 * Whether a clinic's day can be booked, counted as the API counts it when the
 * visit is registered (every doctor's turns, less the clinic's visits), and the
 * next days that can: `open-days` from that day, which leads with it when open.
 */
export function useClinicDay(clinicId: string | undefined, date: string | undefined) {
  const { result, query } = useCustom<OpenDay[]>({
    url: `${API_URL}/clinics/${clinicId}/open-days`,
    method: "get",
    config: { query: { from: date, days: 6 } },
    queryOptions: { enabled: Boolean(clinicId && date), refetchInterval: 30_000 },
  });
  const days = Array.isArray(result?.data) ? result.data : [];
  return {
    open: days[0]?.date === date,
    others: days.filter((day) => day.date !== date).slice(0, 5),
    isLoading: query.isLoading,
  };
}

/** Why a clinic's day cannot be booked, in the words the API would refuse it with. */
export function closedDayReason(doctors: DoctorAvailability[], date: string, today: string): string {
  if (!doctors.some((doctor) => doctor.day?.working)) {
    return "Ngày này phòng khám không có bác sĩ khám. Vui lòng chọn ngày khác.";
  }
  if (date === today) {
    return "Hôm nay phòng khám đã hết lượt hoặc hết giờ nhận đăng ký. Vui lòng chọn ngày khác.";
  }
  return "Ngày này phòng khám đã hết lượt khám. Vui lòng chọn ngày khác.";
}

/**
 * The next days with a place left (UC-01 A1, UC-03 C1), shown under a day that
 * cannot be had: buttons that pick them, or - with no `onPick` (a walk-in,
 * whose day is today) - days for the desk to tell the patient. The reason is
 * the date field's own message, so it is not said again here.
 */
export function OpenDayChoices({ days, onPick }: { days: OpenDay[]; onPick?: (date: string) => void }) {
  if (days.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2 md:col-span-8">
      <p className="text-muted-foreground text-sm">Các ngày còn lượt:</p>
      <div className="flex flex-wrap gap-2">
        {days.map((day) =>
          onPick ? (
            <Button key={day.date} type="button" variant="outline" size="sm" onClick={() => onPick(day.date)}>
              {formatLocalDate(day.date)} · còn {day.remaining} lượt
            </Button>
          ) : (
            <span key={day.date} className="rounded-md border px-2 py-1 text-sm">
              {formatLocalDate(day.date)} · còn {day.remaining} lượt
            </span>
          )
        )}
      </div>
    </div>
  );
}
