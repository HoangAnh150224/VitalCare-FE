/**
 * A customer as `GET /customers` returns it (`CustomerResponse`).
 *
 * Everybody who registers is a customer. They start `neutral` and become a
 * `patient` on an eligible check-in or when staff activate them — never by
 * booking alone, and never back.
 */
export type Customer = {
  id: number;
  customerCode: string;
  status: CustomerStatus;
  userId: number;
  fullName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  patientActivatedAt: string | null;
  patientActivationSource: PatientActivationSource | null;
  createdAt: string;
};

export type CustomerStatus = "neutral" | "patient";

export type PatientActivationSource = "check_in" | "manual";

export type Gender = "male" | "female" | "other";

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  neutral: "Chưa kích hoạt",
  patient: "Bệnh nhân",
};

export const CUSTOMER_STATUS_OPTIONS: { label: string; value: CustomerStatus }[] = [
  { label: "Chưa kích hoạt", value: "neutral" },
  { label: "Bệnh nhân", value: "patient" },
];

export const ACTIVATION_SOURCE_LABELS: Record<PatientActivationSource, string> = {
  check_in: "Check-in lịch hẹn",
  manual: "Nhân viên kích hoạt",
};

export const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: "Nam", value: "male" },
  { label: "Nữ", value: "female" },
  { label: "Khác", value: "other" },
];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};
