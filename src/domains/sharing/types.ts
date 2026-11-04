/** BF-04 monitoring orders and BF-06 sharing, as the API returns them. */

export type MonitoringOrder = {
  id: number;
  customerId: number;
  customerName: string;
  encounterId: number | null;
  reason: string;
  decision: "ACCEPTED" | "DECLINED";
  consentNote: string | null;
  status: "ACTIVE" | "DECLINED" | "ENDED";
  decidedAt: string;
  orderedByName: string | null;
  endedAt: string | null;
  endNote: string | null;
};

export const ORDER_STATUS_LABELS: Record<MonitoringOrder["status"], string> = {
  ACTIVE: "Đang theo dõi (đã đồng ý)",
  DECLINED: "Bệnh nhân từ chối",
  ENDED: "Đã kết thúc",
};
export const ORDER_STATUS_VARIANTS = {
  ACTIVE: "success",
  DECLINED: "neutral",
  ENDED: "secondary",
} as const;

export type SharingPermission = {
  id: number;
  customerId: number;
  customerName: string;
  caregiverUserId: number;
  caregiverName: string;
  caregiverPhone: string;
  shareVitals: boolean;
  shareAlerts: boolean;
  shareAppointments: boolean;
  emergencyPhone: string;
  expiresAt: string | null;
  note: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  createdAt: string | null;
  revokedAt: string | null;
};

export const SHARING_STATUS_LABELS: Record<
  SharingPermission["status"],
  string
> = {
  ACTIVE: "Đang chia sẻ",
  EXPIRED: "Hết hạn",
  REVOKED: "Đã thu hồi",
};
export const SHARING_STATUS_VARIANTS = {
  ACTIVE: "success",
  EXPIRED: "neutral",
  REVOKED: "secondary",
} as const;

export type SharedPatient = {
  permissionId: number;
  customerId: number;
  customerCode: string;
  fullName: string;
  shareVitals: boolean;
  shareAlerts: boolean;
  shareAppointments: boolean;
  expiresAt: string | null;
};

export type EscalationCall = {
  id: number;
  channel: "CALL" | "SMS";
  phone: string;
  outcome: string;
  detail: string | null;
  placedAt: string;
};

export type EmergencyNotice = {
  id: number;
  alertId: number;
  severity: string;
  message: string;
  customerId: number;
  patientName: string;
  emergencyPhone: string | null;
  status: "PENDING" | "ACKNOWLEDGED" | "ESCALATED";
  notifiedAt: string;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
  calls: EscalationCall[];
};

export const NOTICE_STATUS_LABELS: Record<EmergencyNotice["status"], string> = {
  PENDING: "Chờ xác nhận",
  ACKNOWLEDGED: "Đã xác nhận",
  ESCALATED: "Đã gọi khẩn",
};

export function sharedParts(p: {
  shareVitals: boolean;
  shareAlerts: boolean;
  shareAppointments: boolean;
}) {
  return [
    p.shareVitals && "Sinh hiệu",
    p.shareAlerts && "Cảnh báo",
    p.shareAppointments && "Lượt khám",
  ]
    .filter(Boolean)
    .join(", ");
}

export const CALL_LABELS: Record<EscalationCall["channel"], string> = {
  CALL: "Cuộc gọi",
  SMS: "Tin nhắn SMS",
};
