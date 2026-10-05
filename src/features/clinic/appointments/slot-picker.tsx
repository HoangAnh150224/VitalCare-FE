import { useEffect } from "react";
import { useCustom } from "@refinedev/core";
import { CalendarXIcon, LoaderIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { customResult } from "@/shared/hooks/use-custom-result";
import { cn } from "@/shared/lib/utils";
import { formatLocalTime } from "@/shared/lib/format";
import type { DaySlots, Slot } from "@/domains/clinic/types";

type Props = {
  clinicId: string;
  date: string;
  /** The chosen slot's start, as the API gives it (`HH:mm:ss`). */
  value: string;
  onChange: (startTime: string) => void;
  /** Reports the end of the booking window once it is known, for the date input. */
  onWindow?: (lastBookableDate: string) => void;
};

/**
 * The day's slots as buttons, split into morning and afternoon — pick one
 * instead of typing a time.
 *
 * A full slot or one already started is shown but cannot be picked, so the
 * shape of the day stays readable ("the morning is booked up") rather than
 * the grid silently shrinking. Each button says how many places are left.
 */
export function SlotPicker({ clinicId, date, value, onChange, onWindow }: Props) {
  const { result, query } = useCustom<DaySlots>({
    url: `${API_URL}/clinics/${clinicId}/slots`,
    method: "get",
    config: { query: { date } },
    queryOptions: {
      enabled: Boolean(clinicId && date),
      // A slot can fill up while somebody is looking at it.
      refetchInterval: 30_000,
    },
  });

  const day = customResult(result?.data, "slots");
  const lastBookableDate = day?.lastBookableDate;
  useEffect(() => {
    if (lastBookableDate) onWindow?.(lastBookableDate);
  }, [lastBookableDate, onWindow]);

  if (!clinicId || !date) {
    return <Hint>Chọn phòng khám và ngày khám để xem khung giờ còn trống.</Hint>;
  }
  if (query.isLoading) {
    return (
      <Hint>
        <LoaderIcon className="size-4 animate-spin" /> Đang tải khung giờ…
      </Hint>
    );
  }
  if (!day) {
    return <Hint>Không tải được khung giờ. Vui lòng thử lại.</Hint>;
  }
  if (!day.bookable) {
    return <Hint>Chỉ đặt được lịch từ hôm nay đến hết ngày {day.lastBookableDate}.</Hint>;
  }
  if (!day.open) {
    return (
      <Hint>
        <CalendarXIcon className="size-4" /> Phòng khám nghỉ vào ngày này. Vui lòng chọn ngày khác.
      </Hint>
    );
  }
  // A day with nothing left still shows its grid: seeing *why* — all past, or
  // all full — is what helps pick the next day.
  const morning = day.slots.filter((slot) => slot.startTime < "12:00");
  const afternoon = day.slots.filter((slot) => slot.startTime >= "12:00");

  return (
    <div className="flex flex-col gap-4">
      {[
        { label: "Buổi sáng", slots: morning },
        { label: "Buổi chiều", slots: afternoon },
      ]
        .filter((group) => group.slots.length > 0)
        .map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <span className="text-overline text-muted-foreground">{group.label}</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {group.slots.map((slot) => (
                <SlotButton
                  key={slot.startTime}
                  slot={slot}
                  selected={slot.startTime === value}
                  onSelect={() => onChange(slot.startTime)}
                />
              ))}
            </div>
          </div>
        ))}
      {!day.slots.some((slot) => slot.state === "available") && (
        <Hint>Ngày này đã hết chỗ. Vui lòng chọn ngày khác.</Hint>
      )}
    </div>
  );
}

function SlotButton({ slot, selected, onSelect }: { slot: Slot; selected: boolean; onSelect: () => void }) {
  const disabled = slot.state !== "available";
  const caption =
    slot.state === "past" ? "Đã qua" : slot.state === "full" ? "Hết chỗ" : `Còn ${slot.available} chỗ`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center rounded-md border px-2 py-2 text-sm transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary hover:bg-accent/40",
        disabled && "cursor-not-allowed opacity-45 hover:border-border hover:bg-transparent"
      )}
    >
      <span className="font-medium tabular-nums">{formatLocalTime(slot.startTime)}</span>
      <span className={cn("text-[11px]", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {caption}
      </span>
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm">
      {children}
    </p>
  );
}
