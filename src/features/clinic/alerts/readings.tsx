import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import {
  ACTION_LABELS,
  ALERT_STATUS_LABELS,
  ALERT_STATUS_VARIANTS,
  METRIC_LABELS,
  SEVERITY_LABELS,
  SEVERITY_VARIANTS,
  valueWithUnit,
  type AbnormalReading,
} from "@/domains/alerts/types";

const PAGE = 20;

/** Abnormal Reading List (FE-05): every reading that raised or fed an alert, newest first. */
export const AbnormalReadingList = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["alerts", "readings", page],
    queryFn: async () => {
      const r = await kyInstance.get("alerts/readings", {
        searchParams: {
          _start: String(page * PAGE),
          _end: String((page + 1) * PAGE),
        },
      });
      return {
        rows: await r.json<AbnormalReading[]>(),
        total: Number(r.headers.get("X-Total-Count") ?? 0),
      };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const rows = data?.rows ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));

  return (
    <ListView>
      <ListViewHeader
        resource="alerts"
        title="Số đo bất thường"
        canCreate={false}
        description="Từng số đo đã gây ra hoặc cộng dồn vào một cảnh báo."
      />
      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm whitespace-nowrap"
            data-testid="abnormal-readings"
          >
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left font-medium">
                  Thời điểm đo
                </th>
                <th className="px-4 py-2.5 text-left font-medium">Bệnh nhân</th>
                <th className="px-4 py-2.5 text-left font-medium">Chỉ số</th>
                <th className="px-4 py-2.5 text-left font-medium">Mức độ</th>
                <th className="px-4 py-2.5 text-left font-medium">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground px-4 py-8 text-center"
                  >
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground px-4 py-8 text-center"
                  >
                    Chưa có số đo bất thường nào.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.actionId} className="border-b last:border-0">
                    <td className="px-4 py-2.5 tabular-nums">
                      <Link
                        to={`/vital-signs/show/${r.vitalSignId}`}
                        className="hover:underline"
                      >
                        {formatDateTime(r.measuredAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.patient ? (
                        <Link
                          to={`/vital-signs/patient/${r.patient.id}`}
                          className="hover:underline"
                        >
                          {r.patient.fullName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {METRIC_LABELS[r.metric]}{" "}
                      <span className="font-medium tabular-nums">
                        {valueWithUnit(r.metric, r.value)}
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {ACTION_LABELS[r.action]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={SEVERITY_VARIANTS[r.severity]}>
                        {SEVERITY_LABELS[r.severity]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/alerts/show/${r.alertId}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        #{r.alertId}
                        <Badge variant={ALERT_STATUS_VARIANTS[r.alertStatus]}>
                          {ALERT_STATUS_LABELS[r.alertStatus]}
                        </Badge>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <span className="tabular-nums">{data?.total ?? 0} số đo</span>
          <span className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Trang trước"
            >
              <ChevronLeftIcon />
            </Button>
            <span className="tabular-nums">
              {page + 1}/{pages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Trang sau"
            >
              <ChevronRightIcon />
            </Button>
          </span>
        </div>
      </Card>
    </ListView>
  );
};
