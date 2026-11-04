import { useSyncExternalStore } from "react";

import { getAuthorities, subscribeToAuthorities } from "@/shared/api/session";
import { isPortalAccount } from "@/shared/lib/permissions";

/**
 * Whether the signed-in account is a customer's only (see `isPortalAccount`).
 *
 * Read from the cached permissions, which `<Authenticated>` has loaded before
 * anything inside the shell renders, and re-read whenever they change, so a
 * role granted mid-session moves the account to the right shell at once.
 */
export function usePortalAccount(): boolean {
  return useSyncExternalStore(subscribeToAuthorities, () => isPortalAccount(getAuthorities()?.permissions));
}
