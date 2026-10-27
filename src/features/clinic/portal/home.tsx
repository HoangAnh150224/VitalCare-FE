import { useGetIdentity, useList } from "@refinedev/core";
import {
  CalendarCheck2Icon,
  CalendarPlusIcon,
  ChevronRightIcon,
  FileHeartIcon,
  HeartPulseIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Appointment } from "@/domains/appointment/types";
import { formatQueueNumber } from "@/domains/appointment/types";
import type { Profile } from "@/domains/profile/types";
import { clinicToday } from "../appointments/clinic-day";
import { AppointmentActions } from "../appointments/appointment-actions";
import { AppointmentTicket } from "./appointment-ticket";
import { QueueBanner } from "./live-queue";
import { EmptyState, IconChip, PortalSection, VisitRow, type Tone } from "./parts";
import { useMyInvoices } from "./use-my-invoices";
import { formatVisitDay, isUpcoming, VISIT_SORTERS } from "./visit";

/** "Chào buổi sáng" before noon, and so on: how the SRS home greets (3.2.1). */
function greeting(hour: number): string {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/**
 * Where a customer lands after signing in: a welcome that already says when
 * the next visit is, the way in to each part of the portal with what is in
 * it, the next visit as its ticket, and the latest visits.
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
  const results = all.filter((visit) => visit.status === "completed").length;

  const profiles = profilesResult?.data ?? [];
  const incomplete = profiles.filter((profile) => !profile.complete).length;
  const firstName = user?.fullName?.trim().split(/\s+/).pop();
  const { invoices, query: invoicesQuery } = useMyInvoices();
  const unpaidBills = invoices.filter((invoice) => invoice.status === "unpaid").length;
  const loading = visitsQuery.isLoading || profilesQuery.isLoading || invoicesQuery.isLoading;

  const shortcuts: { to: string; label: string; note: string; icon: typeof CalendarCheck2Icon; tone: Tone }[] = [
    { to: "/my-appointments", label: "Lượt khám", note: `${upcoming.length} sắp tới`, icon: CalendarCheck2Icon, tone: "teal" },
    { to: "/my-results", label: "Kết quả", note: `${results} kết quả`, icon: FileHeartIcon, tone: "sky" },
    { to: "/my-profiles", label: "Hồ sơ", note: `${profiles.length} người`, icon: UsersRoundIcon, tone: "gold" },
    {
      to: "/my-payments",
      label: "Thanh toán",
      note: invoicesQuery.isError ? "Xem hóa đơn" : unpaidBills > 0 ? `${unpaidBills} chưa trả` : "Đã trả hết",
      icon: WalletIcon,
      tone: "green",
    },
  ];

  return (
    <div className="screen-enter screen-enter-stagger flex flex-col gap-8">
      <section className="portal-hero relative overflow-hidden rounded-[28px] px-6 py-7 sm:px-9 sm:py-9">
        <HeartPulseIcon
          aria-hidden
          strokeWidth={1.25}
          className="pointer-events-none absolute -right-8 -bottom-10 size-52 text-white/10 sm:size-64"
        />
        <h1 className="relative">
          {greeting(new Date().getHours())}, {firstName ?? "bạn"}
        </h1>
        <p className="relative mt-2 max-w-md text-white/90">
          {visitsQuery.isLoading
            ? " "
            : next
              ? `Lượt khám tiếp theo: ${formatVisitDay(next.appointmentDate)}, số ${formatQueueNumber(next.queueNumber)}.`
              : "Bạn chưa có lượt khám nào sắp tới. Đăng ký để nhận số khám ngay."}
        </p>
        <Button
          asChild
          size="lg"
          className="relative mt-6 h-12 text-(--hero-ink) rounded-full bg-white px-6 text-base font-semibold shadow-lg shadow-black/10 hover:bg-white/90"
        >
          <Link to="/my-appointments/create">
            <CalendarPlusIcon />
            Đăng ký khám
          </Link>
        </Button>
      </section>

      <nav aria-label="Lối tắt" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {shortcuts.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="card-soft text-foreground flex flex-col items-center gap-2 p-4 text-center transition-transform hover:-translate-y-0.5 sm:flex-row sm:gap-4 sm:p-5 sm:text-start"
          >
            <IconChip icon={item.icon} tone={item.tone} />
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold">{item.label}</span>
              <span className="text-muted-foreground text-xs sm:text-sm">{loading ? "…" : item.note}</span>
            </span>
          </Link>
        ))}
      </nav>

      {incomplete > 0 && (
        <Link
          to="/my-profiles"
          className="bg-gold-subtle text-gold-text flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium"
        >
          <TriangleAlertIcon className="size-5 shrink-0" />
          <span className="flex-1">
            {incomplete} hồ sơ cần bổ sung ngày sinh, giới tính và số CCCD trước khi đăng ký khám.
          </span>
          <ChevronRightIcon className="size-4 shrink-0" />
        </Link>
      )}

      <PortalSection
        title="Lượt khám sắp tới"
        action={
          upcoming.length > 1 && (
            <Link to="/my-appointments" className="text-primary text-sm font-medium hover:underline">
              Còn {upcoming.length - 1} lượt khác
            </Link>
          )
        }
      >
        {visitsQuery.isLoading ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : next ? (
          <AppointmentTicket
            appointment={next}
            status={<QueueBanner appointment={next} />}
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
          <EmptyState
            icon={CalendarCheck2Icon}
            title="Chưa có lượt khám nào sắp tới"
            text="Đăng ký khám để nhận số khám ngay, rồi đến phòng khám đúng ngày đã chọn."
          />
        )}
      </PortalSection>

      {recent.length > 0 && (
        <PortalSection
          title="Gần đây"
          action={
            <Link to="/my-appointments?tab=past" className="text-primary text-sm font-medium hover:underline">
              Xem tất cả
            </Link>
          }
        >
          <ul className="card-soft divide-y divide-border/70 overflow-hidden">
            {recent.map((visit) => (
              <li key={visit.id}>
                <VisitRow
                  visit={visit}
                  to={visit.status === "completed" ? `/my-results/${visit.id}` : `/my-appointments/show/${visit.id}`}
                />
              </li>
            ))}
          </ul>
        </PortalSection>
      )}
    </div>
  );
};
