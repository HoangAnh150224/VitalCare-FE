import { useEffect, useState } from "react";
import { useCan, useCustom, useCustomMutation, useInvalidate, useList } from "@refinedev/core";
import {
  CheckIcon,
  DoorOpenIcon,
  FileTextIcon,
  PauseIcon,
  PhoneCallIcon,
  PlayIcon,
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
import { ENCOUNTER_STATUS_LABELS, newEncounterPath, type Encounter } from "@/domains/encounter/types";
import { EXAM_ROOM_STATUS_LABELS, type BoardVisit, type RoomBoard } from "@/domains/exam-room/types";
import { ENCOUNTER_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { AwayList, ConfirmDecision, WaitingList, type Decision, type Room, type RoomAction } from "./board";

/** `HH:mm` of an instant, on the clinic's (the browser's) clock. */
const clockTime = (value: string | null) =>
  value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * A doctor's own queue: the room their session puts them in now, the patient
 * inside, and who waits for them. "Bắt đầu khám" opens the visit's encounter
 * from the checked-in booking, so its result reaches the patient; a patient
 * back from their services finds the encounter already open.
 *
 * Who is called in is still the server's dispatcher; the buttons are for what
 * only the doctor knows. Kept current like the clinic's board: a push on
 * `/topic/exam_rooms/{clinicId}`, a slow poll behind it.
 */
export function MyExamQueue() {
  const { result, query } = useCustom<RoomBoard>({
    url: `${API_URL}/exam_rooms/mine`,
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
  const invalidate = useInvalidate();
  const { mutate } = useCustomMutation<RoomBoard>();
  const [pending, setPending] = useState<RoomAction | null>(null);
  const [asking, setAsking] = useState<{ room: Room; action: Decision } | null>(null);

  const act = (room: Room, action: RoomAction) => {
    setPending(action);
    mutate(
      {
        url: `${API_URL}/exam_rooms/${room.id}/${action}`,
        method: "post",
        values: {},
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSettled: () => {
          setPending(null);
          void query.refetch();
          invalidate({ resource: "appointments", invalidates: ["list"] });
        },
      }
    );
  };

  const rooms = board?.rooms ?? [];
  const withoutRoom = board?.withoutRoom ?? [];
  const unpaid = board?.awaitingPayment ?? [];
  const shared = board?.sharedQueue ?? [];

  // The question was about whoever was inside when it was asked.
  const liveOccupant = asking ? rooms.find((r) => r.id === asking.room.id)?.current?.appointmentId : undefined;
  const stale = asking !== null && liveOccupant !== asking.room.current?.appointmentId;
  useEffect(() => {
    if (stale) setAsking(null);
  }, [stale]);

  return (
    <ListView>
      <ListViewHeader
        title="Hàng chờ khám của tôi"
        canCreate={false}
        description="Bệnh nhân đã đặt lịch, được tiếp nhận và trả phí khám, đang chờ hoặc đang ở phòng của bạn. Bảng tự cập nhật."
      />

      {board && (
        <p className="text-muted-foreground text-sm">Cập nhật lúc {clockTime(board.at)}</p>
      )}

      {board && rooms.length === 0 && (
        <Card className="flex flex-col gap-1 p-5">
          <p className="font-medium">Bạn không có ca làm việc có phòng vào lúc này.</p>
          <p className="text-muted-foreground text-sm">
            Bệnh nhân chỉ được gọi vào khi bạn đang trong ca và có phòng. Xem ca của bạn trong Lịch bác sĩ.
          </p>
        </Card>
      )}

      {rooms.map((room) => (
        <MyRoom
          key={room.id}
          room={room}
          // The shared line is called into a free room of its department too.
          sharedWaiting={shared.filter((v) => !v.department || !room.department || v.department === room.department).length}
          canOperate={canOperate?.can ?? false}
          pending={pending}
          onAction={(action) =>
            action === "finish" || action === "pass-over" || action === "no-show"
              ? setAsking({ room, action })
              : act(room, action)
          }
        />
      ))}

      {withoutRoom.map((queue) => (
        <Card key={queue.doctor.id} className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="font-semibold">Đang chờ bạn nhưng chưa có phòng ({queue.waiting.length})</h3>
            <p className="text-muted-foreground text-sm">
              Bạn chưa có buổi làm việc xếp phòng vào lúc này, nên người chờ chưa được gọi vào.
            </p>
          </div>
          <WaitingList visits={queue.waiting} />
          <AwayList visits={queue.away ?? []} />
        </Card>
      ))}

      {unpaid.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="font-semibold">Chờ thanh toán phí khám ({unpaid.length})</h3>
            <p className="text-muted-foreground text-sm">Vào hàng chờ của bạn sau khi trả phí khám ở quầy.</p>
          </div>
          <WaitingList visits={unpaid.map(({ visit }) => visit)} />
        </Card>
      )}

      {shared.length > 0 && (
        <Card className="flex flex-col gap-2 p-5" data-testid="my-queue-shared">
          <h3 className="font-semibold">Hàng chờ chung của phòng khám ({shared.length})</h3>
          <p className="text-muted-foreground text-sm">
            Chưa có bác sĩ: phòng nào trống sẽ tự gọi người đầu hàng, có thể là phòng của bạn.
          </p>
          <SharedLine visits={shared} />
        </Card>
      )}

      <ConfirmDecision
        asking={asking}
        onClose={() => setAsking(null)}
        onConfirm={() => {
          if (asking && !stale) act(asking.room, asking.action);
          setAsking(null);
        }}
      />
    </ListView>
  );
}

function SharedLine({ visits }: { visits: BoardVisit[] }) {
  return (
    <ol className="flex flex-col gap-1">
      {visits.map((visit, index) => (
        <li key={visit.appointmentId} className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground w-5 text-xs tabular-nums">{index + 1}.</span>
          <span className="w-7 font-semibold tabular-nums">{formatQueueNumber(visit.queueNumber)}</span>
          <span className="min-w-0 flex-1 truncate">{visit.patientName}</span>
          {visit.department && <Badge variant="outline">{visit.department}</Badge>}
        </li>
      ))}
    </ol>
  );
}

/** The doctor's room now: who is inside, how to start or reopen their visit, and who is next. */
function MyRoom({
  room,
  sharedWaiting,
  canOperate,
  pending,
  onAction,
}: {
  room: Room;
  sharedWaiting: number;
  canOperate: boolean;
  pending: RoomAction | null;
  onAction: (action: RoomAction) => void;
}) {
  const current = room.current;
  const anyoneWaiting = room.waiting.length + sharedWaiting > 0;
  const busy = pending !== null;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <DoorOpenIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="font-semibold">{room.code}</span>
          {room.name && <span className="text-muted-foreground truncate text-sm">· {room.name}</span>}
          {room.department && <Badge variant="outline">{room.department}</Badge>}
        </div>
        <Badge variant={room.status === "occupied" ? "default" : room.status === "paused" ? "neutral" : "success"}>
          {EXAM_ROOM_STATUS_LABELS[room.status]}
        </Badge>
      </div>

      {current ? (
        <CurrentPatient visit={current} />
      ) : (
        <div className="bg-muted/40 text-muted-foreground flex min-h-24 items-center rounded-lg px-4 py-3 text-sm">
          {room.status === "paused"
            ? "Phòng đang tạm ngưng."
            : !anyoneWaiting
              ? "Chưa có ai chờ bạn."
              : "Phòng trống, đang gọi người kế tiếp…"}
        </div>
      )}

      {canOperate && (
        <div className="flex flex-wrap gap-2">
          {current && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("finish")}>
                <CheckIcon />
                {pending === "finish" ? "Đang lưu…" : "Khám xong"}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("pass-over")}>
                <SkipForwardIcon />
                Vắng · gọi người sau
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction("no-show")}>
                <UserXIcon />
                Không đến
              </Button>
            </>
          )}
          {!current && room.status === "available" && anyoneWaiting && (
            <Button size="sm" disabled={busy} onClick={() => onAction("call-next")}>
              <PhoneCallIcon />
              {pending === "call-next" ? "Đang gọi…" : "Gọi người tiếp theo"}
            </Button>
          )}
          {room.status === "paused" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("resume")}>
              <PlayIcon />
              Mở lại phòng
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction("pause")}>
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
      <AwayList visits={room.away ?? []} />
    </Card>
  );
}

