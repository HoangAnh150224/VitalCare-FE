import { useList } from "@refinedev/core";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { formatLocalDate } from "@/shared/lib/format";
import type { Appointment } from "@/domains/appointment/types";
import {
  APPOINTMENT_STATUS_LABELS,
  formatQueueNumber,
} from "@/domains/appointment/types";
import type { Clinic } from "@/domains/clinic/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { clinicToday } from "./clinic-day";
import { doctorLabel, useClinicDoctors } from "./doctor-day";

const WEEK_HEADINGS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const ALL = "all";

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Appointment Calendar (FE-10): a month of registered visits, a day at a
 * glance — how many, and how many still to come — with the chosen doctor's
 * working days marked. Opening a day lists its visits.
 */
export const AppointmentCalendar = () => {
  const today = clinicToday();
  const [month, setMonth] = useState(() => {
    const [year, m] = today.split("-").map(Number);
    return new Date(year, m - 1, 1);
  });
  const [selected, setSelected] = useState(today);
  const { result: clinicsResult } = useList<Clinic>({
    resource: "clinics",
    pagination: { mode: "off" },
  });
  const clinics = clinicsResult?.data ?? [];
  const [clinicId, setClinicId] = useState<string>("");
  const clinic = clinicId || clinics[0]?.id || "";
  const [doctorId, setDoctorId] = useState<string>(ALL);
  const { doctors } = useClinicDoctors(clinic || undefined, undefined);
  const doctor = doctors.find((candidate) => String(candidate.id) === doctorId);

  const first = month;
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const { result, query } = useList<Appointment>({
    resource: "appointments",
    filters: [
      { field: "appointmentDate", operator: "gte", value: iso(first) },
      { field: "appointmentDate", operator: "lte", value: iso(last) },
      ...(clinic
        ? [{ field: "clinicId", operator: "eq" as const, value: clinic }]
        : []),
      ...(doctorId !== ALL
        ? [{ field: "employeeId", operator: "eq" as const, value: doctorId }]
        : []),
    ],
    pagination: { currentPage: 1, pageSize: 1000 },
    sorters: [{ field: "appointmentDate", order: "asc" }],
  });
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const visit of result?.data ?? []) {
      map.set(visit.appointmentDate, [
        ...(map.get(visit.appointmentDate) ?? []),
        visit,
      ]);
    }
    return map;
  }, [result?.data]);

  // Monday-first grid: blanks before the 1st, then the month's days.
  const lead = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from(
      { length: last.getDate() },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)
    ),
  ];
  const workingDays = new Set(
    doctor?.workingHours.map((session) => session.dayOfWeek) ?? []
  );
  const dayVisits = [...(byDay.get(selected) ?? [])].sort(
    (x, y) =>
      (x.doctor?.id ?? 0) - (y.doctor?.id ?? 0) ||
      (x.queueNumber ?? 0) - (y.queueNumber ?? 0)
  );

  return (
    <ListView>
      <ListViewHeader
        resource="appointments"
        title="Lịch đăng ký khám"
        canCreate={false}
        description="Số lượt đăng ký khám theo ngày. Chọn bác sĩ để xem ngày làm việc của bác sĩ đó."
      />
      <Card className="gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Tháng trước"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-36 text-center font-semibold">
            Tháng {month.getMonth() + 1}/{month.getFullYear()}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Tháng sau"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRightIcon />
          </Button>
          <div className="ms-auto flex flex-wrap gap-2">
            {clinics.length > 1 && (
              <Select
                value={clinic}
                onValueChange={(value) => {
                  setClinicId(value);
                  setDoctorId(ALL);
                }}
              >
                <SelectTrigger className="w-56" aria-label="Cơ sở">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger className="w-64" aria-label="Bác sĩ">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả bác sĩ</SelectItem>
                {doctors.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {doctorLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
          {WEEK_HEADINGS.map((heading) => (
            <span key={heading} className="text-muted-foreground py-1">
              {heading}
            </span>
          ))}
          {cells.map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />;
            const key = iso(date);
            const visits = byDay.get(key) ?? [];
            const open = visits.filter(
              (visit) =>
                visit.status !== "cancelled" && visit.status !== "no_show"
            );
            const weekday = ((date.getDay() + 6) % 7) + 1;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-pressed={selected === key}
                className={cn(
                  "flex min-h-20 flex-col items-start gap-1 rounded-lg border p-2 text-left transition-colors",
                  doctor && workingDays.has(weekday) && "bg-primary/5",
                  selected === key
                    ? "border-primary ring-primary/30 ring-2"
                    : "hover:bg-muted/60",
                  key === today && "font-bold"
                )}
              >
                <span className="tabular-nums">{date.getDate()}</span>
                {open.length > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[11px] tabular-nums">
                    {open.length} lượt
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {doctor && (
          <p className="text-muted-foreground text-xs">
            <span className="bg-primary/5 mr-1 inline-block size-3 rounded border align-middle" />{" "}
            Ngày {doctor.fullName} làm việc.
          </p>
        )}
      </Card>

      <Card className="gap-2 p-4">
        <h3 className="font-semibold">
          {formatLocalDate(selected)} · {dayVisits.length} lượt
        </h3>
        {query.isLoading ? (
          <p className="text-muted-foreground text-sm">Đang tải…</p>
        ) : dayVisits.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Không có lượt đăng ký khám nào.
          </p>
        ) : (
          <ul className="divide-y">
            {dayVisits.map((visit) => (
              <li
                key={visit.id}
                className="flex flex-wrap items-center gap-3 py-2 text-sm"
              >
                <span className="w-8 font-semibold tabular-nums">
                  {formatQueueNumber(visit.queueNumber)}
                </span>
                <Link
                  to={`/appointments/show/${visit.id}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {visit.customer.fullName}
                </Link>
                <span className="text-muted-foreground truncate">
                  {visit.doctor?.fullName}
                </span>
                <Badge
                  variant={
                    APPOINTMENT_STATUS_VARIANTS[visit.status] ?? "secondary"
                  }
                >
                  {APPOINTMENT_STATUS_LABELS[visit.status] ?? visit.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </ListView>
  );
};
