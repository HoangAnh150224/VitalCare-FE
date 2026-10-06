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
  createdAt: string;
};

/** Each kind of staff holds the matching role (DOCTOR, NURSE). */
export type StaffType = "doctor" | "nurse";

/** Leaving is `inactive`, never a delete. */
export type EmployeeStatus = "active" | "inactive";

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  doctor: "Bác sĩ",
  nurse: "Điều dưỡng",
};

export const STAFF_TYPE_OPTIONS: { label: string; value: StaffType }[] = [
  { label: "Bác sĩ", value: "doctor" },
  { label: "Điều dưỡng", value: "nurse" },
];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Đang làm việc",
  inactive: "Đã nghỉ",
};

export const EMPLOYEE_STATUS_OPTIONS: { label: string; value: EmployeeStatus }[] = [
  { label: "Đang làm việc", value: "active" },
  { label: "Đã nghỉ", value: "inactive" },
];
