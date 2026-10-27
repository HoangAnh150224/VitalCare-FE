import type { ServiceOrder } from "@/domains/billing/types";
import type { StaffType } from "@/domains/employee/types";

/** A clinical encounter as `GET /clinical_encounters` returns it (`EncounterResponse`). */
export type Encounter = {
  id: number;
  status: EncounterStatus;
  patient: { id: number; customerCode: string; fullName: string };
  clinician: { id: number; fullName: string; staffType: StaffType } | null;
  clinicId: string | null;
  appointmentId: number | null;
  startedAt: string;
  endedAt: string | null;
  /** Until when a completed encounter can still be edited (24 hours, SRS BR-27); null while in progress. */
  editableUntil: string | null;
  chiefComplaint: string;
  /** What was found on examination (SRS 3.19 "Thông tin khám"). */
  examinationFindings: string | null;
  /** Measured by hand at the visit; null when none were taken. */
  vitals: VisitVitals | null;
  clinicalNote: string | null;
  /** The doctor's: only `clinical_encounters:conclude` may set it. */
  diagnosis: string | null;
  followUp: string | null;
  _can?: Record<string, boolean>;
};

export type EncounterStatus = "in_progress" | "completed";

/** Vital signs taken at the visit (`VisitVitals`). Every one optional. */
export type VisitVitals = {
  temperature: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
};

/** Label, unit and the API's limits for each vital (the same as migration 033's CHECKs). */
export const VITAL_FIELDS: {
  name: keyof VisitVitals;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { name: "temperature", label: "Nhiệt độ", unit: "°C", min: 30, max: 45, step: 0.1 },
  { name: "pulse", label: "Mạch", unit: "lần/phút", min: 20, max: 250, step: 1 },
  { name: "respiratoryRate", label: "Nhịp thở", unit: "lần/phút", min: 4, max: 80, step: 1 },
  { name: "systolicBp", label: "Huyết áp tâm thu", unit: "mmHg", min: 50, max: 260, step: 1 },
  { name: "diastolicBp", label: "Huyết áp tâm trương", unit: "mmHg", min: 20, max: 200, step: 1 },
  { name: "spo2", label: "SpO₂", unit: "%", min: 50, max: 100, step: 1 },
  { name: "weightKg", label: "Cân nặng", unit: "kg", min: 0.5, max: 400, step: 0.1 },
  { name: "heightCm", label: "Chiều cao", unit: "cm", min: 30, max: 250, step: 0.1 },
];

/** Body mass index from weight and height, one decimal; null unless both were measured. */
export function bodyMassIndex(vitals: VisitVitals | null): number | null {
  if (!vitals?.weightKg || !vitals.heightCm) return null;
  const metres = vitals.heightCm / 100;
  return Math.round((vitals.weightKg / (metres * metres)) * 10) / 10;
}

export const ENCOUNTER_STATUS_LABELS: Record<EncounterStatus, string> = {
  in_progress: "Đang khám",
  completed: "Đã hoàn tất",
};

export const ENCOUNTER_STATUS_OPTIONS: { label: string; value: EncounterStatus }[] = [
  { label: "Đang khám", value: "in_progress" },
  { label: "Đã hoàn tất", value: "completed" },
];

/** A completed encounter locks 24 hours after it ended; the API refuses edits from then on. */
export const isEncounterLocked = (encounter: Pick<Encounter, "editableUntil">, now = Date.now()) =>
  encounter.editableUntil != null && new Date(encounter.editableUntil).getTime() < now;

/** Whose visit a new encounter is for: the create form reads it from the URL. */
export type NewEncounterTarget = {
  customerId: number;
  /** Shown on the form that opens; the API takes only the id. */
  patientName: string;
  /** The appointment the visit belongs to, when it is opened from one. */
  appointmentId?: number;
};

export function newEncounterPath({ customerId, patientName, appointmentId }: NewEncounterTarget) {
  const query = new URLSearchParams({ customerId: String(customerId), patient: patientName });
  if (appointmentId) query.set("appointmentId", String(appointmentId));
  return `/clinical-encounters/create?${query}`;
}

/**
 * A customer's own concluded visit (`GET /my_appointments/{id}/result`): the
 * encounter and the services done in it, cancelled ones left out.
 */
export type MyVisitResult = {
  encounter: Encounter;
  orders: ServiceOrder[];
};
