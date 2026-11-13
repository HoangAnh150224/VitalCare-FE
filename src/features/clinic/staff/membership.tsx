import { useCan, useInvalidate, useList, useNotification } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { getAuthorities, getIdentity } from "@/shared/api/session";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatDateTime } from "@/shared/lib/format";
import type { Clinic } from "@/domains/clinic/types";
import type { Employee } from "@/domains/employee/types";

type Membership = {
  id: number;
  clinicId: string;
  clinicName: string;
  status: "ACTIVE" | "ENDED";
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
};

type ClinicRole = {
  code: string;
  name: string;
  adminOnly: boolean;
  access: Record<string, "ALLOWED" | "BY_PERMISSION" | "NONE">;
};

const ACCESS_LABELS = { ALLOWED: "Được phép", BY_PERMISSION: "Theo quyền", NONE: "Chưa cấp" } as const;
const ACCESS_VARIANTS = { ALLOWED: "default", BY_PERMISSION: "secondary", NONE: "outline" } as const;

/** Sends a write; a refusal is thrown as the server's own answer. */
async function send(method: "post" | "put", url: string, json: unknown) {
  const response = await kyInstance(url, { method, json, throwHttpErrors: false });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw { statusCode: response.status, body };
  return body;
}

/** The server's refusals here, in Vietnamese. */
function membershipErrorText(body: unknown): string {
  const text = JSON.stringify(body ?? "");
  if (/visits to see/.test(text)) return "Nhân viên còn lượt khám chưa xong tại cơ sở này. Chuyển các lượt khám cho người khác trước.";
  if (/already work at this clinic/.test(text)) return "Nhân viên đang làm ở cơ sở này rồi.";
  if (/Pick one of the clinics|Pick a clinic/.test(text)) return "Chọn cơ sở chuyển đến.";
  if (/still on staff/.test(text)) return "Chỉ chuyển được nhân viên đang làm việc.";
  if (/already ended/.test(text)) return "Thành viên này đã kết thúc rồi.";
  if (/at least one role/.test(text)) return "Chọn ít nhất một vai trò.";
  if (/Your own roles/.test(text)) return "Không tự đổi vai trò của chính mình; nhờ quản trị khác.";
  if (/Only the system administrator/.test(text)) return "Chỉ quản trị hệ thống mới cấp hoặc gỡ vai trò Quản trị phòng khám.";
  if (/Only the clinic administrator/.test(text)) return "Vai trò Bác sĩ và Lễ tân do quản trị phòng khám cấp.";
  if (/last active administrator|no active administrator/.test(text)) return "Không thể gỡ quản trị viên cuối cùng.";
  if (typeof body === "object" && body !== null && "statusCode" in body && body.statusCode === 403) {
    return "Bạn không có quyền thay đổi vai trò này. Vai trò Bác sĩ và Lễ tân cần quyền quản lý nhân viên.";
  }
  return "Không lưu được. Thử lại sau.";
}

