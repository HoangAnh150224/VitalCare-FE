import {
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { CONNECTIVITY_LABELS, type Connectivity } from "@/domains/device/types";

/** Online or not, as the heartbeat last decided (FE-02). */
export function ConnectivityBadge({
  connectivity,
}: {
  connectivity: Connectivity | null | undefined;
}) {
  const online = connectivity === "ONLINE";
  return (
    <Badge variant={online ? "success" : "neutral"} className="gap-1">
      {online ? (
        <WifiIcon className="size-3" />
      ) : (
        <WifiOffIcon className="size-3" />
      )}
      {CONNECTIVITY_LABELS[connectivity ?? "OFFLINE"]}
    </Badge>
  );
}

/** The battery the device last reported; red at 20% and below. */
export function BatteryLevel({ level }: { level: number | null | undefined }) {
  if (level == null)
    return <span className="text-muted-foreground text-xs">Pin: —</span>;
  const Icon =
    level <= 20
      ? BatteryLowIcon
      : level <= 60
      ? BatteryMediumIcon
      : BatteryFullIcon;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs tabular-nums",
        level <= 20 ? "text-destructive font-medium" : "text-muted-foreground"
      )}
    >
      <Icon className="size-3.5" />
      {level}%
    </span>
  );
}
