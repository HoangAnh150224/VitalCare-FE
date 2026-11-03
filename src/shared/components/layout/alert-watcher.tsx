import { useCan, useInvalidate, useNotification } from "@refinedev/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SirenIcon } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { subscribe } from "@/shared/api/live";
import { cn } from "@/shared/lib/utils";

type Summary = { clinicId: string | null; active: number; critical: number };

/**
 * The staff header's alert light (BF-05): how many critical alerts still need
 * somebody, live. A critical alert raised while the screen is open also pops
 * up; the lists and the alert pages re-read themselves.
 */
export function AlertWatcher() {
  const { data: can } = useCan({ resource: "alerts", action: "list" });
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const invalidate = useInvalidate();
  const { data, refetch } = useQuery({
    queryKey: ["alerts", "summary"],
    queryFn: () => kyInstance.get("alerts/summary").json<Summary>(),
    enabled: Boolean(can?.can),
    refetchInterval: 60_000,
  });
  const clinicId = data?.clinicId;

  useEffect(() => {
    if (!clinicId) return;
    return subscribe(`/topic/alerts/${clinicId}`, (body) => {
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      invalidate({
        resource: "alerts",
        invalidates: ["list", "many", "detail"],
      });
      if ((body as { severity?: string } | null)?.severity === "CRITICAL") {
        notify?.({
          type: "error",
          message: "Cảnh báo khẩn cấp mới",
          description:
            "Có bệnh nhân vừa có chỉ số nguy hiểm. Mở danh sách cảnh báo để xử lý.",
          key: "critical-alert",
        });
      }
    });
    // refetch and notify are stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  if (!can?.can || !data || data.active === 0) return null;
  return (
    <Link
      to={
        data.critical > 0
          ? "/alerts?filters[0][field]=severity&filters[0][operator]=eq&filters[0][value]=CRITICAL"
          : "/alerts"
      }
      data-testid="alert-watcher"
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        data.critical > 0
          ? "bg-destructive text-white animate-pulse"
          : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
      )}
    >
      <SirenIcon className="size-3.5" />
      {data.critical > 0
        ? `${data.critical} cảnh báo khẩn`
        : `${data.active} cảnh báo`}
    </Link>
  );
}
