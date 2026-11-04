import { useList } from "@refinedev/core";

import type { Clinic } from "@/domains/clinic/types";

/**
 * For somebody over every clinic (the system administrator): which one the
 * figures are for. Staff of one clinic get theirs whatever is sent, which the
 * answer shows as its `clinicId` — so the picker shows only once an answer for
 * "every clinic" came back without one.
 */
export function ClinicPicker({
  value,
  onChange,
  answeredClinicId,
}: {
  value: string;
  onChange: (id: string) => void;
  /** The `clinicId` of the figures on screen; undefined while loading. */
  answeredClinicId: string | null | undefined;
}) {
  const overEveryClinic = value !== "" || answeredClinicId === null;
  const { result } = useList<Clinic>({
    resource: "clinics",
    pagination: { mode: "off" },
    queryOptions: { enabled: overEveryClinic },
  });
  const clinics = result?.data ?? [];
  if (!overEveryClinic || clinics.length < 2) return null;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="report-clinic" className="text-sm font-medium">
        Cơ sở
      </label>
      <select
        id="report-clinic"
        className="border-input bg-card h-9 rounded-md border px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Tất cả cơ sở</option>
        {clinics.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
