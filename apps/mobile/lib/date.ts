/**
 * Le date inserite a mano arrivano come testo libero ("AAAA-MM-GG").
 * `new Date("giugno").toISOString()` solleva un RangeError, quindi ogni
 * conversione va filtrata prima di toccare il database.
 */

/** "AAAA-MM-GG" valido → la stringa stessa; qualsiasi altra cosa → null. */
export function parseDateOnly(input: string): string | null {
  const t = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;

  const [y, m, d] = t.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  // Rifiuta il 31 febbraio: il costruttore lo farebbe scivolare a marzo.
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    return null;
  }
  return t;
}

/** Oggi in formato "AAAA-MM-GG", ora locale (non UTC: sposterebbe il giorno). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Formattazione tollerante: una data illeggibile non deve rompere una lista. */
export function safeFormat(
  input: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", opts);
}
