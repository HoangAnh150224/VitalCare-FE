import { useCustomMutation, useNotification } from "@refinedev/core";
import { FileIcon, Loader2Icon, PaperclipIcon } from "lucide-react";
import { useRef, useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { kyInstance } from "@/shared/api/data";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";
import type { ServiceOrder } from "@/domains/billing/types";
import {
  RESULT_FILE_ACCEPT,
  RESULT_FILE_MAX_BYTES,
  SERVICE_ORDER_STATUS_LABELS,
} from "@/domains/billing/types";
import { billingErrorNotification, billingErrorText } from "@/domains/billing/messages";
import { SERVICE_ORDER_STATUS_VARIANTS } from "@/shared/lib/status-variants";

export const OrderStatusBadge = ({ status }: { status: ServiceOrder["status"] }) => (
  <Badge variant={SERVICE_ORDER_STATUS_VARIANTS[status]}>{SERVICE_ORDER_STATUS_LABELS[status]}</Badge>
);

type HttpFailure = { message?: string; errors?: Record<string, unknown> };

/**
 * The steps of an order, each a POST/PATCH on `/service_orders/{id}/...`.
 * `onChanged` gets the order as the API returned it, for whoever shows it.
 */
export function useOrderActions(onChanged: (order: ServiceOrder) => void) {
  const { mutate, mutation } = useCustomMutation<ServiceOrder>();
  const { open } = useNotification();
  const [uploading, setUploading] = useState(false);

  const step = (id: number, path: string, method: "post" | "patch", values: object, done: string) =>
    new Promise<boolean>((resolve) =>
      mutate(
        {
          url: `${API_URL}/service_orders/${id}/${path}`,
          method,
          values,
          config: { headers: { "Content-Type": "application/json" } },
          successNotification: false,
          errorNotification: billingErrorNotification,
        },
        {
          onSuccess: ({ data }) => {
            onChanged(data);
            open?.({ type: "success", message: done });
            resolve(true);
          },
          onError: () => resolve(false),
        },
      ),
    );

  const upload = async (id: number, file: File) => {
    if (file.size > RESULT_FILE_MAX_BYTES) {
      open?.({ type: "error", message: "File tối đa 10 MB" });
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setUploading(true);
    try {
      // The instance is prefixed with the API's URL and defaults to JSON; the
      // multipart boundary only gets set if that default is taken off.
      onChanged(
        await kyInstance
          .post(`service_orders/${id}/files`, { body, headers: { "Content-Type": undefined } })
          .json<ServiceOrder>(),
      );
      open?.({ type: "success", message: `Đã đính kèm ${file.name}` });
    } catch (error) {
      open?.({ type: "error", message: billingErrorText(error as HttpFailure) });
    } finally {
      setUploading(false);
    }
  };

  return {
    pending: mutation.isPending || uploading,
    uploading,
    start: (id: number) => step(id, "start", "post", {}, "Đã bắt đầu thực hiện"),
    saveResult: (id: number, resultText: string) =>
      step(id, "result", "patch", { resultText }, "Đã lưu kết quả"),
    review: (id: number) => step(id, "review", "post", {}, "Đã đánh dấu đã xem kết quả"),
    cancel: (id: number, reason: string) => step(id, "cancel", "post", { reason }, "Đã huỷ chỉ định"),
    upload,
  };
}

/**
 * A result's files. Downloaded through the API with the session's token, then
 * saved — never opened in a tab, so an uploaded file never runs in this origin.
 *
 * `downloadPath` points it somewhere other than the staff endpoint — the
 * customer reads their files through their own visit result.
 */
export function OrderFiles({
  order,
  downloadPath = (fileId) => `service_orders/${order.id}/files/${fileId}`,
}: {
  order: Pick<ServiceOrder, "id" | "files">;
  downloadPath?: (fileId: number) => string;
}) {
  const { open } = useNotification();
  const [busy, setBusy] = useState<number | null>(null);

  const save = async (file: ServiceOrder["files"][number]) => {
    setBusy(file.id);
    try {
      const blob = await kyInstance.get(downloadPath(file.id)).blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      open?.({ type: "error", message: billingErrorText(error as HttpFailure) });
    } finally {
      setBusy(null);
    }
  };

  if (!order.files.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {order.files.map((file) => (
        <li key={file.id}>
          <Button type="button" variant="outline" size="sm" onClick={() => save(file)} disabled={busy === file.id}>
            {busy === file.id ? <Loader2Icon className="animate-spin" /> : <FileIcon />}
            <span className="max-w-48 truncate">{file.name}</span>
            <span className="text-muted-foreground text-xs">{formatSize(file.sizeBytes)}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** A button that picks a PDF or image and attaches it. */
export function AttachFileButton({ onPick, busy }: { onPick: (file: File) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={RESULT_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2Icon className="animate-spin" /> : <PaperclipIcon />}
        Đính kèm file
      </Button>
    </>
  );
}

/** Asks why before cancelling: the reason stays on the order. */
export function CancelOrderDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: Pick<ServiceOrder, "service"> | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={order != null}
      onOpenChange={(next) => {
        if (!next) {
          setReason("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Huỷ chỉ định {order?.service.name}?</DialogTitle>
          <DialogDescription>Dịch vụ đã huỷ không tính vào hóa đơn.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Lý do huỷ"
          rows={3}
          maxLength={500}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Không huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            Huỷ chỉ định
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
