import type { ReactNode } from "react";

import { Badge } from "@/shared/ui/badge";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS, formatQueueNumber } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatLocalTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { formatVisitDay } from "./visit";

type Props = {
  appointment: Appointment;
  /** What sits under the tear line: the slip link, cancel, reschedule. */
  footer?: ReactNode;
  className?: string;
};

/**
 * One visit as the paper number a hospital hands out: the queue number large
 * on the stub, the day and the doctor beside it, and a perforated line above
 * whatever can be done with it.
 *
 * The number is the thing called at the doctor's door, so it carries the
 * page; everything else is there to say which visit this is.
 */
export function AppointmentTicket({ appointment, footer, className }: Props) {
  const ended = appointment.status === "cancelled" || appointment.status === "no_show";

  return (
    <article
      className={cn(
        "card-soft overflow-hidden",
        className
      )}
    >
      <div className={cn("flex gap-4 p-4 sm:gap-5 sm:p-5", ended && "opacity-60")}>
        <div
          className={cn(
            "flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl py-3 sm:w-24",
            ended ? "bg-muted text-muted-foreground" : "portal-hero"
          )}
        >
          <span className="text-[11px] font-medium opacity-80">Số khám</span>
          <span className="font-display text-4xl leading-none font-extrabold tabular-nums sm:text-5xl">
            {formatQueueNumber(appointment.queueNumber)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-base leading-snug font-semibold sm:text-lg">
              {formatVisitDay(appointment.appointmentDate)}
            </p>
            <Badge variant={APPOINTMENT_STATUS_VARIANTS[appointment.status] ?? "secondary"} className="shrink-0">
              {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">
            Dự kiến {formatLocalTime(appointment.startTime)} · {appointment.clinic.name}
          </p>
          <p className="truncate text-sm">
            {appointment.doctor?.fullName ?? "Bác sĩ chưa xác định"}
          </p>
          <p className="text-muted-foreground truncate text-sm">Người tới khám: {appointment.customer.fullName}</p>
        </div>
      </div>

      {footer && (
        <>
          {/* The tear line, with a notch cut into each edge like a paper stub. */}
          <div aria-hidden className="relative">
            <div className="mx-5 border-t-2 border-dashed border-border" />
            <span className="bg-background absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full" />
            <span className="bg-background absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full" />
          </div>
          <div data-print="hide" className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
            {footer}
          </div>
        </>
      )}
    </article>
  );
}
