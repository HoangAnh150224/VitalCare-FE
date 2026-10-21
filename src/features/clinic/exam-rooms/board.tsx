import { useEffect, useState } from "react";
import { useCan, useCustom, useCustomMutation, useInvalidate } from "@refinedev/core";
import {
  CheckIcon,
  DoorOpenIcon,
  PauseIcon,
  PlayIcon,
  PhoneCallIcon,
  SkipForwardIcon,
  StethoscopeIcon,
  UserXIcon,
} from "lucide-react";
import { Link } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { subscribe } from "@/shared/api/live";
import { customResult } from "@/shared/hooks/use-custom-result";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { formatQueueNumber } from "@/domains/appointment/types";
import { newEncounterPath } from "@/domains/encounter/types";
import { EXAM_ROOM_STATUS_LABELS, type BoardVisit, type ExamRoomStatus, type RoomBoard } from "@/domains/exam-room/types";
import { cn } from "@/shared/lib/utils";

type Room = RoomBoard["rooms"][number];
type RoomAction = "call-next" | "pass-over" | "no-show" | "finish" | "pause" | "resume";

const STATUS_VARIANT: Record<ExamRoomStatus, "success" | "default" | "neutral"> = {
  available: "success",
  occupied: "default",
  paused: "neutral",
};

/** `HH:mm` of an instant, on the clinic's (the browser's) clock. */
const clockTime = (value: string | null) =>
  value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * The clinic's floor: every examination room, who is in it, and who waits
 * for that room's doctor.
 *
 * Who goes into a room is the server's to decide (one dispatcher, safe under
 * any number of callers): a free room with a doctor on duty calls the next
 * person by itself as soon as somebody checks in or the room frees up. The
 * buttons here are for what only a person knows: the patient has been seen,
 * did not answer, or the room has to stop for a while.
 *
 * Kept current by a push on `/topic/exam_rooms/{clinicId}` (a nudge to
 * reload; the board itself comes over HTTP, through the clinic scope), with a
 * slow poll behind it for when the socket is down.
 */
