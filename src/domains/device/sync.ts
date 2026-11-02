/** One upload from a device, as `GET /device_syncs` returns it (FE-06). */
export type SyncBatch = {
  id: number;
  deviceId: number | null;
  deviceCode: string | null;
  clinicId: string | null;
  customerId: number | null;
  customerName: string | null;
  clientBatchId: string | null;
  source: SyncSource;
  receivedAt: string;
  recordCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  /** What the device said it still holds offline after this upload. */
  pendingOnDevice: number | null;
  status: SyncStatus;
  error: string | null;
};

/** A reading an upload refused, as `GET /sync_failures` returns it. */
export type SyncFailure = {
  id: number;
  batchId: number;
  deviceId: number | null;
  deviceCode: string | null;
  clientRecordId: string | null;
  payload: Record<string, unknown> | null;
  reason: string;
  status: SyncFailureStatus;
  attempts: number;
  lastAttemptAt: string;
  resolvedAt: string | null;
  receivedAt: string;
};

/** What `POST .../readings`, `/device_data/batch` and the simulator answer. */
export type SyncResult = {
  batchId: number;
  status: SyncStatus;
  accepted: number;
  duplicates: number;
  invalid: number;
  rejected: number;
  records: {
    clientRecordId: string | null;
    outcome: string;
    reason: string | null;
    vitalId: number | null;
  }[];
};

export type SyncStatus = "SUCCESS" | "PARTIAL" | "FAILED";
export type SyncSource = "REST" | "MQTT" | "SIMULATOR";
export type SyncFailureStatus = "OPEN" | "RESOLVED" | "DISCARDED";

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  SUCCESS: "Thành công",
  PARTIAL: "Một phần",
  FAILED: "Thất bại",
};

export const SYNC_STATUS_VARIANTS = {
  SUCCESS: "success",
  PARTIAL: "warning",
  FAILED: "destructive",
} as const;

export const SYNC_SOURCE_LABELS: Record<SyncSource, string> = {
  REST: "REST (điện thoại)",
  MQTT: "MQTT (thiết bị)",
  SIMULATOR: "Giả lập",
};

export const SYNC_FAILURE_STATUS_LABELS: Record<SyncFailureStatus, string> = {
  OPEN: "Chờ xử lý",
  RESOLVED: "Đã nhận lại",
  DISCARDED: "Đã bỏ qua",
};

export const SYNC_FAILURE_STATUS_VARIANTS = {
  OPEN: "warning",
  RESOLVED: "success",
  DISCARDED: "neutral",
} as const;

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
export const SYNC_STATUS_OPTIONS = options(SYNC_STATUS_LABELS);
export const SYNC_SOURCE_OPTIONS = options(SYNC_SOURCE_LABELS);
export const SYNC_FAILURE_STATUS_OPTIONS = options(SYNC_FAILURE_STATUS_LABELS);
