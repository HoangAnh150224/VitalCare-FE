/** BF-07 Result Return Schedule (`/api/result_returns`, `/api/my_result_returns`). */
export type ResultReturn = {
  id: number;
  appointmentId: number;
  customerId: number;
  customerName: string;
  scheduledAt: string;
  note: string | null;
  status: ReturnStatus;
  arrivedAt: string | null;
  missedAt: string | null;
};

export type ReturnStatus = "SCHEDULED" | "ARRIVED" | "MISSED" | "CANCELLED";

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  SCHEDULED: "Đã hẹn",
  ARRIVED: "Đã đến nhận",
  MISSED: "Lỡ hẹn",
  CANCELLED: "Đã huỷ",
};

export const RETURN_STATUS_VARIANTS: Record<ReturnStatus, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "default",
  ARRIVED: "secondary",
  MISSED: "destructive",
  CANCELLED: "outline",
};

/** FE-07 Patient Feedback (`/api/feedback`, `/api/my_feedback`). */
export type PatientFeedback = {
  id: number;
  appointmentId: number;
  appointmentDate: string;
  customerId: number;
  customerName: string;
  doctorName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string | null;
};

/** FE-17 Professional License & Certificate (`/api/my_licenses`, `/api/licenses`). */
export type License = {
  id: number;
  employeeId: number;
  holderName: string | null;
  kind: LicenseKind;
  title: string;
  licenseNumber: string;
  issuer: string;
  issuedOn: string;
  expiresOn: string | null;
  validity: Validity;
  hasFile: boolean;
  fileName: string | null;
};

export type LicenseKind = "LICENSE" | "CERTIFICATE";
export type Validity = "VALID" | "EXPIRING" | "EXPIRED";

export const LICENSE_KIND_LABELS: Record<LicenseKind, string> = {
  LICENSE: "Chứng chỉ hành nghề",
  CERTIFICATE: "Chứng nhận / chứng chỉ",
};

export const VALIDITY_LABELS: Record<Validity, string> = {
  VALID: "Còn hiệu lực",
  EXPIRING: "Sắp hết hạn",
  EXPIRED: "Hết hạn",
};

export const VALIDITY_VARIANTS: Record<Validity, "secondary" | "default" | "destructive"> = {
  VALID: "secondary",
  EXPIRING: "default",
  EXPIRED: "destructive",
};

/** The server's refusals for this part, in the patient's or staff's language. */
export function resultsErrorText(body: unknown): string {
  const text = JSON.stringify(body ?? "");
  if (/already closed/.test(text)) return "Lịch hẹn này đã đóng.";
  if (/already came/.test(text)) return "Bệnh nhân đã đến nhận kết quả.";
  if (/already has a return/.test(text)) return "Lượt khám này đã có lịch hẹn; hãy đặt lại lịch thay vì hẹn mới.";
  if (/visit that was examined/.test(text)) return "Chỉ hẹn trả kết quả cho lượt khám đã khám xong.";
  if (/before the consultation/.test(text)) return "Hoàn tất lần khám trước khi ghi kết luận tư vấn.";
  if (/already gave feedback/.test(text)) return "Bạn đã góp ý cho lượt khám này; hãy sửa góp ý cũ.";
  if (/completed visit/.test(text)) return "Chỉ góp ý được cho lượt khám đã hoàn tất.";
  if (/Rate from 1 to 5/.test(text)) return "Chọn số sao từ 1 đến 5.";
  if (/issued in the future/.test(text)) return "Ngày cấp không được ở tương lai.";
  if (/in the future/.test(text)) return "Chọn thời điểm trong tương lai.";
  if (/expire after/.test(text)) return "Ngày hết hạn phải sau ngày cấp.";
  if (/Only PDF, PNG or JPEG/.test(text)) return "Chỉ nhận file PDF, PNG hoặc JPEG.";
  if (/10 MB/.test(text)) return "File tối đa 10 MB.";
  if (/final conclusion/.test(text)) return "Hãy nhập kết luận cuối cùng.";
  if (/Enter|Name it|Choose/.test(text)) return "Điền đủ các trường bắt buộc.";
  return "Không lưu được. Thử lại sau.";
}
