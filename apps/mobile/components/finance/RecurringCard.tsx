import { View, Text, Pressable } from "react-native";
import { RECURRENCE_LABELS } from "@couple-os/shared";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { ExpenseCategory, RecurringExpense } from "@/types/database";

interface Props {
  item: RecurringExpense;
  category?: ExpenseCategory | null;
  nextDue?: string | null;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function RecurringCard({ item, category, nextDue, onPress, onLongPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className={`mx-4 mb-2 rounded-xl px-4 py-3 ${item.active ? "bg-white" : "bg-gray-100"}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
          <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${category?.color ?? "#10b981"}22` }}
          >
            <Text className="text-lg">{category?.emoji ?? "🔁"}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5">
              {RECURRENCE_LABELS[item.frequency]}
              {nextDue ? ` · next ${formatShortDate(nextDue)}` : ""}
              {!item.active ? " · paused" : ""}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</Text>
          {item.variable_amount ? (
            <Text className="text-xs text-amber-600">needs confirming</Text>
          ) : item.auto_post ? (
            <Text className="text-xs text-gray-400">automatic</Text>
          ) : (
            <Text className="text-xs text-amber-600">manual</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
