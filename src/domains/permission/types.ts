/**
 * The `permissions` resource as the API reports it — `PermissionResponse` on
 * the backend.
 *
 * The catalogue lives here rather than in `domains/role/` because roles are one
 * consumer of it and not its owner: `role/types.ts` re-exports what it needs
 * from this file. The direction matters — a permission means something without
 * any role granting it, a role's grants do not exist without the catalogue.
 */

export type Permission = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  /**
   * True for a code that arrived in a migration alongside the `@PreAuthorize`
   * that checks it, as opposed to one added afterwards. The mirror of
   * `Role.systemRole` — but nothing refuses an edit on the strength of it yet,
   * because the catalogue is read-only over the API in the first place.
   */
  systemPermission: boolean;
};

/** The three actions every `resource:action` code ends in. */
export const PERMISSION_ACTIONS = ["read", "write", "delete"] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/**
 * Splits `resource:action` into its halves so the permission picker can group
 * by resource. Anything without a colon becomes its own group rather than being
 * dropped — a permission the UI cannot categorise is still one an admin needs
 * to be able to grant.
 */
export function splitPermissionCode(code: string): {
  resource: string;
  action: string;
} {
  const separator = code.indexOf(":");
  if (separator === -1) {
    return { resource: code, action: code };
  }
  return {
    resource: code.slice(0, separator),
    action: code.slice(separator + 1),
  };
}

/** Display names for the known resources; anything else falls back to a humanized code. */
const RESOURCE_LABELS: Record<string, string> = {
  users: "Người dùng",
  roles: "Vai trò",
  permissions: "Quyền",
  tasks: "Công việc",
  blog_posts: "Bài viết",
  categories: "Danh mục",
  organizations: "Tổ chức",
  departments: "Phòng ban",
  row_level_policies: "Phạm vi dữ liệu",
  notifications: "Thông báo",
  device_syncs: "Lịch sử đồng bộ",
  sync_failures: "Bản ghi đồng bộ lỗi",
  my_devices: "Thiết bị của tôi",
  vital_signs: "Sinh hiệu",
  my_vital_signs: "Sức khỏe của tôi",
  alerts: "Cảnh báo",
  alert_rules: "Quy tắc cảnh báo",
  my_alerts: "Cảnh báo của tôi",
  monitoring_orders: "Chỉ định theo dõi",
  my_sharing: "Chia sẻ",
  shared_patients: "Người tôi chăm sóc",
  emergency_alerts: "Cảnh báo khẩn",
  escalations: "Nhật ký gọi khẩn",
  result_returns: "Hẹn trả kết quả",
  my_result_returns: "Hẹn nhận kết quả của tôi",
  feedback: "Góp ý của bệnh nhân",
  my_feedback: "Góp ý của tôi",
  my_licenses: "Giấy phép của tôi",
  licenses: "Giấy phép nhân viên",
  monitoring_dashboard: "Tổng quan theo dõi",
  reports: "Báo cáo tổng hợp",
  staff_memberships: "Thành viên phòng khám",
  clinic_roles: "Vai trò tại phòng khám",
  employees: "Nhân viên",
  customers: "Khách hàng",
  appointments: "Đăng ký khám",
  devices: "Thiết bị",
  clinics: "Cơ sở",
  clinical_encounters: "Lần khám",
  medical_records: "Hồ sơ bệnh án",
  doctor_schedules: "Lịch bác sĩ",
  monitoring_assignments: "Phân công theo dõi",
  my_profiles: "Hồ sơ cá nhân",
  first_aid_articles: "Nội dung sơ cứu",
  conversations: "Tin nhắn hỗ trợ",
  my_conversations: "Tin nhắn của tôi",
  audit_logs: "Nhật ký hoạt động",
};

/** `blog_posts` reads better as "Blog posts" in a group heading. */
export function humanizeResource(resource: string): string {
  const known = RESOURCE_LABELS[resource];
  if (known) return known;
  const spaced = resource.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
