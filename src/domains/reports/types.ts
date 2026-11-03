/** BF-10 `GET /api/monitoring_dashboard`. */
export type MonitoringDashboard = {
  clinicId: string | null;
  generatedAt: string;
  monitoredPatients: number;
  devices: { total: number; online: number; offline: number; assigned: number; available: number; lowBattery: number };
  alerts: { openCritical: number; openWarning: number; acknowledged: number; raisedToday: number };
  appointmentsToday: {
    total: number;
    scheduled: number;
    awaitingPayment: number;
    waiting: number;
    inExam: number;
    awaitingResults: number;
    completed: number;
    cancelled: number;
  };
  sync: { openFailures: number; batchesToday: number; rejectedToday: number; lastSyncAt: string | null };
  intake: { lastHour: number; lastDay: number; invalidLastDay: number; lastReadingAt: string | null };
  alertsByDay: { date: string; critical: number; warning: number }[];
  recentCritical: {
    id: number;
    customerId: number;
    customerName: string;
    metric: string;
    measuredValue: number | null;
    status: string;
    triggeredAt: string;
  }[];
};

export type ReportKind = "patients" | "devices" | "vitals" | "alerts";

/** BF-08 `GET /api/reports/{kind}`: a summary and one row per patient, device or day. */
export type SummaryReport = {
  kind: ReportKind;
  clinicId: string | null;
  from: string;
  to: string;
  summary: Record<string, unknown>;
  rows: Record<string, unknown>[];
};

export type Format = "text" | "number" | "date" | "datetime" | "yesno" | "status";

export type Column = { key: string; label: string; format?: Format };

export type ReportSpec = {
  kind: ReportKind;
  label: string;
  description: string;
  figures: { key: string; label: string }[];
  columns: Column[];
};

export const REPORTS: ReportSpec[] = [
  {
    kind: "patients",
    label: "Bệnh nhân",
    description: "Bệnh nhân có lượt khám hoặc đeo thiết bị của cơ sở trong khoảng ngày.",
    figures: [
      { key: "patients", label: "Bệnh nhân" },
      { key: "newPatients", label: "Bệnh nhân mới" },
      { key: "monitored", label: "Đang theo dõi" },
      { key: "visits", label: "Lượt khám hoàn tất" },
    ],
    columns: [
      { key: "customerCode", label: "Mã BN" },
      { key: "fullName", label: "Họ tên" },
      { key: "dateOfBirth", label: "Ngày sinh", format: "date" },
      { key: "visits", label: "Lượt khám", format: "number" },
      { key: "lastVisit", label: "Khám gần nhất", format: "date" },
      { key: "monitored", label: "Đang theo dõi", format: "yesno" },
      { key: "readings", label: "Số đo", format: "number" },
      { key: "alerts", label: "Cảnh báo", format: "number" },
      { key: "criticalAlerts", label: "Nguy hiểm", format: "number" },
    ],
  },
  {
    kind: "devices",
    label: "Thiết bị",
    description: "Mọi thiết bị của cơ sở; số đo và lần đồng bộ tính trong khoảng ngày.",
    figures: [
      { key: "devices", label: "Thiết bị" },
      { key: "assigned", label: "Đang giao" },
      { key: "online", label: "Trực tuyến" },
      { key: "lowBattery", label: "Pin yếu" },
      { key: "readings", label: "Số đo" },
      { key: "syncFailures", label: "Bản ghi lỗi" },
    ],
    columns: [
      { key: "deviceCode", label: "Mã thiết bị" },
      { key: "model", label: "Model" },
      { key: "status", label: "Trạng thái", format: "status" },
      { key: "connectivity", label: "Kết nối", format: "status" },
      { key: "batteryLevel", label: "Pin (%)", format: "number" },
      { key: "wornBy", label: "Người đeo" },
      { key: "lastSyncAt", label: "Đồng bộ gần nhất", format: "datetime" },
      { key: "readings", label: "Số đo", format: "number" },
      { key: "syncs", label: "Lần đồng bộ", format: "number" },
      { key: "syncFailures", label: "Bản ghi lỗi", format: "number" },
    ],
  },
  {
    kind: "vitals",
    label: "Sinh hiệu",
    description: "Số đo nhận trong khoảng ngày, theo bệnh nhân; khoảng giá trị tính trên số đo hợp lệ.",
    figures: [
      { key: "readings", label: "Số đo" },
      { key: "invalid", label: "Không hợp lệ" },
      { key: "patients", label: "Bệnh nhân" },
      { key: "devices", label: "Thiết bị" },
    ],
    columns: [
      { key: "customerCode", label: "Mã BN" },
      { key: "fullName", label: "Họ tên" },
      { key: "readings", label: "Số đo", format: "number" },
      { key: "invalid", label: "Không hợp lệ", format: "number" },
      { key: "avgHeartRate", label: "Nhịp tim TB", format: "number" },
      { key: "minHeartRate", label: "Nhịp tim thấp nhất", format: "number" },
      { key: "maxHeartRate", label: "Nhịp tim cao nhất", format: "number" },
      { key: "avgSpo2", label: "SpO₂ TB (%)", format: "number" },
      { key: "minSpo2", label: "SpO₂ thấp nhất (%)", format: "number" },
      { key: "maxTemperature", label: "Nhiệt độ cao nhất (°C)", format: "number" },
      { key: "maxSystolicBp", label: "HA tâm thu cao nhất", format: "number" },
      { key: "lastAt", label: "Số đo gần nhất", format: "datetime" },
    ],
  },
  {
    kind: "alerts",
    label: "Cảnh báo",
    description: "Cảnh báo phát sinh trong khoảng ngày, theo ngày, và thời gian đến khi được tiếp nhận.",
    figures: [
      { key: "alerts", label: "Cảnh báo" },
      { key: "critical", label: "Nguy hiểm" },
      { key: "warning", label: "Cảnh giác" },
      { key: "stillOpen", label: "Còn mở" },
      { key: "avgMinutesToAcknowledge", label: "Phút đến khi tiếp nhận (TB)" },
    ],
    columns: [
      { key: "date", label: "Ngày", format: "date" },
      { key: "alerts", label: "Tổng", format: "number" },
      { key: "critical", label: "Nguy hiểm", format: "number" },
      { key: "warning", label: "Cảnh giác", format: "number" },
      { key: "resolved", label: "Đã xử lý", format: "number" },
      { key: "dismissed", label: "Bỏ qua", format: "number" },
      { key: "stillOpen", label: "Còn mở", format: "number" },
      { key: "avgMinutesToAcknowledge", label: "Phút đến khi tiếp nhận (TB)", format: "number" },
    ],
  },
];

