"use client";

import { useEffect, useState } from "react";
import type { BaseRecord, CrudOperators, HttpError } from "@refinedev/core";
import type { UseTableReturnType } from "@refinedev/react-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { Search, X } from "lucide-react";

import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

type FilterEntry = { id: string; value: unknown; operator?: CrudOperators };

export type DataTableQuickFilterProps<TData extends BaseRecord> = {
  table: UseTableReturnType<TData, HttpError>;
  placeholder?: string;
  /**
   * Field name sent to the data provider. `q` is the full-text search field
   * handled specially by the simple-rest provider (`?q=...`), which is the only
   * way to match several columns in a single request — this API has no OR
   * support across separate fields.
   * @default "q"
   */
  searchField?: string;
  className?: string;
};

export function DataTableQuickFilter<TData extends BaseRecord>({
  table,
  placeholder = "Nhập từ khóa tìm kiếm...",
  searchField = "q",
  className,
}: DataTableQuickFilterProps<TData>) {
  const { setColumnFilters, getState } = table.reactTable;

  // Written through TanStack's columnFilters rather than refineCore.setFilters:
  // useTable rebuilds the core filters from columnFilters on every change and
  // drops anything missing from it, so a filter set on the core directly would
  // be wiped the moment a column or advanced filter changes.
  const entries = getState().columnFilters as unknown as FilterEntry[];
  const activeValue = entries.find((entry) => entry.id === searchField)?.value;

  // Seed from the current filters so a reload (or a shared link, since
  // syncWithLocation is on) keeps the input filled.
  const [value, setValue] = useState(() =>
    activeValue != null ? String(activeValue) : ""
  );

  // Keep in sync when the filter is removed elsewhere (a chip, "Clear all").
  useEffect(() => {
    const next = activeValue != null ? String(activeValue) : "";
    setValue((prev) => (prev === next ? prev : next));
  }, [activeValue]);

  // Searches on Enter, not on every keystroke; emptying the box shows every row again at once.
  const search = (text: string) => {
    const next = text.trim();
    const current = activeValue != null ? String(activeValue) : "";
    // The same filter again would only send the table back to page 1.
    if (next === current) return;
    setColumnFilters((prev) => {
      const others = (prev as unknown as FilterEntry[]).filter(
        (entry) => entry.id !== searchField
      );
      return (
        next
          ? [...others, { id: searchField, operator: "contains", value: next }]
          : others
      ) as ColumnFiltersState;
    });
  };

  return (
    // No width of its own beyond `w-full`. The field's width is a decision
    // about the row it sits in, not about the field — `ListToolbar` makes it,
    // and a `max-w-sm` here used to override whatever the row wanted.
    <div className={cn("relative", "w-full", className)}>
      <Search
        className={cn(
          "absolute",
          "left-2.5",
          "top-1/2",
          "-translate-y-1/2",
          "h-4",
          "w-4",
          "text-muted-foreground",
          "pointer-events-none"
        )}
      />
      <Input
        type="text"
        className={cn("pl-8", value && "pr-8")}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (!event.target.value.trim()) search("");
        }}
        onKeyDown={(event) => {
          // Not while an input method is still composing a letter.
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          search(value);
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="Xóa tìm kiếm"
          onClick={() => {
            setValue("");
            search("");
          }}
          className={cn(
            "absolute",
            "right-2",
            "top-1/2",
            "-translate-y-1/2",
            "text-muted-foreground",
            "hover:text-foreground",
            "transition-colors",
            "cursor-pointer"
          )}
        >
          <X className={cn("h-4", "w-4")} />
        </button>
      )}
    </div>
  );
}

DataTableQuickFilter.displayName = "DataTableQuickFilter";
