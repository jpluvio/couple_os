import { View, Text, Pressable } from "react-native";
import { formatCurrency } from "@/lib/format";
import type { BudgetLine } from "@/types/database";

const STATUS_STYLE: Record<
  BudgetLine["status"],
  { bar: string; text: string; note: string | null }
> = {
  OK:        { bar: "#10b981", text: "text-gray-900", note: null },
  WARNING:   { bar: "#f59e0b", text: "text-amber-600", note: "Almost spent" },
  OVER:      { bar: "#ef4444", text: "text-red-500",   note: "Over budget" },
  UNPLANNED: { bar: "#d1d5db", text: "text-gray-900", note: "No budget set" },
};

interface Props {
  line: BudgetLine;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * One category inside the month. Status is never conveyed by colour alone:
 * a warning or an overrun always carries its own words too.
 */
export function BudgetLineRow({ line, onPress, onLongPress }: Props) {
  const style = STATUS_STYLE[line.status];
  const ratio = line.progress_ratio ?? 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${line.label}: ${formatCurrency(line.spent)} spent of ${formatCurrency(
        line.effective
      )}${style.note ? `, ${style.note}` : ""}`}
      className="bg-white mx-4 mb-2 rounded-xl px-4 py-3"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1" style={{ gap: 8 }}>
          <Text className="text-xl">{line.emoji ?? "📦"}</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
              {line.label}
            </Text>
            {line.carried !== 0 ? (
              <Text className="text-xs text-gray-400 mt-0.5">
                {line.carried > 0 ? "+" : ""}
                {formatCurrency(line.carried)} carried over
              </Text>
            ) : null}
          </View>
        </View>

        <View className="items-end">
          <Text className={`text-sm font-bold ${style.text}`}>
            {formatCurrency(line.spent)}
            {line.status !== "UNPLANNED" ? (
              <Text className="text-gray-400 font-normal">
                {" "}
                / {formatCurrency(line.effective)}
              </Text>
            ) : null}
          </Text>
          {style.note ? (
            <Text className={`text-xs ${style.text}`}>{style.note}</Text>
          ) : line.status === "OK" ? (
            <Text className="text-xs text-gray-400">
              {formatCurrency(line.remaining)} left
            </Text>
          ) : null}
        </View>
      </View>

      {line.status !== "UNPLANNED" ? (
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
          <View
            className="h-full rounded-full"
            style={{ width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: style.bar }}
          />
        </View>
      ) : null}
    </Pressable>
  );
}
