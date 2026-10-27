import { useList } from "@refinedev/core";
import { CalendarPlusIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Appointment } from "@/domains/appointment/types";
import { cn } from "@/shared/lib/utils";
import { clinicToday } from "../appointments/clinic-day";
import { AppointmentActions } from "../appointments/appointment-actions";
import { AppointmentTicket } from "./appointment-ticket";
import { isUpcoming, VISIT_SORTERS } from "./visit";

type Tab = "upcoming" | "past";

/**
 * A customer's visits, split the way a person thinks of them — still to come,
 * or done with — each as its ticket. The SRS's patient list (3.11.1) has the
 * same two tabs.
 *
 * One request for all of them: a person's own visits are a few dozen at the
 * most, and splitting them client-side keeps both tabs instant. Staff viewing
 * as a customer keep the table (`MyAppointmentList`).
 */
export const PortalAppointments = () => {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "past" ? "past" : "upcoming";
  const today = clinicToday();

  const { result, query } = useList<Appointment>({
    resource: "my_appointments",
    pagination: { currentPage: 1, pageSize: 100 },
    sorters: [...VISIT_SORTERS],
  });

  const all = result?.data ?? [];
  // Newest first from the API: soonest first for what is coming, most recent first for what is done.
  const upcoming = all.filter((visit) => isUpcoming(visit, today)).reverse();
  const past = all.filter((visit) => !isUpcoming(visit, today));
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="screen-enter screen-enter-stagger flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Lượt khám</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Đến phòng khám, đưa phiếu cho lễ tân để được tiếp nhận rồi chờ gọi số.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link to="/my-appointments/create">
            <CalendarPlusIcon />
            Đăng ký khám
          </Link>
        </Button>
      </div>

      <div role="group" aria-label="Lọc lượt khám" className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1 sm:w-80">
        {(
          [
            ["upcoming", "Sắp tới", upcoming.length],
            ["past", "Đã qua", past.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setParams(value === "upcoming" ? {} : { tab: value }, { replace: true })}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {!query.isLoading && <span className="text-muted-foreground ms-1.5 tabular-nums">{count}</span>}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-card flex flex-col items-start gap-1 rounded-2xl border border-dashed border-border p-5">
          <p className="font-medium">
            {tab === "upcoming" ? "Chưa có lượt khám nào sắp tới." : "Chưa có lượt khám nào đã qua."}
          </p>
          {tab === "upcoming" && (
            <p className="text-muted-foreground text-sm">Bấm “Đăng ký khám” để chọn bác sĩ, ngày khám và nhận số.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((visit) => (
            <AppointmentTicket
              key={visit.id}
              appointment={visit}
              footer={
                <>
                  <Button asChild variant="link" className="h-auto px-0">
                    <Link to={`/my-appointments/show/${visit.id}`}>
                      {visit.status === "completed" ? "Xem phiếu và hoá đơn" : "Xem phiếu"}
                    </Link>
                  </Button>
                  {tab === "upcoming" && (
                    <AppointmentActions appointment={visit} resource="my_appointments" size="sm" />
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
