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
export function MyExamQueue({ mode = "waiting" }: { mode?: "waiting" | "active" }) {
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
  const returnedToDoctor = [
    ...rooms.flatMap((room) => room.waiting.filter((visit) => visit.returned)),
    ...withoutRoom.flatMap((queue) => queue.waiting.filter((visit) => visit.returned)),
  ];
  const waitingForFirstCall = (visits: BoardVisit[]) => visits.filter((visit) => !visit.returned);
  const activeCount = rooms.reduce((count, room) => count + (room.current ? 1 : 0) + (room.away?.length ?? 0), 0)
    + withoutRoom.reduce((count, queue) => count + (queue.away?.length ?? 0), 0)
    + returnedToDoctor.length;

  // The question was about whoever was inside when it was asked.
  const liveOccupant = asking ? rooms.find((r) => r.id === asking.room.id)?.current?.appointmentId : undefined;
  const stale = asking !== null && liveOccupant !== asking.room.current?.appointmentId;
  useEffect(() => {
    if (stale) setAsking(null);
  }, [stale]);

  return (
    <ListView>
      <ListViewHeader
        title={mode === "waiting" ? "Hàng chờ khám của tôi" : "Đang khám"}
        canCreate={false}
        description={mode === "waiting"
          ? "Bệnh nhân đã được tiếp nhận và đang chờ bạn gọi vào khám. Bảng tự cập nhật."
          : "Bệnh nhân đang khám, đang làm chỉ định hoặc đã quay lại sau chỉ định và chờ khám tiếp. Bảng tự cập nhật."}
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

      {mode === "waiting" ? (
        <div className="flex flex-col gap-4">
          {rooms.filter((room) => waitingForFirstCall(room.waiting).length > 0 || !room.current).map((room) => (
            <MyRoom key={room.id} room={room} view="waiting"
              sharedWaiting={shared.filter((v) => !v.department || !room.department || v.department === room.department).length}
              canOperate={canOperate?.can ?? false} pending={pending}
              onAction={(action) => action === "finish" || action === "pass-over" || action === "no-show"
                ? setAsking({ room, action }) : act(room, action)} />
          ))}
          {withoutRoom.map((queue) => (
            <Card key={queue.doctor.id} className="flex flex-col gap-3 p-5">
              <h3 className="font-semibold">Đang chờ bạn nhưng chưa có phòng ({waitingForFirstCall(queue.waiting).length})</h3>
              <p className="text-muted-foreground text-sm">Bạn chưa có buổi làm việc xếp phòng vào lúc này, nên người chờ chưa được gọi vào.</p>
              <WaitingList visits={waitingForFirstCall(queue.waiting)} />
            </Card>
          ))}
          {unpaid.length > 0 && <Card className="flex flex-col gap-3 p-5">
            <h3 className="font-semibold">Chờ thanh toán phí khám ({unpaid.length})</h3>
            <p className="text-muted-foreground text-sm">Vào hàng chờ của bạn sau khi trả phí khám ở quầy.</p>
            <WaitingList visits={unpaid.map(({ visit }) => visit)} />
          </Card>}
          {shared.length > 0 && <Card className="flex flex-col gap-2 p-5" data-testid="my-queue-shared">
            <h3 className="font-semibold">Hàng chờ chung của phòng khám ({shared.length})</h3>
            <p className="text-muted-foreground text-sm">Chưa có bác sĩ: phòng nào trống sẽ tự gọi người đầu hàng, có thể là phòng của bạn.</p>
            <SharedLine visits={shared} />
          </Card>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rooms.filter((room) => room.current || (room.away?.length ?? 0) > 0).map((room) => (
            <MyRoom key={room.id} room={room} view="active" sharedWaiting={0}
              canOperate={canOperate?.can ?? false} pending={pending}
              onAction={(action) => action === "finish" || action === "pass-over" || action === "no-show"
                ? setAsking({ room, action }) : act(room, action)} />
          ))}
          {withoutRoom.filter((queue) => (queue.away?.length ?? 0) > 0).map((queue) => (
            <Card key={queue.doctor.id} className="flex flex-col gap-3 p-5">
              <h3 className="font-semibold">Đang làm chỉ định · {queue.doctor.fullName}</h3>
              <AwayList visits={queue.away ?? []} />
            </Card>
          ))}
          {returnedToDoctor.length > 0 && <Card className="flex flex-col gap-3 p-5">
            <h3 className="font-semibold">Đã xong chỉ định · chờ khám tiếp ({returnedToDoctor.length})</h3>
            <p className="text-muted-foreground text-sm">Các bệnh nhân này đã quay lại hàng chờ của bạn; lần khám vẫn đang mở.</p>
            <WaitingList visits={returnedToDoctor} />
          </Card>}
          {activeCount === 0 && <Card className="p-5 text-sm text-muted-foreground">Hiện không có bệnh nhân nào đang khám hoặc đi làm chỉ định.</Card>}
        </div>
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
  view,
  sharedWaiting,
  canOperate,
  pending,
  onAction,
}: {
  room: Room;
  view: "waiting" | "active";
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

      {view === "active" && current ? (
        <CurrentPatient visit={current} />
      ) : (
        <div className="bg-muted/40 text-muted-foreground flex min-h-24 items-center rounded-lg px-4 py-3 text-sm">
          {view === "waiting" && current
            ? "Bệnh nhân đang khám được hiển thị trong tab Đang khám / làm chỉ định."
            : room.status === "paused"
            ? "Phòng đang tạm ngưng."
            : !anyoneWaiting
              ? "Chưa có ai chờ bạn."
              : "Phòng trống, đang gọi người kế tiếp…"}
        </div>
      )}

      {canOperate && (
        <div className="flex flex-wrap gap-2">
          {view === "active" && current && (
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
          {view === "waiting" && !current && room.status === "available" && anyoneWaiting && (
            <Button size="sm" disabled={busy} onClick={() => onAction("call-next")}>
              <PhoneCallIcon />
              {pending === "call-next" ? "Đang gọi…" : "Gọi người tiếp theo"}
            </Button>
          )}
          {view === "waiting" && (room.status === "paused" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("resume")}>
              <PlayIcon />
              Mở lại phòng
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction("pause")}>
              <PauseIcon />
              Tạm ngưng
            </Button>
          ))}
        </div>
      )}

      {view === "waiting" && <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Đang chờ ({room.waiting.filter((visit) => !visit.returned).length})</span>
        <WaitingList visits={room.waiting.filter((visit) => !visit.returned)} />
      </div>}
      {view === "active" && <AwayList visits={room.away ?? []} />}
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
  // The patient's record — results by tab, the conclusion — is where the doctor works,
  // for a patient they follow and a new one they examine alike; not the visit's page.
  const { data: canSeeCaseload } = useCan({ resource: "my_patients", action: "list" });
  const followed = canSeeCaseload?.can ?? false;

  return (
    <div className="bg-primary/5 border-primary/30 flex flex-wrap items-center gap-4 rounded-lg border px-4 py-3">
      <span className="text-primary text-4xl font-bold tabular-nums">{formatQueueNumber(visit.queueNumber)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{visit.patientName}</p>
          <Badge variant="default">Đang khám trong phòng</Badge>
        </div>
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
          <Link to={followed ? `/my-patients/show/${visit.customerId}` : `/clinical-encounters/show/${encounter.id}`}>
            <FileTextIcon />
            {followed ? "Mở hồ sơ bệnh nhân" : "Mở lần khám"}
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
