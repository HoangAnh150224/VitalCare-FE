/**
 * The API's messages for services and billing are English, written for logs
 * as much as for people. The ones staff and patients meet on these screens are
 * said again here in Vietnamese, matched by how they start (a few carry a
 * number). Anything not listed is shown as the API wrote it.
 * Same approach as `translateRegistrationMessage` in `shared/api/registration.ts`.
 */
const MESSAGES: [prefix: string, vi: string | ((message: string) => string)][] = [
  // Payment
  ["This bill is already settled", "Hóa đơn này đã được thanh toán."],
  [
    "The patient started paying online",
    "Bệnh nhân đang thanh toán qua VNPay (trong 15 phút gần đây). Chờ giao dịch xong hoặc hết hạn rồi mới thu tại quầy.",
  ],
  ["Online payment is not set up", "Phòng khám chưa bật thanh toán online. Vui lòng thanh toán tại quầy."],
  ["At the counter: cash or bank transfer", "Tại quầy chỉ nhận tiền mặt hoặc chuyển khoản."],
  ["Pick how it was paid", "Chọn hình thức thanh toán."],
  // Revenue report
  ["The end date is before the start", "Ngày kết thúc phải sau ngày bắt đầu."],
  ["A report covers at most a year", "Báo cáo tối đa một năm."],
  ["The revenue report is a clinic's", "Tài khoản của bạn không thuộc cơ sở nào nên không có báo cáo doanh thu."],
  // Concluding a visit
  [
    "ordered service(s) still have no reviewed result",
    (message) => `Còn ${parseInt(message, 10) || "một số"} dịch vụ chưa có kết quả hoặc bác sĩ chưa xem. Xem hoặc huỷ trước khi hoàn tất.`,
  ],
  ["The catalogue has no active examination fee", "Danh mục chưa có phí khám đang áp dụng. Nhờ quản trị thêm trước khi hoàn tất lần khám."],
  ["This encounter is already completed", "Lần khám này đã hoàn tất."],
  ["Write the diagnosis before concluding", "Ghi chẩn đoán trước khi hoàn tất lần khám."],
  // Ordering and results
  ["This encounter is concluded", "Lần khám đã hoàn tất nên không chỉ định hay thay đổi dịch vụ được nữa."],
  ["That service is no longer offered", "Dịch vụ này đã ngừng áp dụng."],
  ["Pick a service", "Chọn một dịch vụ trong danh mục."],
  ["The examination fee is billed on its own", "Phí khám đã tự tính vào hóa đơn, không cần chỉ định."],
  ["Only an order not yet started can be started", "Chỉ định này đã được bắt đầu."],
  ["Only a result that is in can be reviewed", "Chỉ định chưa có kết quả để xem."],
  ["Only an order without a result can be cancelled", "Chỉ định đã có kết quả nên không huỷ được."],
  ["This order is closed", "Chỉ định đã đóng (bác sĩ đã xem hoặc đã huỷ), không sửa được nữa."],
  ["Say why it is cancelled", "Nhập lý do huỷ."],
  ["Write the result", "Nhập kết quả."],
  ["The result must be at most", "Kết quả quá dài (tối đa 20.000 ký tự)."],
  ["The instruction must be at most", "Ghi chú quá dài (tối đa 1.000 ký tự)."],
  // Files
  ["Choose a file", "Chọn một file."],
  ["A file can be at most 10 MB", "File tối đa 10 MB."],
  ["Only PDF, PNG and JPEG files are accepted", "Chỉ nhận file PDF, PNG hoặc JPEG."],
  ["The file's content does not match its type", "Nội dung file không đúng định dạng của nó."],
  // Catalogue
  ["Another service already has that code", "Mã dịch vụ này đã có."],
  // Shared by every endpoint, and the browser's own when the network drops
  ["Failed to fetch", "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."],
  ["You do not have permission", "Bạn không có quyền thực hiện thao tác này."],
  ["This record was just changed by someone else", "Dữ liệu vừa được người khác thay đổi. Tải lại rồi thử lại."],
];

export function translateBillingMessage(message: string): string {
  for (const [prefix, vi] of MESSAGES) {
    if (message.startsWith(prefix) || (typeof vi === "function" && message.includes(prefix))) {
      return typeof vi === "function" ? vi(message) : vi;
    }
  }
  return message;
}

/**
 * The error as one Vietnamese sentence. A 422's own message is the generic
 * "Validation failed"; the field message under it says what to fix.
 */
export function billingErrorText(error: { message?: string; errors?: Record<string, unknown> } | null | undefined) {
  const field = error?.errors ? Object.values(error.errors).find((value) => typeof value === "string") : undefined;
  const message = (field as string | undefined) ?? error?.message;
  return message ? translateBillingMessage(message) : "Không thực hiện được. Vui lòng thử lại.";
}

/** For `errorNotification` on a mutation: the toast says what went wrong, in Vietnamese. */
export const billingErrorNotification = (error?: { message?: string; errors?: Record<string, unknown> }) => ({
  type: "error" as const,
  message: billingErrorText(error),
});
