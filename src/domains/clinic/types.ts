/** A clinic as `GET /clinics` returns it — the list a booking chooses from. */
export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactPerson: string | null;
  operatingStatus: ClinicStatus | null;
  /** Active staff working there. */
  staffCount: number | null;
};

/** A clinic that has stopped operating takes no new visits. */
export type ClinicStatus = "OPERATING" | "INACTIVE";

export const CLINIC_STATUS_LABELS: Record<ClinicStatus, string> = {
  OPERATING: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
};

/** `GET /clinics/{id}/summary` (SRS 3.18.3). */
export type ClinicSummary = { staff: number; devices: number; patients: number };

/** Weekday names in ISO order, index 0 = Monday. */
export const WEEKDAY_LABELS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
