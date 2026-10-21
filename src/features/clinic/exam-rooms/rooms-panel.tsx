import { useState } from "react";
import { useCan, useCreate, useList, useUpdate, type HttpError } from "@refinedev/core";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router";

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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { EXAM_ROOM_STATUS_LABELS, type ExamRoom } from "@/domains/exam-room/types";

/**
 * A clinic's examination rooms, on the clinic's page: the list, and adding or
 * renaming one for whoever sets the clinic up. Which doctor sits in a room is
 * set per session in the doctor's week; who is in it is the floor board's.
 */
export function ClinicRoomsPanel({ clinicId }: { clinicId: string }) {
  const { data: canRead } = useCan({ resource: "exam_rooms", action: "list" });
  const { data: canCreate } = useCan({ resource: "exam_rooms", action: "create" });
  const { data: canEdit } = useCan({ resource: "exam_rooms", action: "edit" });
  const { result } = useList<ExamRoom>({
    resource: "exam_rooms",
    filters: [{ field: "clinicId", operator: "eq", value: clinicId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: canRead?.can ?? false },
  });
  const [editing, setEditing] = useState<ExamRoom | "new" | null>(null);

  if (!canRead?.can) return null;
  const rooms = result?.data ?? [];

  return (
    <DetailPanel
      title="Phòng khám"
      action={
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/exam-rooms">Điều phối</Link>
          </Button>
          {canCreate?.can && (
            <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
              <PlusIcon />
              Thêm phòng
            </Button>
          )}
        </div>
      }
      bodyClassName="p-4"
    >
      {rooms.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Chưa có phòng nào. Thêm phòng, rồi xếp bác sĩ vào phòng theo từng buổi trong Lịch bác sĩ.
        </p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {rooms.map((room) => (
            <li key={room.id} className="flex items-center gap-3 py-2.5">
              <span className="w-16 font-semibold">{room.code}</span>
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">{room.name ?? "—"}</span>
              <Badge variant="secondary">{EXAM_ROOM_STATUS_LABELS[room.status]}</Badge>
              {canEdit?.can && (
                <Button size="icon-sm" variant="ghost" aria-label={`Sửa ${room.code}`} onClick={() => setEditing(room)}>
                  <PencilIcon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <RoomDialog clinicId={clinicId} room={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </DetailPanel>
  );
}

function RoomDialog({ clinicId, room, onClose }: { clinicId: string; room: ExamRoom | null; onClose: () => void }) {
  const [code, setCode] = useState(room?.code ?? "");
  const [name, setName] = useState(room?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const { mutate: create, mutation: creating } = useCreate<ExamRoom>();
  const { mutate: update, mutation: updating } = useUpdate<ExamRoom>();
  const busy = creating.isPending || updating.isPending;

  const done = {
    onSuccess: onClose,
    onError: (failure: HttpError) =>
      setError(
        failure.errors?.code && String(failure.errors.code).includes("already")
          ? "Cơ sở đã có phòng mang mã này."
          : "Không lưu được phòng. Kiểm tra lại mã và tên."
      ),
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const values = { clinicId, code: code.trim(), name: name.trim() || null };
    if (room) {
      update({ resource: "exam_rooms", id: room.id, values, errorNotification: false }, done);
    } else {
      create({ resource: "exam_rooms", values, errorNotification: false }, done);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{room ? `Sửa phòng ${room.code}` : "Thêm phòng khám"}</DialogTitle>
            <DialogDescription>Mã phòng là chữ trên cửa, ví dụ P101; không trùng trong cùng cơ sở.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="room-code">Mã phòng</Label>
            <Input id="room-code" required maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="room-name">Tên phòng</Label>
            <Input
              id="room-name"
              maxLength={100}
              placeholder="Ví dụ: Phòng khám nội 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button type="submit" disabled={busy || !code.trim()}>
              {busy ? "Đang lưu…" : "Lưu phòng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
