import type { StaffType } from "@/domains/employee/types";

/** Open until it is ended; ending is final, and the row stays as history. */
export type AssignmentStatus = "active" | "ended";

/** One person's time on a patient's care team (`GET /customers/{id}/care-team`). */
export type CareTeamMember = {
  id: number;
  status: AssignmentStatus;
  assignedAt: string;
  endedAt: string | null;
  note: string | null;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  staffType: StaffType;
  specialty: string | null;
};

/**
 * One period of a device on a patient. From the patient's side `device` is
 * filled in; from the device's side, `patient`.
 */
export type DeviceAssignment = {
  id: number;
  status: AssignmentStatus;
  assignedAt: string;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  note: string | null;
  device: { id: number; deviceCode: string; model: string | null } | null;
  patient: { id: number; customerCode: string; fullName: string } | null;
};

/** A patient as the member of staff following them sees them (`GET /my_patients`). */
export type MyPatient = {
  id: number;
  customerCode: string;
  fullName: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  followingSince: string;
  device: { id: number; deviceCode: string; model: string | null } | null;
  /** The whole current care team; only on the single-patient answer. */
  careTeam: CareTeamMember[] | null;
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: "Đang theo dõi",
  ended: "Đã kết thúc",
};

export const ASSIGNMENT_STATUS_OPTIONS: { label: string; value: AssignmentStatus }[] = [
  { label: "Đang theo dõi", value: "active" },
  { label: "Đã kết thúc", value: "ended" },
];

/**
 * One care-team assignment with both people it names — a row of the clinic's
 * assignment list (`GET /monitoring_assignments`).
 */
export type MonitoringAssignment = {
  id: number;
  status: AssignmentStatus;
  patient: { id: number; customerCode: string; fullName: string };
  staff: { id: number; employeeCode: string; fullName: string; staffType: StaffType; specialty: string | null };
  assignedAt: string;
  /** Who made and who ended it; only on the single-assignment answer. */
  assignedBy: string | null;
  endedAt: string | null;
  endedBy: string | null;
  note: string | null;
};
