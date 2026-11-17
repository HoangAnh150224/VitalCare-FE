import { useEffect, useRef, useState } from "react";
import { useCan, useCustomMutation, useList, useNotification, type HttpError } from "@refinedev/core";
import { DoorOpenIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { WEEKDAY_LABELS } from "@/domains/clinic/types";
import type { ExamRoom } from "@/domains/exam-room/types";
import type { DoctorAvailability, WorkingHoursEntry } from "@/domains/schedule/types";

type Row = WorkingHoursEntry & { key: number };

let nextKey = 1;
const withKey = (entry: WorkingHoursEntry): Row => ({ ...entry, key: nextKey++ });

const byDayThenTime = (a: WorkingHoursEntry, b: WorkingHoursEntry) =>
  a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime);

/** `HH:mm:ss` → `HH:mm`, which is what a time input holds. */
const hhmm = (value: string) => value.slice(0, 5);

/** No room set for the session; a Select item cannot have an empty value. */
const NO_ROOM = "none";

/** The API's room clash, said for people: "Room P101 is taken by BS. X from 13:00 to 17:00 on that day". */
const roomClash = (message: string) => {
  const match = /^Room (\S+) is taken by (.+) from (\S+) to (\S+)/.exec(message);
  return match
    ? `Phòng ${match[1]} đã có ${match[2]} từ ${hhmm(match[3])} đến ${hhmm(match[4])} trong ngày đó.`
    : null;
};

/** How many patients a session holds: whole visits only. */
const visitsIn = (row: WorkingHoursEntry) => {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const length = minutes(row.endTime) - minutes(row.startTime);
  return row.visitMinutes > 0 && length > 0 ? Math.floor(length / row.visitMinutes) : 0;
};

/**
 * A doctor's week, repeating: one row per session, so a lunch break is two
 * rows on one day and a day off is a day with none.
 *
 * Saved as a whole (`PUT /doctors/{id}/working-hours`) rather than row by row:
 * the rule — no overlapping sessions on a day — is about the week. The
 * sessions decide how many queue numbers a day gives out; visits already
 * registered keep their number.
 *
 * `editable` is the caller's to work out: the permission, and that the doctor
 * is theirs to manage.
 */
