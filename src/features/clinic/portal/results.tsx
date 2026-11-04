import { useList } from "@refinedev/core";
import { CloudOffIcon, FileHeartIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Appointment } from "@/domains/appointment/types";
import { cn } from "@/shared/lib/utils";
import { EmptyState, VisitRow } from "./parts";
import { VISIT_SORTERS } from "./visit";

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
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                person === id
                  ? "bg-primary text-primary-foreground"
                  : "card-soft text-muted-foreground hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-20 rounded-3xl" />
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={CloudOffIcon}
          title="Không tải được danh sách kết quả"
          action={
            <Button variant="outline" className="rounded-full" onClick={() => query.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={FileHeartIcon}
          title="Chưa có kết quả khám nào"
          text="Kết quả hiện ở đây khi bác sĩ hoàn tất lượt khám."
        />
      ) : (
        <ul className="card-soft divide-y divide-border/70 overflow-hidden">
          {shown.map((visit) => (
            <li key={visit.id}>
              <VisitRow visit={visit} to={`/my-results/${visit.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
