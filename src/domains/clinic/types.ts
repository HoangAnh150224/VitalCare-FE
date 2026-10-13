/** A clinic as `GET /clinics` returns it — the list a booking chooses from. */
export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  contactPhone: string | null;
  operatingStatus: string | null;
};

/** Weekday names in ISO order, index 0 = Monday. */
export const WEEKDAY_LABELS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
