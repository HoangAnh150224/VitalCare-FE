import { useState } from "react";
import { useCan, useUpdate } from "@refinedev/core";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import type { User } from "@/domains/user/types";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export function LockAccountButton({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const { data: permission } = useCan({ resource: "users", action: "edit" });
  const { mutate, mutation } = useUpdate();
  const locked = user.status === "locked";
  const label = locked ? "Mở khóa tài khoản" : "Khóa tài khoản";
  const Icon = locked ? LockKeyholeOpen : LockKeyhole;

  if (!permission?.can || user.deletedAt || user.roles.some((role) => role.code === "ADMIN")) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={label} disabled={mutation.isPending}>
              <Icon className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80">
        <p className="font-medium">{label}: {user.fullName}?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {locked
            ? "Tài khoản sẽ chuyển sang Hoạt động và có thể đăng nhập lại."
            : "Tài khoản sẽ bị chặn đăng nhập và đăng xuất các phiên đang mở."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => setOpen(false)}>Hủy</Button>
          <Button type="button" size="sm" disabled={mutation.isPending} onClick={() => mutate({
            resource: "users",
            id: user.id,
            values: { status: locked ? "active" : "locked" },
            mutationMode: "pessimistic",
            successNotification: { type: "success", message: locked ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản" },
            errorNotification: { type: "error", message: "Không thể cập nhật trạng thái tài khoản" },
          }, { onSuccess: () => setOpen(false) })}>
            {mutation.isPending ? "Đang cập nhật..." : label}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
