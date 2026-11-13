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
};
