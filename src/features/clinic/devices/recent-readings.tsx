import { useCustom, usePermissions } from "@refinedev/core";
import { Link } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import { SYNC_SOURCE_LABELS, type SyncSource } from "@/domains/device/sync";

type Reading = {
  id: number;
  measuredAt: string;
  receivedAt: string;
  heartRate: number | null;
  spo2: number | null;
  skinTemperature: number | null;
  bodyTemperature: number | null;
  source: SyncSource;
  validationStatus: "VALID" | "INVALID";
  validationError: string | null;
  customerId: number | null;
  customerName: string | null;
};

/** How often the panel looks for new readings, so they show up as the band sends them. */
const POLL_MS = 5_000;

const value = (v: number | null, unit: string, digits = 0) =>
  v == null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    `${Number(v).toFixed(digits)}${unit}`
  );

/** What the device has sent lately (FE-03): to see readings arrive from the band, the app or MQTT. */
export function RecentReadings({ deviceId }: { deviceId: number }) {
  // The read grant itself, not the Vital signs menu entry: a clinic administrator has the one without the other.
  const { data: permissions } = usePermissions<string[]>({});
  const access = { can: Boolean(permissions?.includes("vital_signs:read")) };
  const { result } = useCustom<Reading[]>({
    url: `${API_URL}/devices/${deviceId}/readings`,
    method: "get",
    config: { query: { limit: 30 } },
    queryOptions: { enabled: Boolean(access?.can), refetchInterval: POLL_MS },
  });
  if (!access?.can) return null;
  const rows = Array.isArray(result?.data) ? result.data : [];

  return (
    <DetailPanel title="Số đo gần đây" bodyClassName="p-0">
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="recent-readings">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">
                  Thời điểm đo
                </th>
                <th className="px-4 py-2 text-right font-medium">Nhịp tim</th>
                <th className="px-4 py-2 text-right font-medium">SpO₂</th>
                <th className="px-4 py-2 text-right font-medium">
                  Nhiệt độ da
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  Nhiệt độ cơ thể
                </th>
                <th className="px-4 py-2 text-left font-medium">Nguồn</th>
                <th className="px-4 py-2 text-left font-medium">Bệnh nhân</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2 tabular-nums">
                    {formatDateTime(r.measuredAt)}
                    {r.validationStatus === "INVALID" && (
                      <Badge
                        variant="destructive"
                        className="ml-2"
                        title={r.validationError ?? undefined}
                      >
                        Không hợp lệ
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {value(r.heartRate, " bpm")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {value(r.spo2, "%")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {value(r.skinTemperature, " °C", 2)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {value(r.bodyTemperature, " °C", 2)}
                  </td>
                  <td className="px-4 py-2">
                    {SYNC_SOURCE_LABELS[r.source] ?? r.source}
                  </td>
                  <td className="px-4 py-2">
                    {r.customerId ? (
                      <Link
                        to={`/customers/show/${r.customerId}`}
                        className="hover:underline"
                      >
                        {r.customerName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground p-4 text-sm">
          Chưa nhận được số đo nào từ thiết bị này.
        </p>
      )}
    </DetailPanel>
  );
}
