import type { VisitVitals } from "./types";

/**
 * An adult's normal range for each measurement taken at a visit, for marking
 * a reading as low or high where the patient reads it (KAN-89). Narrower than
 * the default alert rules (043: SpO₂ below 94, heart rate below 50 or above
 * 120), so a reading that would raise an alert is never shown as normal.
 * Weight and height have no range.
 */
export const VITAL_NORMAL_RANGES: Partial<Record<keyof VisitVitals, { min?: number; max?: number }>> = {
  temperature: { min: 36, max: 37.5 },
  pulse: { min: 60, max: 100 },
  respiratoryRate: { min: 12, max: 20 },
  systolicBp: { min: 90, max: 139 },
  diastolicBp: { min: 60, max: 89 },
  spo2: { min: 95 },
};

/** "Thấp" or "Cao" when the reading is outside its normal range; null when within it or there is none. */
export function vitalFlag(name: keyof VisitVitals, value: number | null | undefined): "Thấp" | "Cao" | null {
  const range = VITAL_NORMAL_RANGES[name];
  if (!range || value == null) return null;
  if (range.min != null && value < range.min) return "Thấp";
  if (range.max != null && value > range.max) return "Cao";
  return null;
}

/** The normal range as a patient reads it: "60–100", "≥ 95". */
export function vitalRangeText(name: keyof VisitVitals): string | null {
  const range = VITAL_NORMAL_RANGES[name];
  if (!range) return null;
  const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (range.min != null && range.max != null) return `${n(range.min)}–${n(range.max)}`;
  return range.min != null ? `≥ ${n(range.min)}` : `≤ ${n(range.max!)}`;
}