export function ExamRoomBoard() {
  const { result, query } = useCustom<RoomBoard>({
    url: `${API_URL}/exam_rooms/board`,
    method: "get",
    queryOptions: { refetchInterval: 30_000 },
  });
  const board = customResult(result?.data, "rooms");
  const clinicId = board?.clinicId;

  useEffect(() => {
    if (!clinicId) return;
    return subscribe(`/topic/exam_rooms/${clinicId}`, () => void query.refetch());
    // query.refetch is stable for the life of the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const { data: canOperate } = useCan({ resource: "exam_rooms", action: "operate" });
  const { data: canSetUp } = useCan({ resource: "exam_rooms", action: "create" });
  const { data: canExamine } = useCan({ resource: "clinical_encounters", action: "create" });

  const invalidate = useInvalidate();
  const { mutate } = useCustomMutation<RoomBoard>();
  // Per room: two rooms worked at once each keep their own button disabled.
  const [pending, setPending] = useState<Record<number, RoomAction>>({});

  const act = (room: Room, action: RoomAction) => {
    setPending((current) => ({ ...current, [room.id]: action }));
    mutate(
      {
        url: `${API_URL}/exam_rooms/${room.id}/${action}`,
        method: "post",
        values: {},
        // See ResetPasswordCard: without it Spring answers 415.
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSettled: () => {
          setPending((current) => {
            const rest = { ...current };
            delete rest[room.id];
            return rest;
          });
          void query.refetch();
          // Finishing completes a visit; the appointment lists should show it.
          invalidate({ resource: "appointments", invalidates: ["list"] });
        },
      }
    );
  };

  const rooms = board?.rooms ?? [];
  const waitingTotal =
    rooms.reduce((sum, room) => sum + room.waiting.length, 0) +
    (board?.withoutRoom ?? []).reduce((sum, queue) => sum + queue.waiting.length, 0);

  return (
    <ListView>
      <ListViewHeader
        title="Điều phối phòng khám"
        canCreate={false}
        description="Người đã tiếp nhận được tự động gọi vào phòng của bác sĩ mình khi phòng trống. Bảng tự cập nhật."
      />

      {board && (
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            <strong className="text-foreground tabular-nums">{rooms.filter((r) => r.status === "occupied").length}</strong> /{" "}
            {rooms.length} phòng đang khám
          </span>
          <span>
            <strong className="text-foreground tabular-nums">{waitingTotal}</strong> người đang chờ
          </span>
          <span>Cập nhật lúc {clockTime(board.at)}</span>
        </div>
      )}

      {board && rooms.length === 0 && (
        <Card className="flex flex-col items-start gap-2 p-6">
          <p className="font-medium">Cơ sở chưa có phòng khám nào.</p>
          <p className="text-muted-foreground text-sm">
            {canSetUp?.can
              ? "Thêm phòng ở trang chi tiết cơ sở, rồi xếp bác sĩ vào phòng trong Lịch bác sĩ."
              : "Quản trị phòng khám thêm phòng ở trang chi tiết cơ sở."}
          </p>
          {canSetUp?.can && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/clinics/show/${board.clinicId}`}>Mở trang cơ sở</Link>
            </Button>
          )}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            canOperate={canOperate?.can ?? false}
            canExamine={canExamine?.can ?? false}
            pending={pending[room.id] ?? null}
            onAction={(action) => act(room, action)}
          />
        ))}
      </div>

      {board && board.withoutRoom.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="font-semibold">Đang chờ nhưng bác sĩ chưa có phòng</h3>
            <p className="text-muted-foreground text-sm">
              Bác sĩ không có buổi làm việc nào xếp phòng vào lúc này. Xếp phòng trong Lịch bác sĩ để người chờ được gọi vào.
            </p>
          </div>
          {board.withoutRoom.map((queue) => (
            <div key={queue.doctor.id} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{queue.doctor.fullName}</span>
              <WaitingList visits={queue.waiting} />
            </div>
          ))}
        </Card>
      )}
    </ListView>
  );
}

function RoomCard({
  room,
  canOperate,
  canExamine,
  pending,
  onAction,
}: {
  room: Room;
  canOperate: boolean;
  canExamine: boolean;
  pending: RoomAction | null;
  onAction: (action: RoomAction) => void;
}) {
  const busy = (action: RoomAction) => pending === action;
  const anyBusy = pending !== null;
  const current = room.current;

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-5",
        room.status === "occupied" && "border-primary/40",
        room.status === "paused" && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DoorOpenIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="font-semibold">{room.code}</span>
            {room.name && <span className="text-muted-foreground truncate text-sm">· {room.name}</span>}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {room.doctor ? room.doctor.fullName : "Không có bác sĩ trong ca này"}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[room.status]}>{EXAM_ROOM_STATUS_LABELS[room.status]}</Badge>
      </div>

      <div className="bg-muted/40 flex min-h-24 items-center gap-4 rounded-lg px-4 py-3">
        {current ? (
          <>
            <span className="text-primary text-4xl font-bold tabular-nums">{formatQueueNumber(current.queueNumber)}</span>
            <div className="min-w-0">
              <Link to={`/customers/show/${current.customerId}`} className="block truncate font-medium hover:underline">
                {current.patientName}
              </Link>
              <span className="text-muted-foreground text-sm">Vào phòng lúc {clockTime(current.calledAt)}</span>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">
            {room.status === "paused"
              ? "Phòng đang tạm ngưng."
              : !room.doctor
                ? "Phòng trống, chưa có bác sĩ trực."
                : room.waiting.length === 0
                  ? "Phòng trống, chưa có ai chờ."
                  : "Phòng trống, đang gọi người kế tiếp…"}
          </span>
        )}
      </div>

      {canOperate && (
        <div className="flex flex-wrap gap-2">
          {current && (
            <>
              {canExamine && (
                <Button asChild size="sm">
                  <Link
                    to={newEncounterPath({
                      customerId: current.customerId,
                      patientName: current.patientName,
                      appointmentId: current.appointmentId,
                    })}
                  >
                    <StethoscopeIcon />
                    Ghi lần khám
                  </Link>
                </Button>
              )}
              <Button size="sm" variant={canExamine ? "outline" : "default"} disabled={anyBusy} onClick={() => onAction("finish")}>
                <CheckIcon />
                {busy("finish") ? "Đang lưu…" : "Khám xong"}
              </Button>
              <Button size="sm" variant="outline" disabled={anyBusy} onClick={() => onAction("pass-over")}>
                <SkipForwardIcon />
                Vắng · gọi người sau
              </Button>
              <Button size="sm" variant="ghost" disabled={anyBusy} onClick={() => onAction("no-show")}>
                <UserXIcon />
                Không đến
              </Button>
            </>
          )}
          {!current && room.status === "available" && room.doctor && room.waiting.length > 0 && (
            <Button size="sm" disabled={anyBusy} onClick={() => onAction("call-next")}>
              <PhoneCallIcon />
              {busy("call-next") ? "Đang gọi…" : "Gọi người tiếp theo"}
            </Button>
          )}
          {room.status === "paused" ? (
            <Button size="sm" variant="outline" disabled={anyBusy} onClick={() => onAction("resume")}>
              <PlayIcon />
              Mở lại phòng
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={anyBusy} onClick={() => onAction("pause")}>
              <PauseIcon />
              Tạm ngưng
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Đang chờ ({room.waiting.length})</span>
        <WaitingList visits={room.waiting} />
      </div>
    </Card>
  );
}

function WaitingList({ visits }: { visits: BoardVisit[] }) {
  if (visits.length === 0) {
    return <span className="text-muted-foreground text-sm">Không có ai.</span>;
  }
  return (
    <ol className="flex flex-col gap-1">
      {visits.map((visit) => (
        <li key={visit.appointmentId} className="flex items-center gap-3 text-sm">
          <span className="w-7 font-semibold tabular-nums">{formatQueueNumber(visit.queueNumber)}</span>
          <span className="min-w-0 flex-1 truncate">{visit.patientName}</span>
          {visit.passedOver ? (
            <span className="text-warning-text text-xs">Đã gọi, vắng</span>
          ) : (
            <span className="text-muted-foreground text-xs tabular-nums">{clockTime(visit.checkedInAt)}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
