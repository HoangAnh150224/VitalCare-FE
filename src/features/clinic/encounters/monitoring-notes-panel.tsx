import { useCan, useCustom, useCustomMutation, useNotification } from "@refinedev/core";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";

type MonitoringNote = {
  id: number;
  content: string;
  author: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Only the author may change a note. */
  editable: boolean;
};

/**
 * Notes staff keep while following a patient (SRS 3.9.3, wireframe 059):
 * each signed and dated, newest first, and changed afterwards by its author
 * alone. Renders nothing without `medical_records:read`, like the record panel.
 */
export function MonitoringNotesPanel({ customerId }: { customerId: number }) {
  const { open } = useNotification();
  const { data: canRead } = useCan({ resource: "medical_records", action: "show" });
  const { data: canWrite } = useCan({ resource: "medical_records", action: "edit" });

  const url = `${API_URL}/customers/${customerId}/monitoring-notes`;
  const { result, query } = useCustom<MonitoringNote[]>({
    url,
    method: "get",
    queryOptions: { enabled: canRead?.can ?? false },
  });
  const notes = Array.isArray(result?.data) ? result.data : [];

  const { mutate, mutation } = useCustomMutation<MonitoringNote>();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: number; content: string } | null>(null);

  if (!canRead?.can) return null;

  const send = (target: string, method: "post" | "patch", content: string, done: () => void) =>
    mutate(
      {
        url: target,
        method,
        values: { content: content.trim() },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: () => {
          done();
          void query.refetch();
          open?.({ type: "success", message: "Đã lưu ghi chú" });
        },
      }
    );

  return (
    <DetailPanel title="Ghi chú theo dõi" bodyClassName="p-4">
      <div className="flex flex-col gap-4">
        {notes.length ? (
          <ul className="flex flex-col gap-3">
            {notes.map((note) => (
              <li key={note.id} className="border-border rounded-lg border p-3">
                {editing?.id === note.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      rows={3}
                      maxLength={5000}
                      value={editing.content}
                      onChange={(event) => setEditing({ id: note.id, content: event.target.value })}
                      aria-label="Sửa ghi chú"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={editing.content.trim() === "" || mutation.isPending}
                        onClick={() => send(`${url}/${note.id}`, "patch", editing.content, () => setEditing(null))}
                      >
                        Lưu
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>
                        {note.author ?? "—"} · {formatDateTime(note.createdAt)}
                        {note.updatedAt && note.updatedAt !== note.createdAt ? " · đã sửa" : ""}
                      </span>
                      {note.editable && canWrite?.can ? (
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ id: note.id, content: note.content })}>
                          Sửa ghi chú của mình
                        </Button>
                      ) : (
                        <span>Chỉ xem</span>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Chưa có ghi chú theo dõi nào.</p>
        )}

        {canWrite?.can && (
          <div className="flex flex-col gap-2">
            <Textarea
              rows={3}
              maxLength={5000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nhập nhận xét theo dõi và bối cảnh chăm sóc tiếp theo."
              aria-label="Thêm ghi chú theo dõi"
            />
            <div>
              <Button
                size="sm"
                disabled={draft.trim() === "" || mutation.isPending}
                onClick={() => send(url, "post", draft, () => setDraft(""))}
              >
                Lưu ghi chú
              </Button>
            </div>
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
