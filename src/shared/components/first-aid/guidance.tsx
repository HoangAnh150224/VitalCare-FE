import { PhoneCallIcon, TriangleAlertIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { GUIDANCE_DISCLAIMER, parseGuidance } from "@/domains/first-aid/types";

/**
 * A first-aid article's body, drawn from its plain-text marks (`## `, `1. `,
 * `- `) as React elements: nothing an author typed is ever read as HTML. The
 * public page, the staff preview and the version history all show it this
 * way, so a reviewer approves exactly what patients will read.
 */
export function GuidanceBody({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const blocks = parseGuidance(body);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 text-[15px] leading-relaxed",
        className
      )}
    >
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <h3
                key={index}
                className="mt-2 text-lg font-semibold tracking-tight first:mt-0"
              >
                {block.text}
              </h3>
            );
          case "steps":
            return (
              <ol key={index} className="flex flex-col gap-2">
                {block.items.map((item, step) => (
                  <li key={step} className="flex gap-3">
                    <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                      {step + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            );
          case "bullets":
            return (
              <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
                {block.items.map((item, bullet) => (
                  <li key={bullet}>{item}</li>
                ))}
              </ul>
            );
          default:
            return <p key={index}>{block.text}</p>;
        }
      })}
    </div>
  );
}

/** The "when to get help" line, set apart in red above the steps. */
export function EmergencyWarning({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-3 rounded-xl border p-3 text-sm font-medium",
        className
      )}
    >
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

export function GuidanceDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)}>
      {GUIDANCE_DISCLAIMER}
    </p>
  );
}

/** A `tel:` link, large enough to hit on a phone in a hurry. */
export function CallButton({
  number,
  label,
  className,
}: {
  number: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={`tel:${number.replace(/\s/g, "")}`}
      className={cn(
        "border-destructive/30 hover:bg-destructive/10 flex items-center gap-3 rounded-xl border bg-white p-3 transition-colors dark:bg-transparent",
        className
      )}
    >
      <span className="bg-destructive flex size-10 shrink-0 items-center justify-center rounded-full text-white">
        <PhoneCallIcon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-destructive text-lg leading-tight font-bold tabular-nums">
          {number}
        </span>
        <span className="text-muted-foreground truncate text-sm">{label}</span>
      </span>
    </a>
  );
}
