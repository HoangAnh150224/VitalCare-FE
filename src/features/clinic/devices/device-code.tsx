import { useCan } from "@refinedev/core";
import { Link } from "react-router";

import { cn } from "@/shared/lib/utils";

/**
 * A device's code, linking to the device screen only for whoever may open it:
 * the front desk does not manage devices, so for it the code is plain text
 * rather than a link to a closed screen.
 */
export function DeviceCode({ id, code, className }: { id: number; code: string | null; className?: string }) {
  const { data } = useCan({ resource: "devices", action: "list" });
  if (!data?.can) return <span className={cn("font-mono", className)}>{code}</span>;
  return (
    <Link to={`/devices/show/${id}`} className={cn("font-mono hover:underline", className)}>
      {code}
    </Link>
  );
}
