import { useCan, useNotification } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatDateTime } from "@/shared/lib/format";
import {
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANTS,
  resultsErrorText,
  type ResultReturn,
} from "@/domains/results/types";
import { refusal, send, vnLocal } from "./send";

const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/**
 * BF-07 at the desk: the day's result returns. The receptionist verifies a
 * patient who came back; a missed one is rescheduled.
 */
export const ResultReturnList = () => {
  const [day, setDay] = useState(today());
  const [status, setStatus] = useState("");
  const [rescheduling, setRescheduling] = useState<number | null>(null);
  const [at, setAt] = useState("");
  const { data: canWrite } = useCan({ resource: "result_returns", action: "edit" });
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const key = ["result_returns", "desk", day, status];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => {
      const searchParams = new URLSearchParams({ _end: "500" });
      // A missed return is looked for whenever it was; the rest by their day.
      if (status !== "MISSED" && day) searchParams.append("date", day);
      if (status) searchParams.append("status", status);
      return kyInstance.get("result_returns", { searchParams }).json<ResultReturn[]>();
    },
  });
  const act = useMutation({
    mutationFn: ({ id, step, body }: { id: number; step: string; body?: unknown }) =>
      send("post", `result_returns/${id}/${step}`, body),
    onSuccess: (_, { step }) => {
      notify?.({
        type: "success",
        message: step === "arrive" ? "Đã xác nhận bệnh nhân đến nhận kết quả" : step === "reschedule" ? "Đã đặt lại lịch" : "Đã huỷ hẹn",
      });
      setRescheduling(null);
      setAt("");
      void queryClient.invalidateQueries({ queryKey: ["result_returns"] });
    },
    onError: (e) => notify?.({ type: "error", message: resultsErrorText(refusal(e)) }),
  });
  const rows = data ?? [];

  return (
    <ListView>
      <ListViewHeader
        resource="result_returns"
        title="Hẹn trả kết quả"
        description="Bệnh nhân hẹn quay lại nhận và nghe tư vấn kết quả."
        canCreate={false}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="return-day">Ngày</Label>
          <Input id="return-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="flex gap-1" role="group" aria-label="Trạng thái">
          {["", "SCHEDULED", "ARRIVED", "MISSED"].map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
              {s ? RETURN_STATUS_LABELS[s as keyof typeof RETURN_STATUS_LABELS] : "Tất cả"}
            </Button>
          ))}
        </div>
      </div>
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Giờ hẹn</TableHead>
              <TableHead>Bệnh nhân</TableHead>
              <TableHead>Lượt khám</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  Không có lịch hẹn trả kết quả.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} data-testid={`return-${r.id}`}>
                <TableCell className="tabular-nums">{formatDateTime(r.scheduledAt)}</TableCell>
                <TableCell>{r.customerName}</TableCell>
                <TableCell>
                  <Link className="underline-offset-2 hover:underline" to={`/appointments/show/${r.appointmentId}`}>
                    #{r.appointmentId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={RETURN_STATUS_VARIANTS[r.status]}>{RETURN_STATUS_LABELS[r.status]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.note ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {canWrite?.can && (r.status === "SCHEDULED" || r.status === "MISSED") && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {rescheduling === r.id ? (
                        <>
                          <Input
                            aria-label="Thời điểm mới"
                            type="datetime-local"
                            className="w-52"
                            value={at}
                            onChange={(e) => setAt(e.target.value)}
                          />
                          <Button
                            size="sm"
                            disabled={!at || act.isPending}
                            onClick={() => act.mutate({ id: r.id, step: "reschedule", body: { scheduledAt: vnLocal(at) } })}
                          >
                            Lưu lịch mới
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ id: r.id, step: "arrive" })}>
                            Xác nhận đã đến
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRescheduling(r.id)}>
                            Đặt lại lịch
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={act.isPending}
                            onClick={() => act.mutate({ id: r.id, step: "cancel" })}
                          >
                            Huỷ
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </ListView>
  );
};
