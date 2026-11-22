import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { disconnect } from "@/shared/api/live";
import { subscribeToAuthorities, subscribeToSessionEnd } from "@/shared/api/session";

/**
 * Makes a permission change visible without a reload.
 *
 * `accessControlProvider.can` reads the cached codes synchronously and outside
 * React, which is what keeps a table of twenty rows from firing eighty
 * authorisation requests. The cost is that rewriting that cache re-renders
 * nothing: Refine holds every `can` answer and the sidebar's `usePermissions`
 * in react-query, so the menu would keep showing what it decided on first
 * paint. Dropping those two caches is the whole of this component's job.
 *
 * It only fires when the codes actually changed — `loadAuthorities` runs on
 * every page load and would otherwise throw away a cache that was right.
 *
 * The query keys are Refine's own (`useCan` keys under `access`,
 * `usePermissions` under `auth`). Refine has a hook for this internally but
 * does not export it, so the keys are named here; if a Refine upgrade ever
 * moves them, the symptom is this file quietly doing nothing.
 */
export const AuthoritiesSync = () => {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      subscribeToAuthorities(() => {
        void queryClient.invalidateQueries({ queryKey: ["access"] });
        void queryClient.invalidateQueries({ queryKey: ["auth", "permissions"] });
      }),
    [queryClient]
  );

  // A request found the session over (401, refresh failed). Re-running the
  // guard's `check` is what moves a protected page to /login?to=<here>, and
  // unmounting it is what stops a self-refreshing screen from polling on.
  // Public pages and the sign-in form have no redirecting guard, so nothing
  // moves there.
  useEffect(
    () =>
      subscribeToSessionEnd(() => {
        disconnect();
        void queryClient.invalidateQueries({ queryKey: ["auth"] });
      }),
    [queryClient]
  );

  return null;
};
