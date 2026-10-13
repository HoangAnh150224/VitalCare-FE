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
  clinicalNote: string | null;
  diagnosis: string | null;
  followUp: string | null;
  _can?: Record<string, boolean>;
};

export type EncounterStatus = "in_progress" | "completed";

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
