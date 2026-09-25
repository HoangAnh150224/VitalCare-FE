import type { I18nProvider } from "@refinedev/core";

/**
 * Vietnamese text for the strings Refine's own hooks produce — the success and
 * error toasts, the undo countdown, the core button labels.
 *
 * Screens in this app carry their own Vietnamese in place; this only covers
 * what Refine builds itself. A key that is not listed falls back to the
 * default Refine passed in, exactly as if there were no provider.
 */
const MESSAGES: Record<string, string> = {
  "notifications.success": "Thành công",
  "notifications.error": "Lỗi (mã trạng thái: {{statusCode}})",
  "notifications.createSuccess": "Đã tạo {{resource}} thành công",
  "notifications.createError":
    "Không thể tạo {{resource}} (mã trạng thái: {{statusCode}})",
  "notifications.editSuccess": "Đã cập nhật {{resource}} thành công",
  "notifications.editError":
    "Không thể cập nhật {{resource}} (mã trạng thái: {{statusCode}})",
  "notifications.deleteSuccess": "Đã xóa {{resource}} thành công",
  "notifications.deleteError":
    "Không thể xóa {{resource}} (mã trạng thái: {{statusCode}})",
  "notifications.undoable": "Bạn có {{seconds}} giây để hoàn tác",

  "buttons.create": "Tạo mới",
  "buttons.edit": "Chỉnh sửa",
  "buttons.show": "Chi tiết",
  "buttons.list": "Danh sách",
  "buttons.save": "Lưu",
  "buttons.clone": "Nhân bản",
  "buttons.delete": "Xóa",
  "buttons.refresh": "Làm mới",
  "buttons.confirm": "Bạn có chắc chắn không?",
  "buttons.cancel": "Hủy",
  "buttons.undo": "Hoàn tác",

  // Refine writes the resource into those sentences as `<identifier>.<identifier>`.
  "users.users": "người dùng",
  "roles.roles": "vai trò",
  "permissions.permissions": "quyền",
  "row_level_policies.row_level_policies": "chính sách phạm vi dữ liệu",
  "tasks.tasks": "công việc",
  "blog_posts.blog_posts": "bài viết",
  "categories.categories": "danh mục",
  "organizations.organizations": "tổ chức",
  "departments.departments": "phòng ban",
  "notifications.notifications": "thông báo",
};

function interpolate(text: string, values: unknown): string {
  const params = (typeof values === "object" && values) || {};
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String((params as Record<string, unknown>)[name] ?? "")
  );
}

export const i18nProvider: I18nProvider = {
  translate: (key, options, defaultMessage) => {
    const message = MESSAGES[key];
    if (message === undefined) {
      return defaultMessage ?? (typeof options === "string" ? options : key);
    }
    return interpolate(message, options);
  },
  changeLocale: async () => undefined,
  getLocale: () => "vi",
};
