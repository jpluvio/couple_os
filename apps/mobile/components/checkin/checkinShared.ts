import type { CheckinPeriod } from "@/types/database";

// Etichette dei periodi in italiano
export const PERIOD_LABELS: Record<CheckinPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

// Ordine di visualizzazione dei periodi
export const PERIODS: CheckinPeriod[] = ["weekly", "monthly", "yearly"];

// Scala dei mood 1-5 con emoji (😞 → 😍)
export const MOODS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "So-so" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😍", label: "Great" },
];

// Emoji corrispondente a un valore di mood (fallback neutro)
export function moodEmoji(value: number | null): string {
  return MOODS.find((m) => m.value === value)?.emoji ?? "—";
}

// Tempo relativo in italiano (coerente con board/PostCard)
export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g`;
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
