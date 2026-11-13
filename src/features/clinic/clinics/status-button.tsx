import { useState } from "react";
import { useCan, useCustomMutation, useInvalidate } from "@refinedev/core";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import type { Clinic } from "@/domains/clinic/types";
import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export function ClinicStatusButton({ clinic }: { clinic: Clinic }) {
  const [open, setOpen] = useState(false);
  const { data: permission } = useCan({ resource: "clinics", action: "edit" });
  const { mutate, mutation } = useCustomMutation();
  const invalidate = useInvalidate();
  const stopped = clinic.operatingStatus === "INACTIVE";
  const label = stopped ? "Mở lại cơ sở" : "Tạm ngừng cơ sở";
  const Icon = stopped ? LockKeyholeOpen : LockKeyhole;
  if (!permission?.can) return null;
  return <Popover open={open} onOpenChange={setOpen}>
    <Tooltip>
      <TooltipTrigger asChild><PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} disabled={mutation.isPending}><Icon className="size-4" /></Button>
      </PopoverTrigger></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
    <PopoverContent className="w-80">
      <p className="font-medium">{label}: {clinic.name}?</p>
      <p className="mt-2 text-sm text-muted-foreground">{stopped
        ? "Cơ sở sẽ hoạt động và nhận đăng ký khám mới trở lại."
        : "Cơ sở sẽ ngừng nhận đăng ký khám mới. Bạn có thể mở lại khi cần."}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => setOpen(false)}>Hủy</Button>
        <Button type="button" size="sm" disabled={mutation.isPending} onClick={() => mutate({
          url: `${API_URL}/clinics/${clinic.id}/operating-status`,
          method: "patch",
          values: { operatingStatus: stopped ? "OPERATING" : "INACTIVE" },
          config: { headers: { "Content-Type": "application/json" } },
          successNotification: { type: "success", message: stopped ? "Đã mở lại cơ sở" : "Đã tạm ngừng cơ sở" },
          errorNotification: { type: "error", message: "Không thể thay đổi trạng thái cơ sở" },
        }, { onSuccess: () => {
          setOpen(false);
          void invalidate({ resource: "clinics", invalidates: ["list", "detail", "many"] });
        } })}>{mutation.isPending ? "Đang lưu..." : label}</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
