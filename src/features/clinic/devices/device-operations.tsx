import {
  useCustomMutation,
  useInvalidate,
  useNotification,
} from "@refinedev/core";
import { CopyIcon, FlaskConicalIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import type { Device } from "@/domains/device/types";
import { SYNC_STATUS_LABELS, type SyncResult } from "@/domains/device/sync";

type Issued = {
  deviceCode: string;
  token: string;
  mqttUsername: string;
  mqttTopic: string;
};

/**
 * Issues the device's secret — what it signs in to MQTT (or REST) with — and
 * shows it this once: only its hash is kept, so a lost one is replaced.
 */
export function DeviceTokenButton({ device }: { device: Device }) {
  const [issued, setIssued] = useState<Issued | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { mutate, mutation } = useCustomMutation<Issued>();
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();

  const issue = () =>
    mutate(
      {
        url: `${API_URL}/devices/${device.id}/token`,
        method: "post",
        values: {},
        successNotification: false,
        config: { headers: { "Content-Type": "application/json" } },
      },
      {
        onSuccess: ({ data }) => {
          setConfirming(false);
          setIssued(data);
          invalidate({
            resource: "devices",
            invalidates: ["detail"],
            id: device.id,
          });
        },
      }
    );
  const copy = (text: string) =>
    void navigator.clipboard
      ?.writeText(text)
      .then(() => notify?.({ type: "success", message: "Đã sao chép" }))
      .catch(() => undefined);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => (device.hasToken ? setConfirming(true) : issue())}
      >
        <KeyRoundIcon />
        {device.hasToken ? "Cấp lại mã bí mật" : "Cấp mã bí mật"}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấp lại mã bí mật?</DialogTitle>
            <DialogDescription>
              Mã cũ sẽ ngừng hoạt động ngay. Thiết bị phải được nạp mã mới mới
              gửi được dữ liệu qua MQTT hoặc REST.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Huỷ
            </Button>
            <Button onClick={issue} disabled={mutation.isPending}>
              Cấp mã mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={issued != null}
        onOpenChange={(open) => !open && setIssued(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mã bí mật của {issued?.deviceCode}</DialogTitle>
            <DialogDescription>
              Chỉ hiện một lần. Hãy nạp vào thiết bị ngay; hệ thống không lưu
              lại mã này.
            </DialogDescription>
          </DialogHeader>
          {issued && (
            <dl className="grid gap-3 text-sm">
              {(
                [
                  ["Mã bí mật (MQTT password, X-Device-Token)", issued.token],
                  ["MQTT username (X-Device-Code)", issued.mqttUsername],
                  ["Topic gửi số đo", issued.mqttTopic],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="flex items-center gap-2">
                    <code
                      className="bg-muted/60 min-w-0 flex-1 rounded px-2 py-1 font-mono text-xs break-all"
                      data-testid={
                        label.startsWith("Mã") ? "device-token" : undefined
                      }
                    >
                      {value}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copy(value)}
                      aria-label="Sao chép"
                    >
                      <CopyIcon />
                    </Button>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <DialogFooter>
            <Button onClick={() => setIssued(null)}>Đã lưu mã</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const SCENARIOS = [
  { value: "NORMAL", label: "Bình thường", hint: "SpO₂ ~97%, nhịp tim ~76" },
  { value: "LOW_SPO2", label: "SpO₂ thấp", hint: "SpO₂ ~88%" },
  { value: "HIGH_HEART_RATE", label: "Nhịp tim nhanh", hint: "~135 lần/phút" },
  { value: "FEVER", label: "Nhiệt độ da cao", hint: "~38,6°C" },
  {
    value: "SENSOR_FAULT",
    label: "Lỗi cảm biến",
    hint: "Giá trị ngoài khoảng đo, lưu là không hợp lệ",
  },
];

/**
 * Feeds the device simulated readings through the real intake (FE-03): to
 * show and test the monitoring chain without the hardware. Only a device on a
 * patient takes readings — the result says which were refused and why.
 */
export function DeviceSimulatorButton({ device }: { device: Device }) {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState("NORMAL");
  const [count, setCount] = useState("5");
  const [result, setResult] = useState<SyncResult | null>(null);
  const { mutate, mutation } = useCustomMutation<SyncResult>();
  const invalidate = useInvalidate();

  const run = () =>
    mutate(
      {
        url: `${API_URL}/devices/${device.id}/simulate`,
        method: "post",
        values: { scenario, count: Number(count) || 5, intervalSeconds: 60 },
        successNotification: false,
        config: { headers: { "Content-Type": "application/json" } },
      },
      {
        onSuccess: ({ data }) => {
          setResult(data);
          invalidate({
            resource: "devices",
            invalidates: ["detail", "list"],
            id: device.id,
          });
          invalidate({ resource: "device_syncs", invalidates: ["all"] });
          invalidate({ resource: "sync_failures", invalidates: ["all"] });
        },
      }
    );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        <FlaskConicalIcon />
        Giả lập dữ liệu
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giả lập dữ liệu cho {device.deviceCode}</DialogTitle>
            <DialogDescription>
              Tạo số đo đi qua đúng đường nạp dữ liệu thật, kết thúc ở thời điểm
              hiện tại: cách nhau 1 phút, hoặc dày hơn để nằm trong thời gian
              bệnh nhân đang đeo thiết bị.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={scenario}
            onValueChange={setScenario}
            className="gap-2"
          >
            {SCENARIOS.map((s) => (
              <Label
                key={s.value}
                className="flex items-start gap-2 rounded-md border p-2 font-normal"
              >
                <RadioGroupItem value={s.value} className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {s.hint}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Label htmlFor="sim-count">Số bản ghi</Label>
            <Input
              id="sim-count"
              type="number"
              min={1}
              max={120}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-24"
            />
          </div>
          {result && (
            <div
              className="bg-muted/40 rounded-md border p-3 text-sm"
              data-testid="simulation-result"
            >
              <p className="font-medium">
                {SYNC_STATUS_LABELS[result.status]}: lưu {result.accepted},
                trùng {result.duplicates}, không hợp lệ {result.invalid}, bị từ
                chối {result.rejected}
              </p>
              {result.records.find((r) => r.reason)?.reason && (
                <p className="text-muted-foreground mt-1">
                  {result.records.find((r) => r.reason)?.reason}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button onClick={run} disabled={mutation.isPending}>
              Gửi dữ liệu giả lập
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
