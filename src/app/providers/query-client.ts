import { keepPreviousData, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // These are Refine's defaults when it creates its own QueryClient.
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    },
    mutations: {
      // The default "online" mode pauses a save made offline: the button
      // hangs on "Đang lưu..." and the write fires by itself once the network
      // is back. "always" sends it at once, so it fails through the normal
      // error path ("Không kết nối được máy chủ…") and the user retries.
      networkMode: "always",
    },
  },
});
// Auth checks must run after local logout even when the browser is offline.
// Refine's default "online" mode pauses invalidated auth queries and leaves
// the previous authenticated result in the route guard's cache.
queryClient.setQueryDefaults(["auth"], { networkMode: "always" });

/**
 * Drops everything the previous account loaded. Most query keys do not name
 * the user (`["my_sharing"]`, Refine's resource lists...), so without this the
 * next account on the same browser is shown the last one's data until the
 * refetch lands. The `auth` queries stay: the route guard is reading them and
 * Refine invalidates them itself right after login and logout.
 */
export function forgetAccountData() {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
}
