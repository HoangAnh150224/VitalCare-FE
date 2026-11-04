import { useQuery } from "@tanstack/react-query";

import { publicGet, publicRetry } from "@/shared/api/public";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatMoney } from "@/shared/lib/format";
import type { ServiceCategory } from "@/domains/billing/types";
import { SERVICE_CATEGORY_LABELS } from "@/domains/billing/types";
import type { PublicService } from "@/domains/public-site/types";
import { PublicPageHeader } from "./layout";

const ORDER: ServiceCategory[] = [
  "consultation",
  "lab",
  "imaging",
  "procedure",
];

/** SRS UC "View Clinic Services": the price list, the same at every clinic, grouped by kind. */
export function PublicServices() {
  const {
    data: services,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public", "services"],
    retry: publicRetry,
    queryFn: () => publicGet<PublicService[]>("services"),
    staleTime: 60_000,
  });

  return (
    <>
      <PublicPageHeader
        title="Dịch vụ & bảng giá"
        description="Áp dụng như nhau tại mọi cơ sở. Phí khám tính một lần cho mỗi lượt khám; xét nghiệm và thủ thuật chỉ làm khi bác sĩ chỉ định."
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-12 sm:px-6">
        {isLoading && <Skeleton className="h-64 rounded-2xl" />}
        {error && (
          <p className="text-destructive">{(error as Error).message}</p>
        )}
        {services?.length === 0 && (
          <p className="text-muted-foreground">
            Danh mục dịch vụ đang được cập nhật.
          </p>
        )}
        {ORDER.map((category) => {
          const rows =
            services?.filter((service) => service.category === category) ?? [];
          if (rows.length === 0) return null;
          return (
            <Card key={category} className="rounded-2xl">
              <CardContent>
                <h2 className="mb-3 text-lg font-semibold">
                  {SERVICE_CATEGORY_LABELS[category]}
                </h2>
                <ul className="divide-y">
                  {rows.map((service) => (
                    <li
                      key={service.id}
                      className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-muted-foreground text-sm">
                            {service.description}
                          </p>
                        )}
                        {category !== "consultation" &&
                        service.turnaroundMinutes ? (
                          <p className="text-muted-foreground text-xs">
                            Có kết quả sau khoảng{" "}
                            {formatMinutes(service.turnaroundMinutes)}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-primary font-semibold tabular-nums">
                        {formatMoney(service.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}
