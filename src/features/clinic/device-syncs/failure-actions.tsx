import {
  useCan,
  useCustomMutation,
  useInvalidate,
  useNotification,
} from "@refinedev/core";
import { RotateCwIcon, XIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import {
  SYNC_FAILURE_STATUS_LABELS,
  type SyncFailure,
} from "@/domains/device/sync";

/** Try a refused reading again, or set it aside (FE-06 Synchronization Management). */
export function FailureActions({
  failure,
  compact = false,
}: {
  failure: SyncFailure;
  compact?: boolean;
}) {
  const { data: access } = useCan({
    resource: "sync_failures",
    action: "edit",
  });
  const { mutate, mutation } = useCustomMutation<SyncFailure>();
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();
  if (!access?.can || failure.status !== "OPEN") return null;

  const act = (what: "retry" | "discard") =>
    mutate(
      {
        url: `${API_URL}/sync_failures/${failure.id}/${what}`,
        method: "post",
        values: {},
        successNotification: false,
        config: { headers: { "Content-Type": "application/json" } },
      },
      {
        onSuccess: ({ data }) => {
          notify?.({
            type: data.status === "OPEN" ? "error" : "success",
            message:
              data.status === "OPEN"
                ? "Vẫn chưa nhận được bản ghi"
                : `Bản ghi: ${SYNC_FAILURE_STATUS_LABELS[
                    data.status
                  ].toLowerCase()}`,
            description: data.status === "OPEN" ? data.reason : undefined,
          });
          invalidate({ resource: "sync_failures", invalidates: ["all"] });
          invalidate({ resource: "device_syncs", invalidates: ["all"] });
        },
      }
    );

  return (
    <div className="flex gap-1">
      <Button
        size={compact ? "icon-sm" : "sm"}
        variant="outline"
        disabled={mutation.isPending}
        onClick={() => act("retry")}
        aria-label="Thử lại"
      >
        <RotateCwIcon />
        {!compact && "Thử lại"}
      </Button>
      <Button
        size={compact ? "icon-sm" : "sm"}
        variant="ghost"
        disabled={mutation.isPending}
        onClick={() => act("discard")}
        aria-label="Bỏ qua"
      >
        <XIcon />
        {!compact && "Bỏ qua"}
      </Button>
    </div>
  );
}
