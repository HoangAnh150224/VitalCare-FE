import { useGetIdentity, useList } from "@refinedev/core";
import { CalendarPlusIcon, ChevronRightIcon, UsersRoundIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatLocalDate } from "@/shared/lib/format";
import type { Appointment } from "@/domains/appointment/types";
import type { Profile } from "@/domains/profile/types";
import { clinicToday } from "../appointments/clinic-day";
import { AppointmentActions } from "../appointments/appointment-actions";
import { AppointmentTicket } from "./appointment-ticket";
import { isUpcoming, VISIT_SORTERS } from "./visit";

/** "Chào buổi sáng" before noon, and so on: how the SRS home greets (3.2.1). */
function greeting(hour: number): string {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/**
 * Where a customer lands after signing in: the next visit as its ticket, one
 * button to register another, and a word about the profiles visits are
 * registered for. Nothing here a person has to read a manual for.
 */
export const PortalHome = () => {
  const { data: user } = useGetIdentity<{ fullName?: string }>();
  const today = clinicToday();

  const { result: visits, query: visitsQuery } = useList<Appointment>({
    resource: "my_appointments",
    pagination: { currentPage: 1, pageSize: 100 },
    sorters: [...VISIT_SORTERS],
  });
  const { result: profilesResult, query: profilesQuery } = useList<Profile>({
    resource: "my_profiles",
    pagination: { mode: "off" },
  });

  const all = visits?.data ?? [];
  // The list comes newest first; the next visit is the soonest of those still to come.
  const upcoming = all.filter((visit) => isUpcoming(visit, today)).reverse();
  const next = upcoming[0];
  const recent = all.filter((visit) => !isUpcoming(visit, today)).slice(0, 3);

  const profiles = profilesResult?.data ?? [];
  const incomplete = profiles.filter((profile) => !profile.complete).length;
  const firstName = user?.fullName?.trim().split(/\s+/).pop();

  return (
    <div className="screen-enter screen-enter-stagger flex flex-col gap-8">
      <h1>
        {greeting(new Date().getHours())}, {firstName ?? "bạn"}
      </h1>

      <section className="flex flex-col gap-3" aria-labelledby="next-visit">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="next-visit" className="font-display text-lg font-semibold">
            Lượt khám sắp tới
          </h2>
          {upcoming.length > 1 && (
            <Link to="/my-appointments" className="text-primary text-sm font-medium hover:underline">
              Còn {upcoming.length - 1} lượt khác
            </Link>
          )}
        </div>

        {visitsQuery.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : next ? (
          <AppointmentTicket
            appointment={next}
            footer={
              <>
                <Button asChild variant="link" className="h-auto px-0">
                  <Link to={`/my-appointments/show/${next.id}`}>Xem phiếu và mã QR</Link>
                </Button>
                <AppointmentActions appointment={next} resource="my_appointments" size="sm" />
              </>
            }
          />
        ) : (
          <div className="bg-card flex flex-col items-start gap-1 rounded-2xl border border-dashed border-border p-5">
            <p className="font-medium">Bạn chưa có lượt khám nào sắp tới.</p>
            <p className="text-muted-foreground text-sm">
              Đăng ký khám để nhận số khám ngay, rồi đến phòng khám đúng ngày đã chọn.
            </p>
          </div>
        )}

        <Button asChild size="lg" className="h-12 w-full rounded-xl text-base sm:w-auto sm:self-start sm:px-8">
          <Link to="/my-appointments/create">
            <CalendarPlusIcon />
            Đăng ký khám
          </Link>
        </Button>
      </section>

      <Link
        to="/my-profiles"
        className="bg-card text-foreground hover:border-primary/40 flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors"
      >
        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
          <UsersRoundIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">Hồ sơ người tới khám</span>
          <span className="text-muted-foreground text-sm">
            {profilesQuery.isLoading
              ? "Đang tải…"
              : `${profiles.length} hồ sơ${
                  incomplete > 0 ? ` · ${incomplete} hồ sơ cần bổ sung trước khi đăng ký khám` : " · đã đủ thông tin"
                }`}
          </span>
        </span>
        <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
      </Link>

      {recent.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="recent-visits">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-visits" className="font-display text-lg font-semibold">
              Gần đây
            </h2>
            <Link to="/my-appointments?tab=past" className="text-primary text-sm font-medium hover:underline">
              Xem tất cả
            </Link>
          </div>
          <ul className="bg-card divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {recent.map((visit) => (
              <li key={visit.id}>
                <Link
                  to={`/my-appointments/show/${visit.id}`}
                  className="text-foreground hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {visit.doctor?.fullName ?? visit.clinic.name} · {visit.customer.fullName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatLocalDate(visit.appointmentDate)} · {statusWord(visit)}
                    </span>
                  </span>
                  <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

function statusWord(visit: Appointment): string {
  switch (visit.status) {
    case "completed":
      return "Đã khám";
    case "cancelled":
      return "Đã huỷ";
    case "no_show":
      return "Không đến";
    default:
      return "Đã qua ngày khám";
  }
}
