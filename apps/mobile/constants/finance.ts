/**
 * Categorie di spesa condivise da ExpensesTab, BudgetTab e StatsTab.
 * Erano duplicate in ogni componente: tenerle qui evita che le tre liste divergano.
 *
 * I colori sono la palette categorica usata dai grafici. L'ordine degli slot non è
 * cosmetico: è stato scelto perché ogni coppia adiacente resti distinguibile anche
 * con deficit di visione dei colori (ΔE CVD ≥ 8 su tutte le coppie adiacenti).
 * Non riordinare né sostituire un singolo colore senza rivalidare la palette.
 *
 * Tre di questi colori stanno sotto il rapporto di contrasto 3:1 su sfondo bianco:
 * per questo i grafici mostrano SEMPRE l'etichetta della categoria accanto alla
 * barra. Il colore non deve mai essere l'unico modo per identificare una serie.
 */
export const EXPENSE_CATEGORIES: {
  value: string;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { value: "casa", label: "Casa", emoji: "🏠", color: "#2a78d6" },
  { value: "cibo", label: "Cibo", emoji: "🍕", color: "#eb6834" },
  { value: "trasporti", label: "Trasporti", emoji: "🚗", color: "#1baf7a" },
  { value: "intrattenimento", label: "Svago", emoji: "🎉", color: "#eda100" },
  { value: "salute", label: "Salute", emoji: "💊", color: "#e87ba4" },
  { value: "altro", label: "Altro", emoji: "📦", color: "#008300" },
];

/** Colore neutro per la voce "Altre categorie" aggregata nei grafici. */
export const OTHER_COLOR = "#9ca3af";

export function categoryInfo(cat: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === cat) ?? {
      value: cat,
      label: cat,
      emoji: "📦",
      color: OTHER_COLOR,
    }
  );
}
