import { useCustom } from "@refinedev/core";
import { BellRingIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { customResult } from "@/shared/hooks/use-custom-result";
import type { Appointment, MyQueue } from "@/domains/appointment/types";
import { clinicToday } from "../appointments/clinic-day";
import { QUEUE_KEY, roomLabel } from "./use-queue-live";

/**
 * A visit's place in line, on the day: how many are before the patient while
 * they wait, and which room to go to once they are called. Nothing on any
 * other day or status. It keeps itself current through `useMyQueueLive`,
 * which the portal shell runs; the "it's your turn" toast is raised there too,
 * so it reaches the patient on whatever screen is open.
 */
export function QueueBanner({ appointment }: { appointment: Appointment }) {
  const today = appointment.appointmentDate === clinicToday();
  const waiting = today && appointment.status === "checked_in";
  const called = today && appointment.status === "in_exam";

  const { result, query } = useCustom<MyQueue>({
    url: `${API_URL}/my_appointments/${appointment.id}/queue`,
    method: "get",
    errorNotification: false,
    queryOptions: { queryKey: [QUEUE_KEY, appointment.id], enabled: waiting, retry: false },
  });
  const queue = customResult(result?.data, "ahead");

  if (called) {
    return (
      <div role="status" className="portal-hero flex items-center gap-3 rounded-2xl px-4 py-3">
        <BellRingIcon className="size-6 shrink-0 motion-safe:animate-bounce" />
        <div className="flex flex-col">
          <span className="font-display font-bold">Đến lượt bạn</span>
          <span className="text-sm text-white/90">Mời vào {roomLabel(appointment)}.</span>
        </div>
      </div>
    );
  }
  if (!waiting) return null;

  const headline =
    query.isLoading || !queue || queue.ahead == null
      ? "Đang chờ gọi số"
      : queue.skipped
        ? "Bạn đã được gọi nhưng chưa có mặt"
        : queue.ahead === 0
          ? "Bạn là người tiếp theo"
          : `Còn ${queue.ahead} người trước bạn`;

  return (
    <div role="status" className="bg-primary/10 flex items-center gap-3 rounded-2xl px-4 py-3">
      <span aria-hidden className="relative flex size-3 shrink-0">
        <span className="bg-primary absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
        <span className="bg-primary relative inline-flex size-3 rounded-full" />
      </span>
      <div className="flex flex-col">
        <span className="font-display font-bold">{headline}</span>
        <span className="text-muted-foreground text-sm">
          {queue?.skipped
            ? "Bạn sẽ được gọi lại sau ít phút. Hãy ở gần phòng khám."
            : "Tự cập nhật, không cần tải lại trang."}
        </span>
      </div>
    </div>
  );
}
