import { cn } from "@/shared/lib/utils";

/**
 * What a public page shows when there is nothing to show — an empty list, a page that is not
 * there, or data that would not load — instead of a blank space: the rabbit, and why.
 */
export function EmptyState({
  message,
  tone = "muted",
  className,
}: {
  message: string;
  /** "error" when it failed rather than came back empty. */
  tone?: "muted" | "error";
  className?: string;
}) {
  return (
    <div className={cn("col-span-full flex flex-col items-center gap-3 py-10 text-center", className)} role="status">
      {/* The GIF has a white ground; multiply drops it into whatever the page is. */}
      <img src="/empty-state.gif" alt="" className="size-36 mix-blend-multiply" loading="lazy" />
      <p className={cn("max-w-md text-sm", tone === "error" ? "text-destructive" : "text-muted-foreground")}>{message}</p>
    </div>
  );
}
