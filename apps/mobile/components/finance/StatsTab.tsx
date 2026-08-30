import { useMemo } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCouple } from "@/hooks/useCouple";
import { OTHER_COLOR, categoryInfo } from "@/constants/finance";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Expense } from "@/types/database";

const MONTHS_SHOWN = 6;
const TOP_CATEGORIES = 5;

const MONTH_ABBR = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** Chiave "AAAA-MM", la stessa forma del prefisso di `expenses.date`. */
function monthKey(year: number, month0: number) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

/**
 * Gli ultimi `MONTHS_SHOWN` mesi, dal più vecchio al più recente.
 * I bucket si calcolano sul prefisso della stringa `date` invece che con `new Date()`:
 * `date` è un DATE di Postgres senza fuso orario e parsarlo sposterebbe le spese
 * del primo del mese nel mese precedente per chi sta a est di UTC.
 */
function buildMonths(now: Date) {
  const out: { key: string; label: string }[] = [];
  for (let i = MONTHS_SHOWN - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d.getFullYear(), d.getMonth()), label: MONTH_ABBR[d.getMonth()] });
  }
  return out;
}

function euro(n: number) {
  return `€${n.toFixed(2)}`;
}

/** Barre verticali: una per mese. Serie singola, quindi nessuna legenda. */
function TrendChart({
  data,
  maxValue,
}: {
  data: { key: string; label: string; total: number }[];
  maxValue: number;
}) {
  const CHART_HEIGHT = 120;
  const lastKey = data[data.length - 1]?.key;

  return (
    <View>
      <View className="flex-row items-end" style={{ height: CHART_HEIGHT, gap: 6 }}>
        {data.map((m) => {
          const isCurrent = m.key === lastKey;
          // Una spesa non nulla resta visibile anche quando è piccolissima rispetto al picco.
          const h = maxValue > 0 ? Math.max((m.total / maxValue) * CHART_HEIGHT, m.total > 0 ? 3 : 0) : 0;
          return (
            <View key={m.key} className="flex-1 justify-end" style={{ height: CHART_HEIGHT }}>
              <View
                style={{
                  height: h,
                  backgroundColor: isCurrent ? "#059669" : "#a7f3d0",
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Linea di base + etichette dei mesi */}
      <View className="h-px bg-gray-200 mt-1" />
      <View className="flex-row mt-1.5" style={{ gap: 6 }}>
        {data.map((m) => (
          <View key={m.key} className="flex-1 items-center">
            <Text
              className={`text-xs ${m.key === lastKey ? "font-semibold text-gray-700" : "text-gray-400"}`}
            >
              {m.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Barre orizzontali con etichetta sempre visibile accanto a ogni barra. */
function CategoryBars({
  rows,
  total,
}: {
  rows: { key: string; label: string; emoji: string; color: string; amount: number }[];
  total: number;
}) {
  const max = rows[0]?.amount ?? 0;

  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => {
        const pct = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <View key={r.key}>
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center flex-1" style={{ gap: 6 }}>
                <Text className="text-sm">{r.emoji}</Text>
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                  {r.label}
                </Text>
              </View>
              <View className="flex-row items-baseline" style={{ gap: 6 }}>
                <Text className="text-sm font-semibold text-gray-900">{euro(r.amount)}</Text>
                <Text className="text-xs text-gray-400" style={{ width: 38, textAlign: "right" }}>
                  {pct.toFixed(0)}%
                </Text>
              </View>
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${max > 0 ? (r.amount / max) * 100 : 0}%`,
                  backgroundColor: r.color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function StatsTab() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? "";

  const months = useMemo(() => buildMonths(new Date()), []);
  const fromDate = `${months[0].key}-01`;

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ["expenses-range", coupleId, fromDate],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("date", fromDate)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const stats = useMemo(() => {
    const byMonth = new Map(months.map((m) => [m.key, 0]));
    const currentKey = months[months.length - 1].key;
    const prevKey = months[months.length - 2]?.key;
    const byCategory = new Map<string, number>();

    for (const e of expenses ?? []) {
      const key = e.date.slice(0, 7);
      if (byMonth.has(key)) byMonth.set(key, byMonth.get(key)! + e.amount);
      if (key === currentKey) {
        byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
      }
    }

    const trend = months.map((m) => ({ ...m, total: byMonth.get(m.key) ?? 0 }));
    const currentTotal = byMonth.get(currentKey) ?? 0;
    const prevTotal = prevKey ? (byMonth.get(prevKey) ?? 0) : 0;

    const sorted = [...byCategory.entries()]
      .map(([value, amount]) => ({ ...categoryInfo(value), key: value, amount }))
      .sort((a, b) => b.amount - a.amount);

    const top = sorted.slice(0, TOP_CATEGORIES);
    const rest = sorted.slice(TOP_CATEGORIES);
    // Oltre le prime cinque le fette diventano illeggibili: si aggregano in una voce sola.
    if (rest.length > 0) {
      top.push({
        key: "__other__",
        value: "__other__",
        label: `Altre ${rest.length}`,
        emoji: "➕",
        color: OTHER_COLOR,
        amount: rest.reduce((s, r) => s + r.amount, 0),
      });
    }

    const maxMonth = Math.max(...trend.map((t) => t.total), 0);
    const monthsWithSpend = trend.filter((t) => t.total > 0);
    const average =
      monthsWithSpend.length > 0
        ? monthsWithSpend.reduce((s, t) => s + t.total, 0) / monthsWithSpend.length
        : 0;

    return { trend, currentTotal, prevTotal, categories: top, maxMonth, average, prevKey };
  }, [expenses, months]);

  const hasData = stats.trend.some((t) => t.total > 0);
  const delta = stats.currentTotal - stats.prevTotal;
  const deltaPct = stats.prevTotal > 0 ? (delta / stats.prevTotal) * 100 : null;

  if (isLoading && !expenses) {
    return (
      <View className="flex-1" style={{ gap: 12 }}>
        <View className="mx-4 bg-white rounded-2xl px-4 py-4" style={{ gap: 10 }}>
          <Skeleton width="40%" height={10} />
          <Skeleton width="55%" height={26} />
          <Skeleton width="70%" height={11} />
        </View>
        <View className="mx-4 bg-white rounded-2xl px-4 py-4" style={{ gap: 10 }}>
          <Skeleton width="30%" height={12} />
          <Skeleton height={120} radius={6} />
        </View>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View className="flex-1 items-center py-20 px-8">
        <Text className="text-5xl mb-4">📈</Text>
        <Text className="text-base font-semibold text-gray-700 text-center">
          Ancora nessun dato da analizzare
        </Text>
        <Text className="text-sm text-gray-400 text-center mt-1">
          Aggiungi qualche spesa: i grafici compaiono da soli.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />
      }
    >
      {/* Totale del mese + confronto col mese precedente */}
      <View className="mx-4 bg-white rounded-2xl px-4 py-4">
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Speso questo mese
        </Text>
        <Text className="text-3xl font-bold text-gray-900 mt-1">{euro(stats.currentTotal)}</Text>

        {stats.prevTotal > 0 ? (
          <Text className="text-sm text-gray-500 mt-1">
            <Text className={delta > 0 ? "text-red-500 font-semibold" : "text-emerald-600 font-semibold"}>
              {delta > 0 ? "▲" : "▼"} {euro(Math.abs(delta))}
              {deltaPct !== null ? ` (${Math.abs(deltaPct).toFixed(0)}%)` : ""}
            </Text>{" "}
            rispetto al mese scorso
          </Text>
        ) : (
          <Text className="text-sm text-gray-400 mt-1">Nessuna spesa il mese scorso</Text>
        )}

        <Text className="text-xs text-gray-400 mt-2">
          Media sui mesi con spese: {euro(stats.average)}
        </Text>
      </View>

      {/* Andamento */}
      <View className="mx-4 bg-white rounded-2xl px-4 py-4">
        <Text className="text-sm font-semibold text-gray-800 mb-1">Andamento</Text>
        <Text className="text-xs text-gray-400 mb-3">Totale speso negli ultimi {MONTHS_SHOWN} mesi</Text>
        <TrendChart data={stats.trend} maxValue={stats.maxMonth} />
      </View>

      {/* Categorie */}
      <View className="mx-4 bg-white rounded-2xl px-4 py-4">
        <Text className="text-sm font-semibold text-gray-800 mb-1">Dove sono finiti i soldi</Text>
        <Text className="text-xs text-gray-400 mb-4">
          Categorie principali di questo mese, sul totale di {euro(stats.currentTotal)}
        </Text>
        {stats.categories.length > 0 ? (
          <CategoryBars rows={stats.categories} total={stats.currentTotal} />
        ) : (
          <Text className="text-sm text-gray-400">Nessuna spesa questo mese.</Text>
        )}
      </View>
    </ScrollView>
  );
}