/**
 * The patient in the room. Their visit has at most one encounter: started
 * from here the first time, reopened from here when they come back with the
 * results of their services.
 */
function CurrentPatient({ visit }: { visit: BoardVisit }) {
  const { data: canCreate } = useCan({ resource: "clinical_encounters", action: "create" });
  const { result, query } = useList<Encounter>({
    resource: "clinical_encounters",
    filters: [{ field: "appointmentId", operator: "eq", value: visit.appointmentId }],
    pagination: { currentPage: 1, pageSize: 1 },
    errorNotification: false,
    queryOptions: { retry: false },
  });
  const encounter = result?.data?.[0];

  return (
    <div className="bg-primary/5 border-primary/30 flex flex-wrap items-center gap-4 rounded-lg border px-4 py-3">
      <span className="text-primary text-4xl font-bold tabular-nums">{formatQueueNumber(visit.queueNumber)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{visit.patientName}</p>
        <p className="text-muted-foreground text-sm">
          {visit.customerCode ? `${visit.customerCode} · ` : ""}Vào phòng lúc {clockTime(visit.calledAt)}
          {visit.returned ? " · quay lại đọc kết quả" : ""}
        </p>
        {encounter && (
          <Badge variant={ENCOUNTER_STATUS_VARIANTS[encounter.status] ?? "secondary"} className="mt-1">
            Lần khám {ENCOUNTER_STATUS_LABELS[encounter.status].toLowerCase()}
          </Badge>
        )}
      </div>
      {query.isLoading ? null : encounter ? (
        <Button asChild>
          <Link to={`/clinical-encounters/show/${encounter.id}`}>
            <FileTextIcon />
            Mở lần khám
          </Link>
        </Button>
      ) : (
        canCreate?.can && (
          <Button asChild>
            <Link
              to={newEncounterPath({
                customerId: visit.customerId,
                patientName: visit.patientName,
                appointmentId: visit.appointmentId,
              })}
            >
              <StethoscopeIcon />
              Bắt đầu khám
            </Link>
          </Button>
        )
      )}
    </div>
  );
}
