/**
 * Medical services, their orders and results (Report 1 FE-22), and the bill
 * a visit ends with (FE-23). Money arrives as whole đồng.
 */

export type ServiceCategory = "consultation" | "lab" | "imaging" | "procedure";
export type ServiceStatus = "active" | "inactive";

/** A catalogue entry as `GET /medical_services` returns it. One catalogue for every clinic. */
export type MedicalService = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: number;
  category: ServiceCategory;
  /** Minutes from ordering until the result is expected. */
  turnaroundMinutes: number;
  status: ServiceStatus;
};

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  consultation: "Khám bệnh",
  lab: "Xét nghiệm",
  imaging: "Chẩn đoán hình ảnh",
  procedure: "Thủ thuật",
};

export const SERVICE_CATEGORY_OPTIONS = (Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map((value) => ({
  value,
  label: SERVICE_CATEGORY_LABELS[value],
}));

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: "Đang áp dụng",
  inactive: "Ngừng áp dụng",
};

export type ServiceOrderStatus = "ordered" | "in_progress" | "result_ready" | "reviewed" | "cancelled";

/** A service ordered in an encounter, as `GET /service_orders` returns it. */
export type ServiceOrder = {
  id: number;
  encounterId: number;
  patient: { id: number; customerCode: string; fullName: string };
  service: { id: number; code: string; name: string; category: ServiceCategory };
  unitPrice: number;
  instruction: string | null;
  status: ServiceOrderStatus;
  orderedAt: string;
  orderedBy: string | null;
  expectedResultAt: string | null;
  performedBy: string | null;
  startedAt: string | null;
  resultText: string | null;
  resultAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  /** Empty on a list row; a single order carries its files. */
  files: { id: number; name: string; contentType: string; sizeBytes: number; uploadedAt: string }[];
  _can?: Record<string, boolean>;
};

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  ordered: "Đã chỉ định",
  in_progress: "Đang thực hiện",
  result_ready: "Có kết quả",
  reviewed: "Bác sĩ đã xem",
  cancelled: "Đã huỷ",
};

export const SERVICE_ORDER_STATUS_OPTIONS = (Object.keys(SERVICE_ORDER_STATUS_LABELS) as ServiceOrderStatus[]).map(
  (value) => ({ value, label: SERVICE_ORDER_STATUS_LABELS[value] }),
);

/** Still waiting on somebody: the encounter cannot be concluded while one of these is open. */
export const isOrderOutstanding = (order: Pick<ServiceOrder, "status">) =>
  order.status === "ordered" || order.status === "in_progress" || order.status === "result_ready";

/** What a result's file may be; the API checks the content too. */
export const RESULT_FILE_ACCEPT = "application/pdf,image/png,image/jpeg";
export const RESULT_FILE_MAX_BYTES = 10 * 1024 * 1024;

export type InvoiceStatus = "unpaid" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "vnpay";
export type PaymentStatus = "pending" | "paid" | "failed";

/** A bill as `GET /invoices` returns it: one per concluded encounter. */
export type Invoice = {
  id: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  patient: { id: number; customerCode: string; fullName: string; phone: string | null };
  clinic: { id: string; name: string } | null;
  appointmentId: number | null;
  encounterId: number | null;
  issuedAt: string;
  paidAt: string | null;
  subtotal: number;
  totalAmount: number;
  items: { description: string; category: ServiceCategory | null; quantity: number; unitPrice: number; amount: number }[];
  payments: {
    id: number;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    transactionCode: string;
    paidAt: string | null;
    createdAt: string;
  }[];
  _can?: Record<string, boolean>;
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  cancelled: "Đã huỷ",
};

export const INVOICE_STATUS_OPTIONS = (Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((value) => ({
  value,
  label: INVOICE_STATUS_LABELS[value],
}));

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  bank_transfer: "Chuyển khoản",
  vnpay: "VNPay",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Đang chờ",
  paid: "Thành công",
  failed: "Thất bại",
};

/** `GET /my_appointments/{id}/invoice`: the bill, and whether it can be paid online. */
export type OwnInvoice = { invoice: Invoice; onlinePayment: boolean };

/** One day of `GET /invoices/report`, or the period's total (date null). */
export type RevenueDay = {
  date: string | null;
  invoices: number;
  paidInvoices: number;
  consultationRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
  unpaidInvoices: number;
  unpaidAmount: number;
};

export type RevenueReport = { clinicId: string; from: string; to: string; total: RevenueDay; days: RevenueDay[] };
