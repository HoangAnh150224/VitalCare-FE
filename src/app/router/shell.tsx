import type { PropsWithChildren, ReactNode } from "react";

import { Layout } from "@/shared/components/layout/layout";
import { PortalLayout } from "@/shared/components/layout/portal-layout";
import { usePortalAccount } from "@/shared/hooks/use-portal-account";

/**
 * The shell around every signed-in screen: the patient portal for an account
 * that only holds its own records, the staff console for everybody else.
 */
export function ShellLayout({ children }: PropsWithChildren) {
  return usePortalAccount() ? <PortalLayout>{children}</PortalLayout> : <Layout>{children}</Layout>;
}

/**
 * One route, two screens: the portal's version where the account is a
 * customer's, the console's otherwise. Lives here because a feature may not
 * import another, and the two often come from different features.
 */
export function PortalSwitch({ portal, staff }: { portal: ReactNode; staff: ReactNode }) {
  return <>{usePortalAccount() ? portal : staff}</>;
}
