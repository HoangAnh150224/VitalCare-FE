/** One row of `GET /audit_logs` (FE-20). */
export type AuditEntry = {
  id: number;
  actorId: number | null;
  actorName: string | null;
  entityType: string;
  entityId: number | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurredAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  view: "Xem",
  update: "Cập nhật",
  role_change: "Đổi vai trò",
  status_change: "Đổi trạng thái",
  membership_end: "Kết thúc thành viên",
  transfer: "Chuyển cơ sở",
  password_reset: "Đặt lại mật khẩu",
  delete: "Xoá",
  assign: "Cấp / gán",
  return: "Thu hồi",
  pay: "Thu tiền",
  create: "Tạo mới",
  consent: "Đồng ý theo dõi",
  end: "Kết thúc",
  export: "Xuất dữ liệu",
  consult: "Tư vấn",
  schedule: "Hẹn lịch",
  reschedule: "Đổi lịch hẹn",
  arrive: "Đã đến",
  acknowledge: "Xác nhận",
  grant: "Cấp quyền",
  revoke: "Thu hồi quyền",
  reply: "Phản hồi",
  // First-aid content through its editorial life (KAN-133).
  submit: "Gửi duyệt",
  approve: "Duyệt",
  reject: "Trả lại",
  publish: "Xuất bản",
  pause: "Tạm ngưng",
  resume: "Mở lại",
  archive: "Lưu trữ",
};

/**
 * Which record a row is about, for the "Dữ liệu" column: the numeric id, or —
 * for a record keyed by a UUID (clinics), which the log's numeric entity id
 * cannot hold — the name or id carried in its state.
 */
export function auditSubject(entry: AuditEntry): string | null {
  if (entry.entityId != null) return `#${entry.entityId}`;
  const state = entry.after ?? entry.before;
  const label = state?.name ?? state?.clinicId;
  return typeof label === "string" && label ? label : null;
}
