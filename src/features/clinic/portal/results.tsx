import { useList } from "@refinedev/core";
import { ChevronRightIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Skeleton } from "@/shared/ui/skeleton";
import type { Appointment } from "@/domains/appointment/types";
import { cn } from "@/shared/lib/utils";
import { formatVisitDay, VISIT_SORTERS } from "./visit";

/**
 * Every concluded visit under the account, newest first: the way into what
 * each doctor found and said. One account holds several people, so the list
 * can be narrowed to one of them.
 */
export const PortalResults = () => {
  const [person, setPerson] = useState<number | null>(null);
  const { result, query } = useList<Appointment>({
    resource: "my_appointments",
    pagination: { currentPage: 1, pageSize: 100 },
    filters: [{ field: "status", operator: "eq", value: "completed" }],
    sorters: [...VISIT_SORTERS],
  });

  const visits = result?.data ?? [];
  const people = [...new Map(visits.map((visit) => [visit.customer.id, visit.customer.fullName])).entries()];
  const shown = person == null ? visits : visits.filter((visit) => visit.customer.id === person);

  return (
    <div className="screen-enter screen-enter-stagger flex flex-col gap-5">
      <div>
        <h1>Kết quả khám</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Chẩn đoán, lời dặn của bác sĩ và kết quả các dịch vụ, có ngay khi bác sĩ hoàn tất lượt khám.
        </p>
      </div>

      {people.length > 1 && (
        <div role="group" aria-label="Lọc theo người" className="flex flex-wrap gap-2">
          {[[null, "Tất cả"] as const, ...people].map(([id, name]) => (
            <button
              key={id ?? "all"}
              type="button"
              aria-pressed={person === id}
              onClick={() => setPerson(id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                person === id
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : query.isError ? (
        <div className="bg-card flex flex-col items-start gap-1 rounded-2xl border border-dashed border-border p-5">
          <p className="font-medium">Không tải được danh sách kết quả.</p>
          <button type="button" className="text-primary text-sm font-medium hover:underline" onClick={() => query.refetch()}>
            Thử lại
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-card flex flex-col items-start gap-1 rounded-2xl border border-dashed border-border p-5">
          <p className="font-medium">Chưa có kết quả khám nào.</p>
          <p className="text-muted-foreground text-sm">Kết quả hiện ở đây khi bác sĩ hoàn tất lượt khám.</p>
        </div>
      ) : (
        <ul className="bg-card divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {shown.map((visit) => (
            <li key={visit.id}>
              <Link
                to={`/my-results/${visit.id}`}
                className="text-foreground hover:bg-muted/50 flex items-center gap-4 px-4 py-4 transition-colors"
              >
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <FileTextIcon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display font-semibold">{formatVisitDay(visit.appointmentDate)}</span>
                  <span className="text-muted-foreground truncate text-sm">
                    {visit.customer.fullName} · {visit.doctor?.fullName ?? visit.clinic.name}
                  </span>
                </span>
                <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
