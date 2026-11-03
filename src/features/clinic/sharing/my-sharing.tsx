import { useList, useNotification } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import type { Profile } from "@/domains/profile/types";
import {
  SHARING_STATUS_LABELS,
  SHARING_STATUS_VARIANTS,
  sharedParts,
  type SharingPermission,
} from "@/domains/sharing/types";

type Draft = {
  caregiverPhone: string;
  emergencyPhone: string;
  vitals: boolean;
  alerts: boolean;
  appointments: boolean;
  until: string;
};
const EMPTY: Draft = {
  caregiverPhone: "",
  emergencyPhone: "",
  vitals: true,
  alerts: true,
  appointments: false,
  until: "",
};

/** "YYYY-MM-DD" → the end of that day in Vietnam, as ISO. */
const endOfDay = (day: string) =>
  day ? new Date(`${day}T23:59:59+07:00`).toISOString() : null;

/** Sends a write; a refusal is thrown as the server's own answer, for the message to be read from. */
async function send(method: "post" | "put", url: string, json?: unknown) {
  const response = await kyInstance(url, {
    method,
    json,
    throwHttpErrors: false,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw { data: body };
  return body;
}

/**
 * The portal's "Chia sẻ" (BF-06 Sharing Permission List / Grant / Update /
 * History): who may see the account's health data, which parts, until when,
 * and whom to call in an emergency. At most two caregivers at a time.
 */
export const MySharing = () => {
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const { result: profilesResult } = useList<Profile>({
    resource: "my_profiles",
    pagination: { mode: "off" },
  });
  const profiles = profilesResult?.data ?? [];
  const [profileId, setProfileId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [edit, setEdit] = useState<Draft>(EMPTY);

  const { data } = useQuery({
    queryKey: ["my_sharing"],
    queryFn: () => kyInstance.get("my_sharing").json<SharingPermission[]>(),
  });
  const all = data ?? [];
  const active = all.filter((p) => p.status === "ACTIVE");
  const history = all.filter((p) => p.status !== "ACTIVE");
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["my_sharing"] });
  const failed = async (e: unknown) => {
    // Refine's data provider hands refusals on as its HttpError: {message, statusCode, errors}.
    const body = (e as { data?: unknown }).data ?? e;
    const message =
      (body as { message?: string; errors?: Record<string, string> } | null)
        ?.message ?? "";
    setError(
      /two caregivers/.test(message)
        ? "Chỉ được chia sẻ cho tối đa 2 người cùng lúc. Hãy thu hồi một người trước."
        : /already has access/.test(message)
        ? "Người này đang được chia sẻ rồi; hãy sửa quyền thay vì cấp mới."
        : /No VitalCare account/.test(JSON.stringify(body))
        ? "Số điện thoại này chưa có tài khoản VitalCare. Nhờ người chăm sóc đăng ký trước."
        : /other than yourself/.test(JSON.stringify(body))
        ? "Không thể chia sẻ cho chính mình."
        : /Vietnamese phone/.test(JSON.stringify(body))
        ? "Số điện thoại khẩn cấp không hợp lệ."
        : "Không lưu được. Kiểm tra lại thông tin."
    );
  };
  const grant = useMutation({
    mutationFn: () =>
      send("post", "my_sharing", {
        profileId,
        caregiverPhone: draft.caregiverPhone,
        emergencyPhone: draft.emergencyPhone,
        shareVitals: draft.vitals,
        shareAlerts: draft.alerts,
        shareAppointments: draft.appointments,
        expiresAt: endOfDay(draft.until),
      }),
    onSuccess: () => {
      setDraft(EMPTY);
      setError(null);
      notify?.({ type: "success", message: "Đã chia sẻ" });
      refresh();
    },
    onError: failed,
  });
  const update = useMutation({
    mutationFn: (id: number) =>
      send("put", `my_sharing/${id}`, {
        shareVitals: edit.vitals,
        shareAlerts: edit.alerts,
        shareAppointments: edit.appointments,
        emergencyPhone: edit.emergencyPhone,
        expiresAt: endOfDay(edit.until),
        clearExpiry: !edit.until,
      }),
    onSuccess: () => {
      setEditing(null);
      notify?.({ type: "success", message: "Đã cập nhật quyền" });
      refresh();
    },
    onError: failed,
  });
  const revoke = useMutation({
    mutationFn: (id: number) =>
      kyInstance.post(`my_sharing/${id}/revoke`).json(),
    onSuccess: () => {
      notify?.({
        type: "success",
        message: "Đã thu hồi; người chăm sóc không còn xem được nữa",
      });
      refresh();
    },
    onError: () => {
      notify?.({ type: "error", message: "Không thu hồi được. Thử lại sau." });
      refresh();
    },
  });

  const parts = (d: Draft, set: (d: Draft) => void, prefix: string) => (
    <div className="flex flex-wrap gap-4 text-sm">
      {(
        [
          ["vitals", "Sinh hiệu"],
          ["alerts", "Cảnh báo"],
          ["appointments", "Lượt khám"],
        ] as const
      ).map(([k, label]) => (
        <Label key={k} className="flex items-center gap-2 font-normal">
          <Checkbox
            id={`${prefix}-${k}`}
            checked={d[k]}
            onCheckedChange={(v) => set({ ...d, [k]: v === true })}
          />
          {label}
        </Label>
      ))}
    </div>
  );

  return (
    <div className="screen-enter flex flex-col gap-5">
      <div>
        <h1>Chia sẻ</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cho người thân xem sức khỏe của bạn và nhận cảnh báo khẩn. Tối đa 2
          người cùng lúc; thu hồi bất cứ lúc nào.
        </p>
      </div>

      <Card className="gap-3 px-5 py-4" data-testid="sharing-active">
        <span className="text-sm font-medium">
          Đang chia sẻ ({active.length}/2)
        </span>
        {active.length === 0 && (
          <p className="text-muted-foreground text-sm">Chưa chia sẻ cho ai.</p>
        )}
        {active.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-md border p-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="flex flex-col">
                <span className="font-medium">
                  {p.caregiverName} · {p.caregiverPhone}
                </span>
                <span className="text-muted-foreground text-xs">
                  {p.customerName}: {sharedParts(p) || "không phần nào"} · gọi
                  khẩn {p.emergencyPhone}
                  {p.expiresAt
                    ? ` · đến ${formatDate(p.expiresAt)}`
                    : " · không thời hạn"}
                </span>
              </span>
              <span className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(p.id);
                    setEdit({
                      caregiverPhone: p.caregiverPhone,
                      emergencyPhone: p.emergencyPhone,
                      vitals: p.shareVitals,
                      alerts: p.shareAlerts,
                      appointments: p.shareAppointments,
                      until: p.expiresAt ? p.expiresAt.slice(0, 10) : "",
                    });
                  }}
                >
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revoke.mutate(p.id)}
                  disabled={revoke.isPending}
                >
                  Thu hồi
                </Button>
              </span>
            </div>
            {editing === p.id && (
              <div className="flex flex-col gap-2 border-t pt-2">
                {parts(edit, setEdit, `edit-${p.id}`)}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    aria-label="Số khẩn cấp (sửa)"
                    value={edit.emergencyPhone}
                    onChange={(e) =>
                      setEdit({ ...edit, emergencyPhone: e.target.value })
                    }
                  />
                  <Input
                    aria-label="Chia sẻ đến ngày (sửa)"
                    type="date"
                    value={edit.until}
                    onChange={(e) =>
                      setEdit({ ...edit, until: e.target.value })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  className="self-start"
                  onClick={() => update.mutate(p.id)}
                  disabled={update.isPending}
                >
                  Lưu
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card className="gap-3 px-5 py-4">
        <span className="text-sm font-medium">Chia sẻ cho người chăm sóc</span>
        {profiles.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {profiles.map((pr) => (
              <Button
                key={pr.id}
                size="sm"
                variant={
                  (profileId ?? profiles.find((x) => x.self)?.id) === pr.id
                    ? "default"
                    : "outline"
                }
                onClick={() => setProfileId(pr.self ? null : pr.id)}
              >
                {pr.fullName}
              </Button>
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="caregiver-phone">
              Số điện thoại tài khoản người chăm sóc
            </Label>
            <Input
              id="caregiver-phone"
              inputMode="tel"
              value={draft.caregiverPhone}
              onChange={(e) => {
                setDraft({ ...draft, caregiverPhone: e.target.value });
                setError(null);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="emergency-phone">Số gọi khi khẩn cấp</Label>
            <Input
              id="emergency-phone"
              inputMode="tel"
              value={draft.emergencyPhone}
              onChange={(e) => {
                setDraft({ ...draft, emergencyPhone: e.target.value });
                setError(null);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="share-until">
              Chia sẻ đến ngày (để trống: không thời hạn)
            </Label>
            <Input
              id="share-until"
              type="date"
              value={draft.until}
              onChange={(e) => setDraft({ ...draft, until: e.target.value })}
            />
          </div>
        </div>
        {parts(draft, setDraft, "new")}
        {error && (
          <p className="text-destructive text-sm" data-testid="sharing-error">
            {error}
          </p>
        )}
        <Button
          className="self-start"
          disabled={
            grant.isPending ||
            !draft.caregiverPhone.trim() ||
            !draft.emergencyPhone.trim()
          }
          onClick={() => grant.mutate()}
        >
          Chia sẻ
        </Button>
      </Card>

      {history.length > 0 && (
        <Card className="gap-2 px-5 py-4" data-testid="sharing-history">
          <span className="text-sm font-medium">Lịch sử chia sẻ</span>
          {history.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>
                {p.caregiverName} · {p.customerName} · {sharedParts(p)}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(p.revokedAt ?? p.expiresAt)}
                </span>
                <Badge variant={SHARING_STATUS_VARIANTS[p.status]}>
                  {SHARING_STATUS_LABELS[p.status]}
                </Badge>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};
