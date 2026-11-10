/** FE-05: alert rules and alerts as `/alert_rules` and `/alerts` return them. */

export type Metric = "HEART_RATE" | "SPO2" | "SKIN_TEMPERATURE" | "BODY_TEMPERATURE";
export type Operator = "BELOW" | "ABOVE";
export type Severity = "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

export type AlertPatient = {
  id: number;
  customerCode: string;
  fullName: string;
};

export type AlertRule = {
  id: number;
  clinicId: string;
  /** Set on a patient's own rule; null on the clinic's. */
  patient: AlertPatient | null;
  name: string;
  metric: Metric;
  operator: Operator;
  threshold: number;
  severity: Severity;
  enabled: boolean;
  note: string | null;
  updatedAt: string | null;
};

export type Alert = {
  id: number;
  patient: AlertPatient | null;
  clinicId: string | null;
  deviceId: number | null;
  deviceCode: string | null;
  metric: Metric;
  operator: Operator;
  threshold: number;
  measuredValue: number;
  lastValue: number;
  severity: Severity;
  status: AlertStatus;
  message: string;
  occurrences: number;
  triggeredAt: string;
  lastTriggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  dismissedAt: string | null;
  ruleId: number | null;
  ruleName: string | null;
};

export type AlertActionType =
  | "TRIGGERED"
  | "REPEATED"
  | "SEVERITY_RAISED"
  | "ACKNOWLEDGED"
  | "NOTE"
  | "RESOLVED"
  | "DISMISSED"
  | "NOTIFIED"
  | "ESCALATED";

export type AlertActionEntry = {
  id: number;
  action: AlertActionType;
  vitalSignId: number | null;
  value: number | null;
  severity: Severity | null;
  actorId: number | null;
  actorName: string | null;
  note: string | null;
  occurredAt: string;
};

export type AlertDetail = {
  alert: Alert;
  handlingNotes: string | null;
  dismissReason: string | null;
  history: AlertActionEntry[];
};

export type AbnormalReading = {
  actionId: number;
  vitalSignId: number;
  measuredAt: string;
  metric: Metric;
  value: number;
  severity: Severity;
  action: AlertActionType;
  alertId: number;
  alertStatus: AlertStatus;
  patient: AlertPatient | null;
};

export const METRIC_LABELS: Record<Metric, string> = {
  HEART_RATE: "Nhịp tim",
  SPO2: "SpO₂",
  SKIN_TEMPERATURE: "Nhiệt độ da",
  BODY_TEMPERATURE: "Nhiệt độ cơ thể",
};

export const METRIC_UNITS: Record<Metric, string> = {
  HEART_RATE: " bpm",
  SPO2: "%",
  SKIN_TEMPERATURE: " °C",
  BODY_TEMPERATURE: " °C",
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  BELOW: "Dưới",
  ABOVE: "Trên",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  WARNING: "Cảnh báo",
  CRITICAL: "Khẩn cấp",
};
export const SEVERITY_VARIANTS = {
  WARNING: "warning",
  CRITICAL: "destructive",
} as const;

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: "Chưa tiếp nhận",
  ACKNOWLEDGED: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  DISMISSED: "Đã bỏ qua",
};
export const ALERT_STATUS_VARIANTS = {
  OPEN: "destructive",
  ACKNOWLEDGED: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
} as const;

export const ACTION_LABELS: Record<AlertActionType, string> = {
  TRIGGERED: "Phát sinh cảnh báo",
  REPEATED: "Số đo bất thường lặp lại",
  SEVERITY_RAISED: "Tăng mức độ",
  ACKNOWLEDGED: "Tiếp nhận",
  NOTE: "Ghi chú",
  RESOLVED: "Xử lý xong",
  DISMISSED: "Bỏ qua",
  NOTIFIED: "Đã gửi thông báo",
  ESCALATED: "Gọi khẩn",
};

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
export const METRIC_OPTIONS = options(METRIC_LABELS);
export const SEVERITY_OPTIONS = options(SEVERITY_LABELS);
export const OPERATOR_OPTIONS = options(OPERATOR_LABELS);
export const ALERT_STATUS_OPTIONS = [
  { value: "active", label: "Đang mở (chưa xong)" },
  ...options(ALERT_STATUS_LABELS),
];

/** "SpO₂ dưới 90%", from a rule or an alert. */
export function condition(
  metric: Metric,
  operator: Operator,
  threshold: number
) {
  return `${METRIC_LABELS[metric]} ${OPERATOR_LABELS[
    operator
  ].toLowerCase()} ${Number(threshold)}${METRIC_UNITS[metric]}`;
}

export function valueWithUnit(
  metric: Metric,
  value: number | null | undefined
) {
  return value == null ? "—" : `${Number(value)}${METRIC_UNITS[metric]}`;
}