/** SRS 3.18.9 Staff Membership Management: which clinic they belong to, since when, moving and ending it. */
export function MembershipPanel({ employee }: { employee: Employee }) {
  const { data: canRead } = useCan({ resource: "staff_memberships", action: "list" });
  const { data: canEnd } = useCan({ resource: "staff_memberships", action: "edit" });
  const { data: canMove } = useCan({ resource: "staff_memberships", action: "transfer" });
  const { open: notify } = useNotification();
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const [mode, setMode] = useState<"end" | "move" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const key = ["staff_memberships", employee.id];
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => kyInstance.get(`employees/${employee.id}/memberships`).json<Membership[]>(),
    enabled: Boolean(canRead?.can),
  });
  const { result: clinics } = useList<Clinic>({
    resource: "clinics",
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(canMove?.can) },
  });
  const act = useMutation({
    mutationFn: () =>
      mode === "move"
        ? send("post", `employees/${employee.id}/memberships/transfer`, { clinicId, reason })
        : send("post", `employees/${employee.id}/memberships/end`, { reason }),
    onSuccess: () => {
      notify?.({ type: "success", message: mode === "move" ? "Đã chuyển cơ sở" : "Đã kết thúc thành viên" });
      setMode(null);
      setReason("");
      setClinicId("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: key });
      void invalidate({ resource: "audit_logs", invalidates: ["list", "many"] });
      void invalidate({ resource: "employees", invalidates: ["detail", "list"], id: employee.id });
    },
    onError: (e) => setError(membershipErrorText(e)),
  });
  if (!canRead?.can) return null;
  const rows = data ?? [];
  const active = rows.find((m) => m.status === "ACTIVE");
  const others = (clinics?.data ?? []).filter((c) => c.id !== active?.clinicId);

  return (
    <DetailPanel
      title="Phòng khám trực thuộc"
      action={
        active ? <Badge>Đang là thành viên</Badge> : <Badge variant="outline">Không còn là thành viên</Badge>
      }
    >
      <div className="flex flex-col gap-3 p-4" data-testid="membership-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cơ sở</TableHead>
              <TableHead>Trạng thái thành viên</TableHead>
              <TableHead>Từ</TableHead>
              <TableHead>Đến</TableHead>
              <TableHead>Lý do kết thúc</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.clinicName}</TableCell>
                <TableCell>
                  <Badge variant={m.status === "ACTIVE" ? "default" : "outline"}>
                    {m.status === "ACTIVE" ? "Đang hoạt động" : "Đã kết thúc"}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{formatDateTime(m.startedAt)}</TableCell>
                <TableCell className="tabular-nums">{m.endedAt ? formatDateTime(m.endedAt) : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{m.endReason ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {employee.status === "active" && active && mode === null && (
          <div className="flex flex-wrap gap-2">
            {canMove?.can && (
              <Button size="sm" variant="outline" onClick={() => setMode("move")}>
                Chuyển cơ sở
              </Button>
            )}
            {canEnd?.can && (
              <Button size="sm" variant="outline" onClick={() => setMode("end")}>
                Kết thúc thành viên
              </Button>
            )}
          </div>
        )}
        {employee.status === "active" && mode && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            {mode === "move" && (
              <div className="flex flex-col gap-1.5">
                <Label>Chuyển đến cơ sở</Label>
                <Select value={clinicId} onValueChange={setClinicId}>
                  <SelectTrigger className="w-full" aria-label="Chuyển đến cơ sở">
                    <SelectValue placeholder="Chọn cơ sở" />
                  </SelectTrigger>
                  <SelectContent>
                    {others.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="membership-reason">Lý do {mode === "move" && <span className="text-destructive">*</span>}</Label>
              <Input
                id="membership-reason"
                value={reason}
                maxLength={500}
                aria-required={mode === "move"}
                aria-invalid={Boolean(reasonError)}
                aria-describedby={reasonError ? "membership-reason-error" : undefined}
                onChange={(e) => { setReason(e.target.value); setReasonError(null); }}
                placeholder={mode === "move" ? "Điều chuyển công tác" : "Nghỉ việc"}
              />
              {reasonError && <p id="membership-reason-error" role="alert" className="text-destructive text-sm">{reasonError}</p>}
            </div>
            <p className="text-muted-foreground text-xs">
              {mode === "move"
                ? "Nhân viên rời các nhóm chăm sóc ở cơ sở hiện tại và ca làm việc bỏ gán phòng; cơ sở mới tự xếp lại."
                : "Hồ sơ chuyển sang Đã nghỉ và vẫn hiển thị trong danh sách. Quản trị viên đã nghỉ không thể chỉnh sửa. Nhân viên rời mọi nhóm chăm sóc và không đăng nhập được nữa."}
            </p>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={act.isPending || (mode === "move" && !clinicId)}
                onClick={() => {
                  if (mode === "move" && !reason.trim()) {
                    setReasonError("Vui lòng nhập lý do chuyển cơ sở.");
                    return;
                  }
                  setReasonError(null);
                  act.mutate();
                }}
              >
                {mode === "move" ? "Xác nhận chuyển" : "Xác nhận kết thúc"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setMode(null); setError(null); setReasonError(null); }}>
                Huỷ
              </Button>
            </div>
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

/**
 * SRS 3.18.10 Clinic-Level Role Management: the roles somebody holds at the
 * clinic, apart from the kind of staff they are, with what each allows.
 */
export function ClinicRolesPanel({ employeeId }: { employeeId: number }) {
  const { data: canRead } = useCan({ resource: "clinic_roles", action: "list" });
  const { data: canWrite } = useCan({ resource: "clinic_roles", action: "edit" });
  const systemAdmin = getAuthorities()?.roles.includes("ADMIN") ?? false;
  // Clinic roles other than Quản trị phòng khám are given by whoever runs the clinic's staff.
  const canManageStaffRoles = systemAdmin || ((getAuthorities()?.roles.includes("CLINIC_ADMIN") ?? false) && (getAuthorities()?.permissions.includes("employees:write") ?? false));
  const { data: employee } = useQuery({
    queryKey: ["clinic-role-employee", employeeId],
    queryFn: () => kyInstance.get(`employees/${employeeId}`).json<Employee>(),
  });
  const ownAccount = employee?.userId === getIdentity()?.id;
  const { open: notify } = useNotification();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: catalogue } = useQuery({
    queryKey: ["clinic_roles"],
    queryFn: () => kyInstance.get("clinic_roles").json<ClinicRole[]>(),
    enabled: Boolean(canRead?.can),
    staleTime: 60_000,
  });
  const key = ["clinic_roles", employeeId];
  const { data: held } = useQuery({
    queryKey: key,
    queryFn: () => kyInstance.get(`employees/${employeeId}/clinic_roles`).json<{ roles: string[] }>(),
    enabled: Boolean(canRead?.can),
  });
  const save = useMutation({
    mutationFn: () => send("put", `employees/${employeeId}/clinic_roles`, { roles: draft }),
    onSuccess: () => {
      notify?.({ type: "success", message: "Đã lưu vai trò" });
      setDraft(null);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setError(membershipErrorText(e)),
  });
  if (!canRead?.can) return null;
  const roles = draft ?? held?.roles ?? [];
  const groups = Object.keys(catalogue?.[0]?.access ?? {});
  const toggle = (code: string, on: boolean) =>
    setDraft(on ? [...roles, code] : roles.filter((c) => c !== code));
  const added = roles.filter((code) => !held?.roles.includes(code));
  const removed = (held?.roles ?? []).filter((code) => !roles.includes(code));
  const roleNames = (codes: string[]) => codes.map((code) => catalogue?.find((role) => role.code === code)?.name ?? code).join(", ");

  return (
    <DetailPanel title="Vai trò tại phòng khám">
      <div className="flex flex-col gap-3 p-4" data-testid="clinic-roles-panel">
        {!canManageStaffRoles && (
          <p className="text-muted-foreground text-sm">
            Vai trò Bác sĩ và Lễ tân do quản trị phòng khám quản lý. Bạn chỉ có thể cấp hoặc gỡ vai trò Quản trị phòng khám khi có quyền.
          </p>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vai trò</TableHead>
                {groups.map((g) => (
                  <TableHead key={g}>{g}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(catalogue ?? []).map((role) => {
                const reason = ownAccount ? "Không tự đổi vai trò của chính mình."
                  : !canWrite?.can ? "Bạn không có quyền quản lý vai trò."
                  : role.adminOnly && !systemAdmin ? "Chỉ Quản trị hệ thống được cấp/gỡ vai trò này."
                  : !role.adminOnly && !canManageStaffRoles ? "Bạn không có quyền quản lý nhân viên." : "";
                const locked = Boolean(reason) || !held || !employee || save.isPending;
                return (
                  <TableRow key={role.code}>
                    <TableCell>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          aria-label={role.name}
                          checked={roles.includes(role.code)}
                          disabled={locked}
                          onCheckedChange={(v) => toggle(role.code, v === true)}
                        />
                        <span className="font-medium">{role.name}</span>
                        {reason && <span className="text-muted-foreground text-xs">{reason}</span>}
                      </label>
                    </TableCell>
                    {groups.map((g) => (
                      <TableCell key={g}>
                        <Badge variant={ACCESS_VARIANTS[role.access[g]]}>{ACCESS_LABELS[role.access[g]]}</Badge>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        {canWrite?.can && (
          <>
          {draft && <div className="rounded-md border p-3 text-sm" aria-live="polite">
            <p>Thêm vai trò: {roleNames(added) || "Không có"}</p>
            <p>Gỡ vai trò: {roleNames(removed) || "Không có"}</p>
          </div>}
          <Button className="w-fit" size="sm" disabled={ownAccount || !employee || !held || (!added.length && !removed.length) || save.isPending} onClick={() => save.mutate()}>
            Lưu vai trò
          </Button>
          </>
        )}
      </div>
    </DetailPanel>
  );
}

/** SRS 3.18.10 as its own screen: pick a member of staff, then their roles at the clinic. */
export const ClinicRolesPage = () => {
  const { result } = useList<Employee>({ resource: "employees", pagination: { mode: "off" } });
  const staff = (result?.data ?? []).filter((e) => e.status === "active");
  const [id, setId] = useState("");
  return (
    <div className="screen-enter flex flex-col gap-5">
      <div>
        <h1>Quản lý vai trò phòng khám</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vai trò quyết định nhân viên làm được gì tại cơ sở, không phụ thuộc loại nhân viên.
        </p>
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <Label>Nhân viên</Label>
        <Select value={id} onValueChange={setId}>
          <SelectTrigger className="w-full" aria-label="Nhân viên">
            <SelectValue placeholder="Chọn nhân viên" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.fullName} · {e.employeeCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {id && <ClinicRolesPanel key={id} employeeId={Number(id)} />}
    </div>
  );
};
