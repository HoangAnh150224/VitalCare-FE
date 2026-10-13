import { useEffect, useRef, useState } from "react";
import { useCustomMutation, useNotification, type HttpError } from "@refinedev/core";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
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
import type { DoctorAvailability, WorkingHoursEntry } from "@/domains/schedule/types";

type Row = WorkingHoursEntry & { key: number };

let nextKey = 1;
const withKey = (entry: WorkingHoursEntry): Row => ({ ...entry, key: nextKey++ });

const byDayThenTime = (a: WorkingHoursEntry, b: WorkingHoursEntry) =>
  a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime);

/** `HH:mm:ss` → `HH:mm`, which is what a time input holds. */
const hhmm = (value: string) => value.slice(0, 5);

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
          setError(
            typeof message === "string" && message.includes("overlap")
              ? "Hai buổi trong cùng một ngày đang chồng giờ nhau."
              : typeof message === "string" && message.includes("end after")
                ? "Giờ kết thúc phải sau giờ bắt đầu."
                : "Không lưu được giờ làm việc. Kiểm tra lại các dòng."
          );
        },
      }
    );
  };

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
        <p className="text-muted-foreground text-sm">Lặp lại hằng tuần. Số lượt khám mỗi buổi tính từ thời lượng mỗi lượt.</p>
        <div className="text-muted-foreground hidden grid-cols-[9rem_6.5rem_6.5rem_7rem_6rem_2.5rem] gap-2 text-xs font-medium md:grid">
          <span>Thứ</span>
          <span>Giờ bắt đầu</span>
          <span>Giờ kết thúc</span>
          <span>Phút mỗi lượt</span>
          <span>Số lượt</span>
          <span />
        </div>

        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-2 gap-2 md:grid-cols-[9rem_6.5rem_6.5rem_7rem_6rem_2.5rem] md:items-center"
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
            {editable && (
              <Button size="icon-sm" variant="ghost" aria-label="Xoá buổi" onClick={() => remove(row.key)}>
                <Trash2Icon />
              </Button>
            )}
          </div>
        ))}

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