export function WorkingHoursEditor({
  doctor,
  editable,
  onSaved,
}: {
  doctor: DoctorAvailability;
  editable: boolean;
  onSaved: () => void;
}) {
  const { open } = useNotification();
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirtyState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read by the effect below without being one of its triggers: a refetch
  // arriving mid-edit must not wipe what is being typed.
  const dirtyRef = useRef(false);
  const setDirty = (value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  };

  const loaded = doctor.workingHours;
  useEffect(() => {
    if (!dirtyRef.current) {
      setRows([...loaded].sort(byDayThenTime).map(withKey));
    }
  }, [loaded]);

  const { mutate, mutation } = useCustomMutation<WorkingHoursEntry[]>();

  // The rooms a session can name: the caller's clinic's, which is the doctor's
  // (another clinic's doctor is not manageable here).
  const { data: canSeeRooms } = useCan({ resource: "exam_rooms", action: "list" });
  const { result: roomList } = useList<ExamRoom>({
    resource: "exam_rooms",
    pagination: { mode: "off" },
    queryOptions: { enabled: canSeeRooms?.can ?? false },
  });
  const rooms = roomList?.data ?? [];
  const showRooms = rooms.length > 0 || rows.some((row) => row.examRoomId != null);

  const update = (key: number, patch: Partial<WorkingHoursEntry>) => {
    setDirty(true);
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const remove = (key: number) => {
    setDirty(true);
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const add = () => {
    setDirty(true);
    setRows((current) => [
      ...current,
      withKey({ dayOfWeek: 1, startTime: "08:00", endTime: "12:00", visitMinutes: 30 }),
    ]);
  };

  /** Monday to Friday, morning and afternoon, half an hour a patient — the usual week, to adjust from. */
  const fillUsualWeek = () => {
    setDirty(true);
    setRows(
      [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
        withKey({ dayOfWeek, startTime: "08:00", endTime: "12:00", visitMinutes: 30 }),
        withKey({ dayOfWeek, startTime: "13:00", endTime: "17:00", visitMinutes: 30 }),
      ])
    );
  };

  const save = () => {
    setError(null);
    mutate(
      {
        url: `${API_URL}/doctors/${doctor.id}/working-hours`,
        method: "put",
        values: {
          sessions: rows.map((row) => ({
            dayOfWeek: row.dayOfWeek,
            startTime: hhmm(row.startTime),
            endTime: hhmm(row.endTime),
            visitMinutes: row.visitMinutes,
            examRoomId: row.examRoomId ?? null,
          })),
        },
        // See ResetPasswordCard: without it Spring answers 415.
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          // The saved week as the server now holds it, straight from the answer.
          if (Array.isArray(data)) {
            setRows([...data].sort(byDayThenTime).map(withKey));
          }
          setDirty(false);
          onSaved();
          open?.({
            type: "success",
            message: "Đã lưu giờ làm việc",
            description: "Áp dụng cho các lượt đăng ký mới. Lượt đã đăng ký giữ nguyên số khám.",
          });
        },
        onError: (failure: HttpError) => {
          const message = failure.errors?.sessions ?? failure.message;
          const clash = typeof message === "string" ? roomClash(message) : null;
          setError(
            clash
              ? clash
              : typeof message === "string" && message.includes("clinic's rooms")
                ? "Chọn một phòng của cơ sở này."
                : typeof message === "string" && message.includes("overlap")
              ? "Hai buổi trong cùng một ngày đang chồng giờ nhau."
              : typeof message === "string" && message.includes("end after")
                ? "Giờ kết thúc phải sau giờ bắt đầu."
                : "Không lưu được giờ làm việc. Kiểm tra lại các dòng."
          );
        },
      }
    );
  };

  if (!editable) return <WeekView doctor={doctor} sessions={rows} rooms={rooms} />;

  const columns = showRooms
    ? "md:grid-cols-[minmax(10rem,1.2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_6rem_minmax(12rem,1.4fr)_2.5rem]"
    : "md:grid-cols-[minmax(10rem,1.2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_6rem_2.5rem]";

  return (
    <DetailPanel
      title={`Giờ làm việc — ${doctor.fullName}`}
      action={
        editable ? (
          <div className="flex gap-2">
            {rows.length === 0 && (
              <Button size="sm" variant="outline" onClick={fillUsualWeek}>
                Thứ Hai – Thứ Sáu
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={add}>
              <PlusIcon />
              Thêm buổi
            </Button>
          </div>
        ) : undefined
      }
      bodyClassName="p-4"
    >
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Lặp lại hằng tuần. Số lượt khám mỗi buổi tính từ thời lượng mỗi lượt
          {showRooms ? "; phòng khám là nơi bác sĩ ngồi trong buổi đó, người đã tiếp nhận được gọi vào phòng này." : "."}
        </p>
        <div className="overflow-x-auto pb-2">
        <div className={`flex flex-col gap-4 ${showRooms ? "md:min-w-[72rem]" : "md:min-w-[58rem]"}`}>
        <div className={`text-muted-foreground hidden gap-4 text-xs font-medium md:grid ${columns}`}>
          <span>Thứ</span>
          <span>Giờ bắt đầu</span>
          <span>Giờ kết thúc</span>
          <span>Phút mỗi lượt</span>
          <span>Số lượt</span>
          {showRooms && <span>Phòng khám</span>}
          <span />
        </div>

        {rows.map((row) => (
          <div
            key={row.key}
            className={`grid grid-cols-2 gap-4 md:items-center ${columns}`}
          >
            <Select
              disabled={!editable}
              value={String(row.dayOfWeek)}
              onValueChange={(value) => update(row.key, { dayOfWeek: Number(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_LABELS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              aria-label="Giờ bắt đầu"
              disabled={!editable}
              value={hhmm(row.startTime)}
              onChange={(e) => update(row.key, { startTime: e.target.value })}
            />
            <Input
              type="time"
              aria-label="Giờ kết thúc"
              disabled={!editable}
              value={hhmm(row.endTime)}
              onChange={(e) => update(row.key, { endTime: e.target.value })}
            />
            <Input
              type="number"
              aria-label="Phút mỗi lượt khám"
              min={5}
              max={240}
              step={5}
              disabled={!editable}
              value={row.visitMinutes}
              onChange={(e) => update(row.key, { visitMinutes: Number(e.target.value) })}
            />
            <span className="text-muted-foreground text-sm tabular-nums">{visitsIn(row)} lượt</span>
            {showRooms && (
              <Select
                disabled={!editable}
                value={row.examRoomId != null ? String(row.examRoomId) : NO_ROOM}
                onValueChange={(value) => update(row.key, { examRoomId: value === NO_ROOM ? null : Number(value) })}
              >
                <SelectTrigger className="w-full" aria-label="Phòng khám">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ROOM}>Chưa xếp phòng</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.code}
                      {room.name ? ` · ${room.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {editable && (
              <Button size="icon-sm" variant="ghost" aria-label="Xoá buổi" onClick={() => remove(row.key)}>
                <Trash2Icon />
              </Button>
            )}
          </div>
        ))}
        </div>
        </div>

        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Chưa có buổi làm việc nào — bác sĩ này chưa nhận đăng ký khám ngày nào.
          </p>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {editable && (
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : "Lưu giờ làm việc"}
            </Button>
            {dirty && <span className="text-muted-foreground text-sm">Thay đổi chưa lưu.</span>}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

/**
 * The week as somebody who cannot change it reads it (the front desk, a
 * doctor looking at a colleague): a day per row, its sessions side by side,
 * and a day without any said to be off — not a form of locked inputs.
 */
function WeekView({
  doctor,
  sessions,
  rooms,
}: {
  doctor: DoctorAvailability;
  sessions: WorkingHoursEntry[];
  rooms: ExamRoom[];
}) {
  const roomOf = (id: number | null | undefined) => {
    if (id == null) return null;
    const room = rooms.find((candidate) => candidate.id === id);
    return room ? room.code + (room.name ? " · " + room.name : "") : "Phòng #" + id;
  };
  const visits = sessions.reduce((sum, session) => sum + visitsIn(session), 0);
  const days = new Set(sessions.map((session) => session.dayOfWeek)).size;

  return (
    <DetailPanel title={`Lịch làm việc hằng tuần — ${doctor.fullName}`} bodyClassName="p-0">
      <div className="flex flex-wrap gap-x-8 gap-y-2 border-b px-4 py-3 text-sm" data-testid="week-summary">
        <span>
          <span className="text-muted-foreground">Chuyên khoa: </span>
          <span className="font-medium">{doctor.specialty || "—"}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Làm việc: </span>
          <span className="font-medium tabular-nums">{days} ngày · {sessions.length} buổi / tuần</span>
        </span>
        <span>
          <span className="text-muted-foreground">Tối đa: </span>
          <span className="font-medium tabular-nums">{visits} lượt khám / tuần</span>
        </span>
      </div>
      <ul className="divide-y">
        {WEEKDAY_LABELS.map((label, index) => {
          const today = sessions.filter((session) => session.dayOfWeek === index + 1);
          return (
            <li key={label} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
              <span className={`w-24 shrink-0 font-semibold ${today.length ? "" : "text-muted-foreground"}`}>{label}</span>
              {today.length === 0 ? (
                <Badge variant="secondary">Nghỉ</Badge>
              ) : (
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  {today.map((session, at) => {
                    const room = roomOf(session.examRoomId);
                    return (
                      <div key={at} className="bg-muted/40 flex flex-col gap-1 rounded-lg border px-3 py-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-base font-semibold tabular-nums">
                            {hhmm(session.startTime)} – {hhmm(session.endTime)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {Number(session.startTime.slice(0, 2)) < 12 ? "Buổi sáng" : "Buổi chiều"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="tabular-nums">{visitsIn(session)} lượt · {session.visitMinutes} phút/lượt</span>
                          <span className={`inline-flex items-center gap-1 ${room ? "" : "text-muted-foreground"}`}>
                            <DoorOpenIcon className="size-3.5" />
                            {room ?? "Chưa xếp phòng"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </DetailPanel>
  );
}
