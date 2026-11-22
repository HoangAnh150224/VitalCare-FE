"use client";

import { cn } from "@/shared/lib/utils";
import {
  useBack,
  useResourceParams,
  useUserFriendlyName,
} from "@refinedev/core";
import type { PropsWithChildren } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { Button } from "@/shared/ui/button";
import { RefreshButton } from "@/shared/components/buttons/refresh";
import { ArrowLeftIcon } from "lucide-react";

type EditViewProps = PropsWithChildren<{
  className?: string;
}>;

export function EditView({ children, className }: EditViewProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        "gap-4",
        // Screen entrance. Lives here rather than on a route wrapper so
        // it fires when a screen actually mounts — opening a route dialog
        // over a list leaves the list, and its animation, alone.
        "screen-enter screen-enter-stagger",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * What "Làm mới" does on an edit form (KAN-115): refetch the record, then put the
 * saved values back, dropping unsaved edits, their errors and the dirty flag.
 *
 * Without `toValues` the form's own fields are filled from the record by name, as
 * Refine does on first load; a field the record does not carry goes back to its
 * default. A form that shapes the record before showing it passes `toValues`.
 */
export async function reloadSaved<TRecord, TValues extends FieldValues>(
  query: { refetch: () => Promise<{ data?: { data?: TRecord } }> } | undefined,
  form: Pick<UseFormReturn<TValues>, "reset" | "getValues" | "formState">,
  toValues?: (record: TRecord) => unknown,
) {
  const fresh = (await query?.refetch())?.data?.data;
  if (!fresh) return;
  const saved = fresh as unknown as Record<string, unknown>;
  const defaults = (form.formState.defaultValues ?? {}) as Record<string, unknown>;
  const values = toValues
    ? toValues(fresh)
    : Object.fromEntries(
        Object.keys(form.getValues()).map((key) => [key, key in saved ? saved[key] : defaults[key]]),
      );
  form.reset(values as TValues);
}

type EditViewHeaderProps = PropsWithChildren<{
  resource?: string;
  title?: string;
  wrapperClassName?: string;
  headerClassName?: string;
  actionsSlot?: React.ReactNode;
  /**
   * Replaces what "Làm mới" does. The default only refetches the record, and
   * Refine's `useForm` leaves fields alone when the refetch brings back the
   * same data — so edits survive the click. A form that should drop its edits
   * passes a handler that refetches and resets: `reloadSaved` above.
   */
  onRefresh?: () => void;
}>;

export const EditViewHeader = ({
  resource: resourceFromProps,
  title: titleFromProps,
  actionsSlot,
  onRefresh,
  wrapperClassName,
  headerClassName,
}: EditViewHeaderProps) => {
  const back = useBack();

  const getUserFriendlyName = useUserFriendlyName();

  const { resource, identifier } = useResourceParams({
    resource: resourceFromProps,
  });
  const { id: recordItemId } = useResourceParams();

  const resourceName = resource?.name ?? identifier;

  // Singular, like `ShowViewHeader` and unlike `ListViewHeader`: this screen is
  // about the one record being edited, not about the collection. The plural it
  // used to ask for went unnoticed only because no page rendered this header.
  const title =
    titleFromProps ??
    getUserFriendlyName(
      resource?.meta?.label ?? identifier ?? resource?.name,
      "singular"
    );

  return (
    <div className={cn("flex flex-col", "gap-4", wrapperClassName)}>
      <div
        className={cn(
          "flex",
          "gap-1",
          "items-center",
          "justify-between",
          "-ml-2.5",
          headerClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <Button data-print="hide" variant="ghost" size="icon" onClick={back}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <h1 className="min-w-0 truncate text-3xl font-bold leading-9 tracking-tight">{title}</h1>
        </div>

        <div data-print="hide" className="flex shrink-0 items-center gap-2">
          {actionsSlot}
          <RefreshButton
            variant="outline"
            recordItemId={recordItemId}
            resource={resourceName}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
};

EditView.displayName = "EditView";