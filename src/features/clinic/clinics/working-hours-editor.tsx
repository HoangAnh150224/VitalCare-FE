import { useEffect, useRef, useState } from "react";
import {
  useCan,
  useCustom,
  useCustomMutation,
  useInvalidate,
  useNotification,
  type HttpError,
} from "@refinedev/core";
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
import type { WorkingHoursEntry } from "@/domains/clinic/types";
import { WEEKDAY_LABELS } from "@/domains/clinic/types";

type Row = WorkingHoursEntry & { key: number };

let nextKey = 1;
const withKey = (entry: WorkingHoursEntry): Row => ({ ...entry, key: nextKey++ });

const byDayThenTime = (a: WorkingHoursEntry, b: WorkingHoursEntry) =>
  a.dayOfWeek - b.dayOfWeek || a.openTime.localeCompare(b.openTime);

/** `HH:mm:ss` → `HH:mm`, which is what a time input holds. */
const hhmm = (value: string) => value.slice(0, 5);

/**
 * A clinic's week: one row per session, so a lunch break is two rows on one
 * day and a closed day is a day with none.
 *
 * Saved as a whole (`PUT /clinics/{id}/working-hours`) rather than row by row:
 * the rules — no overlapping sessions on a day — are about the week, not about
 * any one row. Appointments already booked keep their times; only new bookings
 * see the new slots.
 *
 * Read-only for anybody without `clinics:write`.
 */
export function WorkingHoursEditor({ clinicId }: { clinicId: string }) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { data: access } = useCan({ resource: "clinics", action: "edit" });
  const editable = access?.can ?? false;

  const { result, query } = useCustom<WorkingHoursEntry[]>({
    url: `${API_URL}/clinics/${clinicId}/working-hours`,
    method: "get",
    queryOptions: { enabled: Boolean(clinicId) },
  });
  const loaded = Array.isArray(result?.data) ? result.data : undefined;

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirtyState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read by the effect below without being one of its triggers: a refetch
  // arriving mid-edit must not wipe what is being typed, and clearing the flag
  // after a save must not bring back the week loaded before the edit.
  const dirtyRef = useRef(false);
  const setDirty = (value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  };

  useEffect(() => {
    if (loaded && !dirtyRef.current) {
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
      withKey({ dayOfWeek: 1, openTime: "08:00", closeTime: "11:00", slotMinutes: 30, capacityPerSlot: 3 }),
    ]);
  };

  const save = () => {
    setError(null);
    mutate(
      {
        url: `${API_URL}/clinics/${clinicId}/working-hours`,
        method: "put",
        values: {
          sessions: rows.map((row) => ({
            dayOfWeek: row.dayOfWeek,
            openTime: hhmm(row.openTime),
            closeTime: hhmm(row.closeTime),
            slotMinutes: row.slotMinutes,
            capacityPerSlot: row.capacityPerSlot,
          })),
        },
        // See ResetPasswordCard: without it Spring answers 415.
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          // The saved week as the server now holds it, straight from the
          // answer — not the copy loaded before the edit, which is what the
          // screen would fall back to until a refetch arrived.
          if (Array.isArray(data)) {
            setRows([...data].sort(byDayThenTime).map(withKey));
          }
          setDirty(false);
          invalidate({ resource: "clinics", invalidates: ["all"] });
          void query.refetch();
          open?.({
            type: "success",
            message: "Đã lưu giờ làm việc",
            description: "Áp dụng cho các lượt đặt lịch mới. Lịch đã đặt giữ nguyên giờ.",
          });
        },
        onError: (failure: HttpError) => {
          const message = failure.errors?.sessions ?? failure.message;
          setError(
            typeof message === "string" && message.includes("overlap")
              ? "Hai buổi trong cùng một ngày đang chồng giờ nhau."
              : typeof message === "string" && message.includes("close after")
                ? "Giờ đóng cửa phải sau giờ mở cửa."
                : "Không lưu được giờ làm việc. Kiểm tra lại các dòng."
          );
        },
      }
    );
  };

  return (
    <DetailPanel
      title="Giờ làm việc"
      action={
        editable ? (
          <Button size="sm" variant="outline" onClick={add}>
            <PlusIcon />
            Thêm buổi
          </Button>
        ) : undefined
      }
      bodyClassName="p-4"
    >
      <div className="flex flex-col gap-3">
        <div className="text-muted-foreground hidden grid-cols-[9rem_6.5rem_6.5rem_6rem_6rem_2.5rem] gap-2 text-xs font-medium md:grid">
          <span>Thứ</span>
          <span>Mở cửa</span>
          <span>Đóng cửa</span>
          <span>Phút/khung</span>
          <span>Chỗ/khung</span>
          <span />
        </div>

        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-2 gap-2 md:grid-cols-[9rem_6.5rem_6.5rem_6rem_6rem_2.5rem] md:items-center"
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
              aria-label="Giờ mở cửa"
              disabled={!editable}
              value={hhmm(row.openTime)}
              onChange={(e) => update(row.key, { openTime: e.target.value })}
            />
            <Input
              type="time"
              aria-label="Giờ đóng cửa"
              disabled={!editable}
              value={hhmm(row.closeTime)}
              onChange={(e) => update(row.key, { closeTime: e.target.value })}
            />
            <Input
              type="number"
              aria-label="Phút mỗi khung"
              min={5}
              max={240}
              step={5}
              disabled={!editable}
              value={row.slotMinutes}
              onChange={(e) => update(row.key, { slotMinutes: Number(e.target.value) })}
            />
            <Input
              type="number"
              aria-label="Số chỗ mỗi khung"
              min={1}
              max={100}
              disabled={!editable}
              value={row.capacityPerSlot}
              onChange={(e) => update(row.key, { capacityPerSlot: Number(e.target.value) })}
            />
            {editable && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Xoá buổi"
                onClick={() => remove(row.key)}
              >
                <Trash2Icon />
              </Button>
            )}
          </div>
        ))}

        {rows.length === 0 && !query.isLoading && (
          <p className="text-muted-foreground text-sm">
            Chưa có buổi làm việc nào — phòng khám sẽ không nhận đặt lịch ngày nào.
          </p>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {editable && (
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : "Lưu giờ làm việc"}
            </Button>
            {dirty && (
              <span className="text-muted-foreground text-sm">
                Thay đổi chưa lưu. Lịch đã đặt giữ nguyên giờ.
              </span>
            )}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
