import {
  useCustomMutation,
  useInvalidate,
  useList,
  useNotification,
} from "@refinedev/core";
import { BluetoothIcon, Link2OffIcon, WatchIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { formatDateTime } from "@/shared/lib/format";
import { BatteryLevel, ConnectivityBadge } from "../devices/device-status";
import type { Connectivity } from "@/domains/device/types";

type MyDevice = {
  deviceId: number;
  deviceCode: string;
  deviceType: string | null;
  model: string | null;
  customerId: number;
  customerName: string;
  assignedAt: string | null;
  expectedReturnAt: string | null;
  connectivity: Connectivity;
  batteryLevel: number | null;
  firmwareVersion: string | null;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  pairedAt: string | null;
  pairedWithMe: boolean;
};

/**
 * The portal's "Thiết bị của tôi" (FE-02 on the patient side): the monitoring
 * devices handed to the account's profiles, whether they report, and pairing
 * with this account — what the mobile app does after finding the band over
 * BLE, by its code here.
 */
export const MyDeviceList = () => {
  const { result, query } = useList<MyDevice>({
    resource: "my_devices",
    pagination: { mode: "off" },
  });
  const devices = result?.data ?? [];
  const [code, setCode] = useState("");
  const { mutate, mutation } = useCustomMutation<MyDevice>();
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();

  const send = (
    url: string,
    method: "post" | "delete",
    values: object,
    done: string
  ) =>
    mutate(
      {
        url,
        method,
        values,
        successNotification: false,
        config: { headers: { "Content-Type": "application/json" } },
      },
      {
        onSuccess: () => {
          notify?.({ type: "success", message: done });
          setCode("");
          invalidate({ resource: "my_devices", invalidates: ["all"] });
        },
      }
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Thiết bị của tôi</h1>
        <p className="text-muted-foreground text-sm">
          Thiết bị theo dõi phòng khám đã giao cho bạn và người thân.
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : devices.length === 0 ? (
        <Card className="items-center gap-2 px-6 py-8 text-center">
          <WatchIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">
            Bạn chưa được giao thiết bị theo dõi nào.
          </p>
        </Card>
      ) : (
        devices.map((d) => (
          <Card
            key={d.deviceId}
            className="gap-3 px-5 py-4"
            data-testid={`my-device-${d.deviceCode}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-mono font-semibold">{d.deviceCode}</span>
                <span className="text-muted-foreground text-xs">
                  {[d.model, d.deviceType].filter(Boolean).join(" · ") ||
                    "Thiết bị theo dõi"}{" "}
                  — {d.customerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ConnectivityBadge connectivity={d.connectivity} />
                <BatteryLevel level={d.batteryLevel} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Nhận thiết bị</dt>
              <dd>{formatDateTime(d.assignedAt)}</dd>
              <dt className="text-muted-foreground">Đồng bộ gần nhất</dt>
              <dd>{d.lastSyncAt ? formatDateTime(d.lastSyncAt) : "Chưa có"}</dd>
              <dt className="text-muted-foreground">Ghép điện thoại</dt>
              <dd>
                {d.pairedWithMe
                  ? `Đã ghép · ${formatDateTime(d.pairedAt)}`
                  : d.pairedAt
                  ? "Đã ghép với máy khác"
                  : "Chưa ghép"}
              </dd>
            </dl>
            <div>
              {d.pairedWithMe ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() =>
                    send(
                      `${API_URL}/my_devices/${d.deviceCode}/pair`,
                      "delete",
                      {},
                      "Đã huỷ ghép thiết bị"
                    )
                  }
                >
                  <Link2OffIcon />
                  Huỷ ghép
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() =>
                    send(
                      `${API_URL}/my_devices/pair`,
                      "post",
                      { deviceCode: d.deviceCode },
                      "Đã ghép thiết bị"
                    )
                  }
                >
                  <BluetoothIcon />
                  Ghép với tài khoản này
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      <Card className="gap-2 px-5 py-4">
        <Label htmlFor="pair-code">Ghép bằng mã in trên thiết bị</Label>
        <p className="text-muted-foreground text-xs">
          Trên app điện thoại, việc ghép diễn ra tự động qua Bluetooth.
        </p>
        <div className="flex gap-2">
          <Input
            id="pair-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="VD: VC-BAND-01"
            className="font-mono"
          />
          <Button
            disabled={!code.trim() || mutation.isPending}
            onClick={() =>
              send(
                `${API_URL}/my_devices/pair`,
                "post",
                { deviceCode: code.trim() },
                "Đã ghép thiết bị"
              )
            }
          >
            Ghép
          </Button>
        </div>
      </Card>
    </div>
  );
};
