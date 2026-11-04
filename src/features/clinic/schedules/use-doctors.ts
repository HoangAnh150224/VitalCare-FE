import { useCustom } from "@refinedev/core";

import { API_URL } from "@/shared/api/constants";
import type { DoctorAvailability } from "@/domains/schedule/types";

/** The doctors of the caller's own clinic, each with their week and whether the caller may change it. */
export function useOwnClinicDoctors() {
  const { result, query } = useCustom<DoctorAvailability[]>({ url: `${API_URL}/doctors`, method: "get" });
  const doctors = Array.isArray(result?.data) ? result.data : [];
  return { doctors, isLoading: query.isLoading, refetch: () => void query.refetch() };
}
