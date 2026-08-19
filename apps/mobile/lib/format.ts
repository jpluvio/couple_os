// Couple OS — formatting helpers.
// Money is formatted in exactly one place: every amount in the app goes
// through formatCurrency, so the app never disagrees with itself.

const CURRENCY_LOCALE = "en-IE"; // English, euro
const CURRENCY = "EUR";

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** €1,234.56 */
export function formatCurrency(amount: number | null | undefined): string {
  return currencyFormatter.format(amount ?? 0);
}

/** €1,235 — for headline figures where the cents are noise. */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  return compactCurrencyFormatter.format(amount ?? 0);
}

/** "19 Aug" */
export function formatShortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "19 August 2026" */
export function formatLongDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "August 2026" */
export function formatMonth(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Accepts both "12.50" and "12,50" — people type both. */
export function parseAmount(input: string): number | null {
  const parsed = Number.parseFloat(input.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/** ISO date (YYYY-MM-DD) of a Date, without timezone surprises. */
export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** First day of the month a date falls in, as an ISO date. */
export function toPeriodKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** The month `offset` months away from `periodKey`. */
export function shiftPeriod(periodKey: string, offset: number): string {
  const d = new Date(periodKey);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + offset, 1));
}

export function todayISO(): string {
  return toISODate(new Date());
}
