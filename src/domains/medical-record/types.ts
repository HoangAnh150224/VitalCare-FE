/**
 * A patient's health background (`GET /customers/{id}/medical-record`). Every
 * field is null for a patient nobody has written a record for yet.
 */
export type MedicalRecord = {
  customerId: number;
  bloodType: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  familyHistory: string | null;
  currentMedications: string | null;
  note: string | null;
  /** Sent back on save so an edit over somebody else's is refused; null when there is no record yet. */
  version: number | null;
  updatedAt: string | null;
};

/** The editable fields, in the order the panel shows them. */
export const MEDICAL_RECORD_FIELDS: {
  name: keyof MedicalRecordValues;
  label: string;
  rows: number;
  /** The API's own limit for the field. */
  max: number;
}[] = [
  { name: "bloodType", label: "Nhóm máu", rows: 1, max: 32 },
  { name: "allergies", label: "Dị ứng", rows: 2, max: 5000 },
  { name: "medicalHistory", label: "Tiền sử bệnh", rows: 3, max: 10000 },
  { name: "familyHistory", label: "Tiền sử gia đình", rows: 2, max: 10000 },
  { name: "currentMedications", label: "Thuốc đang dùng", rows: 2, max: 5000 },
  // The running "ghi chú theo dõi" is a list of signed notes of its own now (SRS 3.9.3).
  { name: "note", label: "Ghi chú khác", rows: 3, max: 10000 },
];

export type MedicalRecordValues = Record<
  "bloodType" | "allergies" | "medicalHistory" | "familyHistory" | "currentMedications" | "note",
  string
>;
