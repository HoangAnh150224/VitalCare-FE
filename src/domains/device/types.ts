/** A monitoring device as `GET /devices` returns it (`DeviceResponse`). */
export type Device = {
  id: number;
  deviceCode: string;
  serialNumber: string | null;
  deviceType: string | null;
  manufacturer: string | null;
  model: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  registeredAt: string | null;
  /** Who is wearing it now, if anybody. */
  currentPatient: {
    customerId: number;
    customerCode: string;
    fullName: string;
    since: string;
  } | null;
};

/** `assigned` is set and cleared only by handing a device out and taking it back. */
export type DeviceStatus = "available" | "assigned" | "maintenance" | "retired";

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  available: "Sẵn sàng",
  assigned: "Đang gán",
  maintenance: "Bảo trì",
  retired: "Ngừng sử dụng",
};

export const DEVICE_STATUS_OPTIONS: { label: string; value: DeviceStatus }[] = [
  { label: "Sẵn sàng", value: "available" },
  { label: "Đang gán", value: "assigned" },
  { label: "Bảo trì", value: "maintenance" },
  { label: "Ngừng sử dụng", value: "retired" },
];

/** The statuses a person may set by hand on the edit screen. */
export const SETTABLE_DEVICE_STATUS_OPTIONS = DEVICE_STATUS_OPTIONS.filter(
  (option) => option.value !== "assigned"
);
