import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { cn } from "@/shared/lib/utils";
import { clinicToday } from "../appointments/clinic-day";

/** The portal's few colours, each tied to one kind of thing so they mean something. */
export const TONES = {
  teal: "bg-primary/12 text-primary",
  sky: "bg-info-subtle text-info-text",
  gold: "bg-gold-subtle text-gold-text",
  green: "bg-success-subtle text-success-text",
  rose: "bg-destructive-subtle text-destructive-text",
} as const;

export type Tone = keyof typeof TONES;

export function IconChip({ icon: Icon, tone = "teal", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", TONES[tone], className)}>
      <Icon className="size-5" />
    </span>
  );
}

/** `2026-10-15` as a calendar leaf: the day large, month and year under it. */
export function DateBlock({ isoDate, muted }: { isoDate: string; muted?: boolean }) {
  const [year, month, day] = isoDate.split("-");
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl leading-none",
        muted ? "bg-muted text-muted-foreground" : TONES.teal
      )}
    >
      <span className="font-display text-xl font-extrabold tabular-nums">{day}</span>
      <span className="mt-1 text-[10px] font-medium tabular-nums">
        {Number(month)}/{year}
      </span>
    </span>
  );
}

/** One visit in a list: when, who, with which doctor, and how it stands. */
export function VisitRow({ visit, to }: { visit: Appointment; to: string }) {
  const ended = visit.status === "cancelled" || visit.status === "no_show";
  // Past its day but never closed at the desk: "registered" would read as still to come.
  const lapsed = !ended && visit.status !== "completed" && visit.appointmentDate < clinicToday();
  return (
    <Link
      to={to}
      className="text-foreground hover:bg-muted/40 flex items-center gap-4 px-4 py-3.5 transition-colors sm:px-5"
    >
      <DateBlock isoDate={visit.appointmentDate} muted={ended} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-semibold">{visit.customer.fullName}</span>
        <span className="text-muted-foreground truncate text-sm">{visit.doctor?.fullName ?? visit.clinic.name}</span>
      </span>
      <Badge variant={lapsed ? "neutral" : (APPOINTMENT_STATUS_VARIANTS[visit.status] ?? "secondary")} className="shrink-0">
        {lapsed ? "Đã qua ngày khám" : (APPOINTMENT_STATUS_LABELS[visit.status] ?? visit.status)}
      </Badge>
      <ChevronRightIcon className="text-muted-foreground hidden size-5 shrink-0 sm:block" />
    </Link>
  );
}

/** Nothing to show yet, said with what to do about it. */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-soft flex flex-col items-center gap-2 px-6 py-10 text-center">
      <IconChip icon={icon} className="mb-1 size-14 rounded-3xl" />
      <p className="font-display text-base font-semibold">{title}</p>
      {text && <p className="text-muted-foreground max-w-sm text-sm">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** A titled block of a portal page. */
export function PortalSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-display text-lg font-bold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
