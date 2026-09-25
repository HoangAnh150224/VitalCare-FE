import { useGo } from "@refinedev/core";
import { ShieldAlertIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { humanizeResource } from "@/domains/permission/types";

/**
 * What a signed-in user sees when they reach a screen their roles do not cover.
 *
 * Distinct from the 404 in `error-component.tsx` on purpose. The page exists
 * and the address is right; what is missing is a permission, and saying so is
 * the difference between "you mistyped" and "ask an administrator".
 *
 * Reached by typing or bookmarking a URL — the sidebar already hides what it
 * leads to. The API refuses the same request independently, so this is a
 * courtesy, not the boundary.
 */
export function Forbidden({ resource }: { resource?: string }) {
  const go = useGo();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        "min-h-[60vh] px-6 text-center",
        "screen-enter"
      )}
    >
      <div className="bg-muted text-muted-foreground rounded-full p-4">
        <ShieldAlertIcon className="size-8" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bạn không có quyền truy cập trang này
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          {resource
            ? `Các vai trò của bạn không có quyền xem ${humanizeResource(resource).toLowerCase()}.`
            : "Các vai trò của bạn không có quyền xem trang này."}{" "}
          Hãy liên hệ quản trị viên nếu bạn cần quyền này.
        </p>
      </div>

      <Button variant="outline" onClick={() => go({ to: "/" })}>
        Về trang Tổng quan
      </Button>
    </div>
  );
}

Forbidden.displayName = "Forbidden";
