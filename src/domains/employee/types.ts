/** A member of clinical staff as `GET /employees` returns it (`EmployeeResponse`). */
export type Employee = {
  id: number;
  employeeCode: string;
  userId: number;
  fullName: string;
  phone: string;
  staffType: StaffType;
  specialty: string | null;
  professionalTitle: string | null;
  licenseNo: string | null;
  clinicPosition: string | null;
  status: EmployeeStatus;
  /** The clinic they work at; a receptionist sees only this clinic's data. */
  clinicId: string | null;
  createdAt: string;
  deletedAt?: string | null;
  membershipEndedAt?: string | null;
};

/**
 * Each kind of staff holds the matching role (DOCTOR, MANAGER for the
 * front desk, CLINIC_ADMIN for the clinic's administrator).
 */
export type StaffType = "doctor" | "receptionist" | "clinic_admin";

/** Leaving is `inactive`, never a delete. */
export type EmployeeStatus = "active" | "inactive";

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  doctor: "Bác sĩ",
  receptionist: "Lễ tân",
  clinic_admin: "Quản trị phòng khám",
};

/** Doctors: who can be on a patient's care team. The front desk and the clinic's administrator cannot. */
export const isClinicalStaff = (staffType: StaffType) =>
  staffType === "doctor";

export const STAFF_TYPE_OPTIONS: { label: string; value: StaffType }[] = [
  { label: "Bác sĩ", value: "doctor" },
  { label: "Lễ tân", value: "receptionist" },
  { label: "Quản trị phòng khám", value: "clinic_admin" },
];

/** The specialties the clinic offers. Stored as the label itself — the API keeps `specialty` as free text. */
export const SPECIALTY_OPTIONS = [
  "Tim mạch",
  "Hô hấp",
  "Tim mạch nhi",
  "Hô hấp nhi",
  "Phẫu thuật tim mạch",
  "Phẫu thuật lồng ngực",
] as const;

/** Professional titles, stored as the label itself like the specialty. */
export const PROFESSIONAL_TITLE_OPTIONS = [
  "Bác sĩ",
  "Bác sĩ chuyên khoa I",
  "Bác sĩ chuyên khoa II",
  "Thạc sĩ, Bác sĩ",
  "Tiến sĩ, Bác sĩ",
  "Phó giáo sư, Tiến sĩ",
  "Giáo sư, Tiến sĩ",
  "Điều dưỡng",
  "Kỹ thuật viên",
  "Lễ tân",
] as const;

/** The post someone holds at the clinic, stored as the label itself. */
export const CLINIC_POSITION_OPTIONS = [
  "Trưởng khoa",
  "Phó trưởng khoa",
  "Bác sĩ điều trị",
  "Bác sĩ phẫu thuật",
  "Điều dưỡng trưởng",
  "Điều dưỡng",
  "Kỹ thuật viên",
  "Lễ tân",
  "Thu ngân",
] as const;

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Đã nghỉ",
};

export const EMPLOYEE_STATUS_OPTIONS: { label: string; value: EmployeeStatus }[] = [
  { label: "Đang hoạt động", value: "active" },
  { label: "Đã nghỉ", value: "inactive" },
];