const STATUS_WORDS: Record<string, string> = {
  ASSIGNED: "Đang giao",
  AVAILABLE: "Sẵn sàng",
  MAINTENANCE: "Bảo trì",
  RETIRED: "Ngừng dùng",
  LOST: "Thất lạc",
  ONLINE: "Trực tuyến",
  OFFLINE: "Mất kết nối",
};

/** One cell as the table and the CSV show it. */
export function cellText(value: unknown, format: Format = "text"): string {
  if (value === null || value === undefined || value === "") return "";
  switch (format) {
    case "number":
      return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
    case "date":
      return String(value).slice(0, 10).split("-").reverse().join("/");
    case "datetime":
      return new Date(String(value)).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    case "yesno":
      return value ? "Có" : "Không";
    case "status":
      return STATUS_WORDS[String(value)] ?? String(value);
    default:
      return String(value);
  }
}

/**
 * One cell as the CSV carries it: numbers plain (`1234.5`, which a spreadsheet
 * reads as a number, unlike the page's "1.234,5"), dates ISO, and text that a
 * spreadsheet would run as a formula (`=`, `+`, `-`, `@`) defused with a quote.
 */
export function csvCell(value: unknown, format: Format = "text"): string {
  if (value === null || value === undefined || value === "") return "";
  switch (format) {
    case "number":
      return String(value);
    case "date":
      return String(value).slice(0, 10);
    case "datetime":
      return new Date(String(value)).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 16);
    case "yesno":
    case "status":
      return cellText(value, format);
    default: {
      const text = String(value);
      return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    }
  }
}

/** Today, or `days` from it, in Vietnam, as `YYYY-MM-DD`. */
export function vnDay(days = 0): string {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function reportErrorText(body: unknown): string {
  const text = JSON.stringify(body ?? "");
  if (/has no clinic/.test(text)) return "Tài khoản của bạn chưa gắn với cơ sở nào.";
  if (/before the start/.test(text)) return "Ngày bắt đầu phải trước ngày kết thúc.";
  if (/at most a year/.test(text)) return "Báo cáo tối đa một năm.";
  return "Không tải được báo cáo. Thử lại sau.";
}
