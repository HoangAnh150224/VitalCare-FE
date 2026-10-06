import { useState } from "react";
import {
  useCan,
  useCustom,
  useCustomMutation,
  useInvalidate,
  useList,
  useNotification,
  type HttpError,
} from "@refinedev/core";
import { WatchIcon } from "lucide-react";
import { Link } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { formatDate } from "@/shared/lib/format";
import type { Customer } from "@/domains/customer/types";
import type { DeviceAssignment } from "@/domains/assignment/types";
import type { Device } from "@/domains/device/types";

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

/**
 * The device a patient wears: the one on them now with a way to take it back,
 * or a way to hand one out — only devices on the shelf are offered — and the
 * devices they wore before.
 */
export function DevicePanel({ customer }: { customer: Customer }) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { data: access } = useCan({ resource: "customers", action: "assign" });
  const canAssign = access?.can ?? false;
  const isPatient = customer.status === "patient";

  const { result, query } = useCustom<DeviceAssignment[]>({
    url: `${API_URL}/customers/${customer.id}/devices`,
    method: "get",
    queryOptions: { enabled: isPatient },
  });
  const rows = Array.isArray(result?.data) ? result.data : [];
  const current = rows.find((row) => row.status === "active");
  const past = rows.filter((row) => row.status === "ended");

  const { result: available } = useList<Device>({
    resource: "devices",
    filters: [{ field: "status", operator: "eq", value: "available" }],
    pagination: { pageSize: 200 },
    queryOptions: { enabled: isPatient && canAssign && !current },
  });

  const [chosen, setChosen] = useState("");
  const { mutate, mutation } = useCustomMutation<DeviceAssignment>();

  const run = (url: string, values: object, message: string) =>
    mutate(
      { url, method: "post", values, config: JSON_HEADERS, successNotification: false },
      {
        onSuccess: () => {
          setChosen("");
          void query.refetch();
          invalidate({ resource: "devices", invalidates: ["list", "detail"] });
          open?.({ type: "success", message });
        },
        onError: (error: HttpError) =>
          open?.({ type: "error", message: error.message ?? "Không thực hiện được" }),
      }
    );

  return (
    <DetailPanel
      title="Thiết bị theo dõi"
      action={<WatchIcon className="text-muted-foreground size-4" />}
      bodyClassName="p-4"
    >
      {!isPatient ? (
        <p className="text-muted-foreground text-sm">
          Khách hàng chưa là bệnh nhân. Kích hoạt hồ sơ bệnh nhân trước khi gán thiết bị.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {current ? (
            <div className="flex items-center justify-between gap-2 rounded-md border p-3">
              <div className="flex flex-col">
                <Link to={`/devices/show/${current.device?.id}`} className="font-mono text-sm font-medium hover:underline">
                  {current.device?.deviceCode}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {current.device?.model ?? "—"} · đeo từ {formatDate(current.assignedAt)}
                </span>
              </div>
              {canAssign && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() =>
                    run(
                      `${API_URL}/customers/${customer.id}/devices/${current.id}/return`,
                      {},
                      `Đã thu hồi ${current.device?.deviceCode}`
                    )
                  }
                >
                  Thu hồi
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">Bệnh nhân chưa đeo thiết bị nào.</p>
              {canAssign && (
                <div className="flex gap-2">
                  <Select value={chosen} onValueChange={setChosen}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={available?.data?.length ? "Chọn thiết bị sẵn sàng" : "Không còn thiết bị sẵn sàng"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(available?.data ?? []).map((device) => (
                        <SelectItem key={device.id} value={String(device.id)}>
                          {device.deviceCode} · {device.model ?? "—"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!chosen || mutation.isPending}
                    onClick={() =>
                      run(
                        `${API_URL}/customers/${customer.id}/devices`,
                        { deviceId: Number(chosen) },
                        "Đã gán thiết bị cho bệnh nhân"
                      )
                    }
                  >
                    Gán thiết bị
                  </Button>
                </div>
              )}
            </>
          )}

          {past.length > 0 && (
            <details className="text-sm">
              <summary className="text-muted-foreground cursor-pointer">Thiết bị đã dùng ({past.length})</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {past.map((row) => (
                  <li key={row.id} className="text-muted-foreground flex items-center justify-between">
                    <span className="font-mono">{row.device?.deviceCode}</span>
                    <Badge variant="neutral">
                      {formatDate(row.assignedAt)} – {formatDate(row.returnedAt)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </DetailPanel>
  );
}
