import { useGetIdentity, useList } from "@refinedev/core";
import {
  CalendarCheck2Icon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudOffIcon,
  FileHeartIcon,
  HeartPulseIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
  WalletIcon,
  Share2Icon,
  HandHeartIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { usePortalCanOpen } from "@/shared/components/layout/portal-layout";
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
  // Which upcoming visit the card shows (KAN-72); kept in range when the list shrinks.
  const [shownIndex, setShownIndex] = useState(0);
  const current = Math.min(shownIndex, Math.max(upcoming.length - 1, 0));
  const next = upcoming[current];
  const recent = all.filter((visit) => !isUpcoming(visit, today)).slice(0, 3);
  const results = all.filter((visit) => visit.status === "completed").length;

  const profiles = profilesResult?.data ?? [];
  const incomplete = profiles.filter((profile) => !profile.complete).length;
  const firstName = user?.fullName?.trim().split(/\s+/).pop();
  const { invoices, query: invoicesQuery } = useMyInvoices();
  const unpaidBills = invoices.filter((invoice) => invoice.status === "unpaid").length;
  const loading = visitsQuery.isLoading || profilesQuery.isLoading || invoicesQuery.isLoading;
  // KAN-71: a list that failed to load is not an empty one; no "0 người" for an account that has a profile.
  const failed = [visitsQuery, profilesQuery, invoicesQuery].filter((query) => query.isError);
  const notLoaded = "Chưa tải được";

  const canOpen = usePortalCanOpen();
  const allShortcuts: { to: string; label: string; note: string; icon: typeof CalendarCheck2Icon; tone: Tone; resource: string }[] = [
    { to: "/my-appointments", label: "Lượt khám", note: visitsQuery.isError ? notLoaded : `${upcoming.length} sắp tới`, icon: CalendarCheck2Icon, tone: "teal", resource: "my_appointments" },
    { to: "/my-results", label: "Kết quả", note: visitsQuery.isError ? notLoaded : `${results} kết quả`, icon: FileHeartIcon, tone: "sky", resource: "my_appointments" },
    { to: "/my-profiles", label: "Hồ sơ", note: profilesQuery.isError ? notLoaded : `${profiles.length} người`, icon: UsersRoundIcon, tone: "gold", resource: "my_profiles" },
    { to: "/my-sharing", label: "Chia sẻ", note: "Người chăm sóc", icon: Share2Icon, tone: "sky", resource: "my_sharing" },
    { to: "/shared-patients", label: "Chăm sóc", note: "Người thân của tôi", icon: HandHeartIcon, tone: "teal", resource: "shared_patients" },
    {
      to: "/my-payments",
      label: "Thanh toán",
      note: invoicesQuery.isError ? "Xem hóa đơn" : unpaidBills > 0 ? `${unpaidBills} chưa trả` : "Đã trả hết",
      icon: WalletIcon,
      tone: "green",
      resource: "my_appointments",
    },
  ];
  // KAN-70: a guest is not shown the way in to a screen its account cannot open.
  const shortcuts = allShortcuts.filter((item) => canOpen(item.resource));

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
          {visitsQuery.isLoading || visitsQuery.isError
            ? " "
            : next
              ? next.queueNumber == null
                ? `Lượt khám tiếp theo: ${formatVisitDay(next.appointmentDate)}, chưa có số khám.`
                : `Lượt khám tiếp theo: ${formatVisitDay(next.appointmentDate)}, số ${formatQueueNumber(next.queueNumber)}.`
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

      {failed.length > 0 && (
        <div role="alert" className="card-soft flex flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center">
          <CloudOffIcon className="text-destructive size-5 shrink-0" />
          <p className="flex-1 text-sm">
            Không thể tải dữ liệu trang chủ. Vui lòng kiểm tra kết nối mạng và thử lại.
          </p>
          <Button variant="outline" className="rounded-full" onClick={() => failed.forEach((query) => void query.refetch())}>
            Thử lại
          </Button>
        </div>
      )}

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
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Lượt khám trước"
                disabled={current === 0}
                onClick={() => setShownIndex(current - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <span className="text-muted-foreground min-w-10 text-center text-sm tabular-nums" aria-live="polite">
                {current + 1}/{upcoming.length}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Lượt khám sau"
                disabled={current === upcoming.length - 1}
                onClick={() => setShownIndex(current + 1)}
              >
                <ChevronRightIcon />
              </Button>
              <Link to="/my-appointments" className="text-primary ms-1 text-sm font-medium hover:underline">
                Xem tất cả
              </Link>
            </div>
          )
        }
      >
        {visitsQuery.isLoading ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : visitsQuery.isError ? (
          // The failure and its retry are said once, in the alert above (RULE-35).
          <p className="text-muted-foreground text-sm">Chưa tải được.</p>
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
