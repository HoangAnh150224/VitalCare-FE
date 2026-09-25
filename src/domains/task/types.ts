/**
 * The `tasks` resource as the API reports it — `TaskResponse` on the backend.
 *
 * Nothing generates this from the Java record, so the two are kept in step by
 * hand; that is the same bargain the rest of the API contract is on.
 */
export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: UserSummary | null;
  department: DepartmentSummary | null;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: UserSummary | null;
  /**
   * Computed by the API, not here.
   *
   * Working it out in the browser would let a client in another timezone
   * disagree with the `overdue` filter about which tasks are late today.
   */
  overdue: boolean;
  createdAt: string;
  updatedAt: string | null;
};

/** The user as a task row reports it — no email, no status, no roles. */
export type UserSummary = {
  id: number;
  username: string;
  fullName: string;
};

/** The department as a task row reports it. */
export type DepartmentSummary = {
  id: number;
  code: string;
  name: string;
};

/** Mirrors `TaskStatus`; these are the lower-case wire values. */
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";

/** Mirrors `TaskPriority`. */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Cần làm",
  in_progress: "Đang thực hiện",
  blocked: "Bị chặn",
  done: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};

/**
 * Written out in wire order rather than derived from the label maps, because
 * these are a contract with the Java enums: a value that is not one of them
 * filters to nothing rather than failing loudly.
 */
export const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: "Cần làm", value: "todo" },
  { label: "Đang thực hiện", value: "in_progress" },
  { label: "Bị chặn", value: "blocked" },
  { label: "Hoàn thành", value: "done" },
  { label: "Đã hủy", value: "cancelled" },
];

/** Ordered by importance, which is the one order the API cannot sort by. */
export const PRIORITY_OPTIONS: { label: string; value: TaskPriority }[] = [
  { label: "Thấp", value: "low" },
  { label: "Trung bình", value: "medium" },
  { label: "Cao", value: "high" },
  { label: "Khẩn cấp", value: "urgent" },
];
