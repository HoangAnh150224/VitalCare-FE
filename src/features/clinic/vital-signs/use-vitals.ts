import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { kyInstance } from "@/shared/api/data";
import type {
  VitalLatest,
  VitalReading,
  VitalTrend,
} from "@/domains/vitals/types";

/**
 * Whose readings: a patient the member of staff may see (`/vital_signs`), or
 * one of the account's own profiles (`/my_vital_signs`; null = the account's own).
 */
export type VitalScope =
  | { kind: "staff"; customerId: number }
  | { kind: "own"; profileId: number | null }
  // A caregiver reading under a patient's grant (BF-06).
  | { kind: "shared"; customerId: number };

export type VitalRange = "24h" | "7d" | "30d";

export const RANGE_LABELS: Record<VitalRange, string> = {
  "24h": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày",
};

const RANGE_HOURS: Record<VitalRange, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

/** How often an open screen looks for newly arrived readings. */
const LIVE_MS = 30_000;

const base = (scope: VitalScope) =>
  scope.kind === "staff"
    ? "vital_signs"
    : scope.kind === "shared"
    ? `shared_patients/${scope.customerId}/vitals`
    : "my_vital_signs";

const who = (scope: VitalScope): Record<string, string> =>
  scope.kind === "staff"
    ? { customerId: String(scope.customerId) }
    : scope.kind === "shared"
    ? {}
    : scope.profileId != null
    ? { profileId: String(scope.profileId) }
    : {};

const scopeKey = (scope: VitalScope) => [
  base(scope),
  scope.kind === "own" ? scope.profileId : scope.customerId,
];

/** The window for a range, ending now — read once per render of the range. */
export function windowOf(range: VitalRange) {
  const to = new Date();
  const from = new Date(to.getTime() - RANGE_HOURS[range] * 3_600_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useVitalLatest(scope: VitalScope, enabled = true) {
  return useQuery({
    queryKey: [...scopeKey(scope), "latest"],
    queryFn: () =>
      kyInstance
        .get(`${base(scope)}/latest`, { searchParams: who(scope) })
        .json<VitalLatest>(),
    enabled,
    refetchInterval: LIVE_MS,
  });
}

export function useVitalTrend(
  scope: VitalScope,
  range: VitalRange,
  enabled = true
) {
  return useQuery({
    queryKey: [...scopeKey(scope), "trend", range],
    queryFn: () =>
      kyInstance
        .get(`${base(scope)}/trend`, {
          searchParams: { ...who(scope), ...windowOf(range) },
        })
        .json<VitalTrend>(),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_MS,
  });
}

export const HISTORY_PAGE = 20;

export function useVitalHistory(
  scope: VitalScope,
  range: VitalRange,
  page: number,
  includeInvalid: boolean,
  enabled = true
) {
  return useQuery({
    queryKey: [...scopeKey(scope), "history", range, page, includeInvalid],
    queryFn: async () => {
      const response = await kyInstance.get(base(scope), {
        searchParams: {
          ...who(scope),
          ...windowOf(range),
          _start: String(page * HISTORY_PAGE),
          _end: String((page + 1) * HISTORY_PAGE),
          ...(includeInvalid ? { validation: "all" } : {}),
        },
      });
      return {
        rows: await response.json<VitalReading[]>(),
        total: Number(response.headers.get("X-Total-Count") ?? 0),
      };
    },
    enabled,
    placeholderData: keepPreviousData,
    // Each read is an audited look at health data: not again on every window focus.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
