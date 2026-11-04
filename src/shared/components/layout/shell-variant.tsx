import { createContext, useContext } from "react";

/**
 * Which shell a screen is rendered in: the staff one (sidebar, breadcrumbs) or
 * the patient portal (top bar, tab bar, no breadcrumbs).
 *
 * Shared screens — a profile form, the appointment slip — read it to drop
 * the parts that only make sense to staff. Staff is the default, so nothing
 * outside the portal has to provide it.
 */
export type ShellVariant = "staff" | "portal";

export const ShellVariantContext = createContext<ShellVariant>("staff");

export function useShellVariant(): ShellVariant {
  return useContext(ShellVariantContext);
}
