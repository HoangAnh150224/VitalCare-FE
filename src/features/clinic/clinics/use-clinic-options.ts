import { useCan, useList } from "@refinedev/core";
import { useCallback, useMemo } from "react";

import type { Clinic } from "@/domains/clinic/types";

/**
 * The clinics, for a clinic column, filter or picker.
 *
 * `several` is what decides whether any of that is shown: only with more than
 * one clinic, and only for somebody who works across them.
 */
export function useClinicOptions() {
  const { result } = useList<Clinic>({ resource: "clinics", pagination: { mode: "off" } });
  // A receptionist's lists only ever hold their own clinic's rows, so a clinic
  // column would repeat one name. Whoever may edit every clinic's hours works
  // across clinics; that is who gets the column and the filter.
  const { data: acrossClinics } = useCan({ resource: "clinics", action: "edit" });
  const clinics = useMemo(() => result?.data ?? [], [result?.data]);

  const options = useMemo(() => clinics.map((clinic) => ({ label: clinic.name, value: clinic.id })), [clinics]);
  const nameOf = useCallback(
    (id: string | null | undefined) => clinics.find((clinic) => clinic.id === id)?.name ?? "—",
    [clinics],
  );

  return { clinics, options, nameOf, several: clinics.length > 1 && Boolean(acrossClinics?.can) };
}
