/**
 * The `users` resource as the API reports it — `UserResponse` on the backend.
 *
 * Nothing generates this from the Java record, so the two are kept in step by
 * hand; that is the same bargain the rest of the API contract is on.
 */
export type User = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  status: UserStatus;
  roles: RoleSummary[];
  /** Null for an account that has not been placed. */
  organization: OrganizationSummary | null;
  /** Null for an account in no department, placed or otherwise. */
  department: DepartmentSummary | null;
  createdAt: string;
  updatedAt: string | null;
  lastLoginAt: string | null;
};

/** The role as a user row reports it — no permission list at this depth. */
export type RoleSummary = {
  id: number;
  code: string;
  name: string;
};

/** The organization as a user row reports it. */
export type OrganizationSummary = {
  id: number;
  code: string;
  name: string;
};

/**
 * The department as a user row reports it.
 *
 * <p>No nested organization, unlike the departments resource's own payload: the
 * user row already reports one beside this, and the composite foreign key on
 * `users` means the two cannot differ.
 */
export type DepartmentSummary = {
  id: number;
  code: string;
  name: string;
};

/** Mirrors `UserStatus`; these are the lower-case wire values, not the constants. */
export type UserStatus = "active" | "inactive" | "locked";

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Hoạt động",
  inactive: "Ngừng hoạt động",
  locked: "Bị khóa",
};

export const STATUS_OPTIONS: { label: string; value: UserStatus }[] = [
  { label: "Hoạt động", value: "active" },
  { label: "Ngừng hoạt động", value: "inactive" },
  { label: "Bị khóa", value: "locked" },
];
