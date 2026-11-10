/**
 * The permission vocabulary: how a resource name and a Refine action become the
 * code the API checks.
 *
 * It lives in `shared/` rather than beside the access control provider because
 * two layers ask the same question — `app/providers/access-control.ts` for every
 * button and route guard, and the sidebar for which menu items to offer — and a
 * component in `shared/` may not import from `app/`.
 */

/**
 * Refine's six actions, mapped onto the actions the API grants — plus the
 * custom actions some resources check on their own.
 *
 * `clone` needs `write` rather than `read` even though it opens a form
 * pre-filled from an existing record: what it produces is a create.
 *
 * `activate` and `check_in` are permission actions of their own on the API
 * (`customers:activate`, `appointments:check_in`), because turning somebody
 * into a patient is a different grant from editing their address. Without an
 * entry here `permissionFor` would answer `null` for them — which the access
 * control provider reads as "allowed" — and the buttons would show to
 * everybody, only for the API to refuse the click. `cancel` is a state change
 * covered by `write`.
 */
export const ACTION_TO_PERMISSION: Record<
  string,
  | "read"
  | "write"
  | "delete"
  | "activate"
  | "check_in"
  | "assign"
  | "assign_staff"
  | "status"
  | "operate"
  | "report"
  | "conclude"
  | "review"
  | "export"
  | "transfer"
> = {
  // customers:assign — putting a patient in somebody's care and on a device.
  assign: "assign",
  // customers:assign_staff — the care team; the clinic administrator's alone (SRS 3.1.3).
  assign_staff: "assign_staff",
  list: "read",
  show: "read",
  create: "write",
  edit: "write",
  clone: "write",
  delete: "delete",
  cancel: "write",
  activate: "activate",
  // customers:status — active, inactive or paused (SRS 3.8.5).
  status: "status",
  check_in: "check_in",
  // exam_rooms:operate — calling the next patient in, passing one over, pausing a room.
  operate: "operate",
  // invoices:report — the clinic's revenue, the clinic administrator's.
  report: "report",
  // clinical_encounters:conclude — the diagnosis and completing the visit, the doctor's.
  conclude: "conclude",
  // first_aid_articles:review — approving, sending back, publishing and archiving guidance (BR-31).
  review: "review",
  // reports:export — downloading the summary reports (BF-08 Report Export).
  export: "export",
  // staff_memberships:transfer — moving a member of staff to another clinic, the system administrator's.
  transfer: "transfer",
};

/**
 * Resources that are declared for the sake of routing and the sidebar, and have
 * no permission code behind them.
 *
 * The dashboard is a screen, not a resource: no endpoint, no rows, nothing the
 * API guards. Deriving `dashboard:read` for it would invent a permission that
 * protects nothing — and, because that code is in no migration and in no role,
 * `useAccessibleMenuItems` would hide the item from every account including the
 * administrator. The same reasoning exempts `/user/queue/auth` on the WebSocket
 * side: requiring a grant to reach something that grants nothing is circular.
 *
 * Keep this list short. An entry here is a screen the UI offers to anyone
 * signed in, so anything it does show has to be safe for anyone signed in —
 * which in practice means it must not read a guarded resource. The moment the
 * dashboard starts pulling counts out of `blog_posts` or `users`, those reads
 * are `useList` calls that carry their own permission checks, and the tiles
 * around them need gating with `useCan` rather than an entry here.
 */
const UNGUARDED_RESOURCES = new Set(["dashboard"]);

/**
 * The permission code a resource and action need, or `null` where no code
 * applies — a route-less grouping node, an unguarded screen, or an action
 * nobody has defined one for.
 *
 * The sidebar filters the menu with it. `useMenu` does not consult access
 * control at all: it only drops items marked `meta.hide` or with neither a list
 * route nor children. Without this the Administration section would be offered
 * to everyone and the API would answer 403 on arrival.
 */
export function permissionFor(
  resource: string | undefined,
  action: string
): string | null {
  if (!resource || UNGUARDED_RESOURCES.has(resource)) return null;
  const suffix = ACTION_TO_PERMISSION[action];
  return suffix ? `${resource}:${suffix}` : null;
}

/**
 * The resources a customer holds about themselves. Named one by one rather
 * than matched on the `my_` prefix: `my_patients` is staff's — the patients
 * in a nurse's care — and must not send a nurse to the patient portal.
 */
const PORTAL_RESOURCES = new Set([
  "my_appointments",
  "my_profiles",
  "my_conversations",
  "my_devices",
  "my_vital_signs",
  "my_alerts",
  "my_sharing",
  "shared_patients",
  "emergency_alerts",
  "my_result_returns",
  "my_feedback",
]);

/** Held by every account, staff or customer: no say in which shell it gets. */
const EVERYONES_RESOURCES = new Set(["notifications"]);

/**
 * Whether an account is a customer's and nothing more: every code it holds is
 * about its own visits and profiles.
 *
 * Such an account gets the patient portal instead of the staff shell. Anybody
 * holding even one other code — staff, an administrator who can also register
 * for themselves — keeps the staff shell, since that is where their work is.
 */
export function isPortalAccount(
  permissions: readonly string[] | undefined
): boolean {
  const telling = (permissions ?? []).filter(
    (code) => !EVERYONES_RESOURCES.has(code.slice(0, code.indexOf(":")))
  );
  return (
    telling.length > 0 &&
    telling.every((code) =>
      PORTAL_RESOURCES.has(code.slice(0, code.indexOf(":")))
    )
  );
}

/**
 * A clinic administrator manages the clinic; the day-to-day work (registering
 * visits, patients, vitals and alerts, messages, follow-up) is the staff's and
 * the doctors'. Their menu holds exactly this, in this order, under the two
 * existing sections; anything else is not offered, and its screen is closed to
 * a typed URL. The API still answers these resources for the screens kept here
 * (a device's readings, the rooms' queue), so this is the menu, not the grants.
 */
export const CLINIC_ADMIN_MENU = {
  clinic: ["employees", "licenses", "doctor_schedules", "devices", "alert_rules", "clinic_roles", "exam_rooms", "clinics"],
  administration: ["medical_services", "invoices", "reports", "feedback", "first_aid_articles", "notifications"],
} as const;

/** The staff's and doctors' screens a clinic administrator does not open. */
export const CLINIC_ADMIN_HIDDEN = new Set([
  "appointments",
  "customers",
  "vital_signs",
  "alerts",
  "device_syncs",
  "sync_failures",
  "result_returns",
  "conversations",
  "monitoring_assignments",
]);

/** A clinic administrator and nothing else: one who is also a doctor or front desk keeps that work. */
export function isClinicAdminOnly(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.includes("CLINIC_ADMIN")) && !roles?.some((role) => role === "DOCTOR" || role === "MANAGER");
}
