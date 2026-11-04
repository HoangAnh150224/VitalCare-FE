import { useCustom } from "@refinedev/core";

import { API_URL } from "@/shared/api/constants";
import { formatLocalTime } from "@/shared/lib/format";
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
