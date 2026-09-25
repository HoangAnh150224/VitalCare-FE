/**
 * How a date is written, everywhere.
 *
 * There were two shapes on screen at once and both were right on their own:
 * `toLocaleDateString(…, { month: "short" })` gave "Aug 23, 2026" and a bare
 * `toLocaleString()` gave "8/31/2026, 4:00:24 PM". A detail card showing both,
 * two rows apart, makes the reader work out that they are the same kind of
 * value — and the seconds are noise on a record nobody is timing.
 *
 * Both formatters use one fixed locale, because the interface is Vietnamese:
 * the *shape* is the application's decision, and so is the *language*.
 */

/** The locale every date and number on screen is written in. */
export const LOCALE = "vi-VN";

const DATE: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const DATE_TIME: Intl.DateTimeFormatOptions = {
  ...DATE,
  hour: "2-digit",
  minute: "2-digit",
};

/** The em dash, not an empty cell — a blank reads as a rendering failure. */
export const EMPTY = "—";

export function formatDate(value?: string | null): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? EMPTY
    : date.toLocaleDateString(LOCALE, DATE);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? EMPTY
    : date.toLocaleString(LOCALE, DATE_TIME);
}
