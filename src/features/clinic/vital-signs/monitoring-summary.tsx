import { useCan } from "@refinedev/core";
import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";

import { DetailPanel } from "@/shared/components/views/record-detail";
import { useVitalLatest } from "./use-vitals";
import { VitalTiles } from "./vital-parts";

/** Patient Monitoring Summary (FE-04) on the patient's page: latest values, and the way to the rest. */
export function MonitoringSummaryPanel({ customerId }: { customerId: number }) {
  const { data: access } = useCan({ resource: "vital_signs", action: "list" });
  const { data: latest, isLoading } = useVitalLatest(
    { kind: "staff", customerId },
    Boolean(access?.can)
  );
  if (!access?.can) return null;

  return (
    <DetailPanel
      title="Tóm tắt theo dõi sinh hiệu"
      bodyClassName="p-4"
      action={
        <Link
          to={`/vital-signs/patient/${customerId}`}
          className="flex items-center gap-1 text-sm hover:underline"
        >
          Xem xu hướng và lịch sử <ArrowRightIcon className="size-3.5" />
        </Link>
      }
    >
      <VitalTiles latest={latest} loading={isLoading} />
      <p className="text-muted-foreground mt-3 text-xs">
        {latest?.readings24h
          ? `${latest.readings24h} lần đo trong 24 giờ qua.`
          : "Không có số đo trong 24 giờ qua."}
      </p>
    </DetailPanel>
  );
}
