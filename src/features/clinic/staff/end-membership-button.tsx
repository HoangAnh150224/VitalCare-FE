import { useState } from "react";
import { useCan, useCustomMutation, useInvalidate } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { UserRoundMinus } from "lucide-react";
import type { Employee } from "@/domains/employee/types";
import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export function EndMembershipButton({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const { data: permission } = useCan({ resource: "staff_memberships", action: "edit" });
  const { mutate, mutation } = useCustomMutation();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  if (!permission?.can || employee.status !== "active" || employee.deletedAt) return null;

  return <Popover open={open} onOpenChange={(value) => {
    if (mutation.isPending) return;
    setOpen(value);
    setReasonError(false);
    if (!value) setReason("");
  }}>
    <Tooltip>
      <TooltipTrigger asChild><PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Kết thúc thành viên">
          <UserRoundMinus className="size-4" />
        </Button>
      </PopoverTrigger></TooltipTrigger>
      <TooltipContent>Kết thúc thành viên</TooltipContent>
    </Tooltip>
    <PopoverContent className="w-80">
      <p className="font-medium">Kết thúc thành viên: {employee.fullName}?</p>
      <p className="mt-2 text-sm text-muted-foreground">Hồ sơ chuyển sang Đã nghỉ và vẫn hiển thị trong danh sách. Quản trị viên đã nghỉ không thể chỉnh sửa. Nhân viên rời các nhóm chăm sóc và không đăng nhập được nữa.</p>
      <Label className="mt-3" htmlFor={`end-reason-${employee.id}`}>Lý do kết thúc <span className="text-destructive">*</span></Label>
      <Input id={`end-reason-${employee.id}`} className="mt-2" aria-required aria-invalid={reasonError} aria-describedby={reasonError ? `end-reason-error-${employee.id}` : undefined} placeholder="Nhập lý do kết thúc thành viên" value={reason} maxLength={500} disabled={mutation.isPending} onChange={(event) => { setReason(event.target.value); setReasonError(false); }} />
      {reasonError && <p id={`end-reason-error-${employee.id}`} role="alert" className="mt-1 text-sm text-destructive">Vui lòng nhập lý do kết thúc thành viên.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => { setOpen(false); setReason(""); }}>Hủy</Button>
        <Button type="button" size="sm" disabled={mutation.isPending} onClick={() => {
          if (!reason.trim()) { setReasonError(true); return; }
          mutate({
          url: `${API_URL}/employees/${employee.id}/memberships/end`,
          method: "post",
          values: { reason: reason.trim() },
          config: { headers: { "Content-Type": "application/json" } },
          successNotification: { type: "success", message: "Đã kết thúc thành viên. Hồ sơ được giữ lại trong danh sách." },
          errorNotification: { type: "error", message: "Không thể kết thúc thành viên. Vui lòng kiểm tra lại." },
        }, { onSuccess: () => {
          setOpen(false);
          setReason("");
          void invalidate({ resource: "audit_logs", invalidates: ["list", "many"] });
          void invalidate({ resource: "employees", invalidates: ["list", "detail", "many"], id: employee.id });
          void queryClient.invalidateQueries({ queryKey: ["staff_memberships", employee.id] });
        } }); }}>{mutation.isPending ? "Đang lưu..." : "Xác nhận kết thúc"}</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
