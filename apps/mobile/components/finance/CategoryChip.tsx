import { View, Text, Pressable } from "react-native";
import type { ExpenseCategory } from "@/types/database";

interface Props {
  category: ExpenseCategory;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
}

/**
 * The one way a category is rendered. Selection is never carried by colour
 * alone — the label is always there, and the selected state also changes the
 * border and the text weight.
 */
export function CategoryChip({ category, selected, onPress, onLongPress, compact }: Props) {
  const tint = category.color ?? "#10b981";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={category.label}
      className={`flex-row items-center rounded-xl border ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2"
      } ${selected ? "border-transparent" : "bg-white border-gray-200"}`}
      style={[{ gap: 5 }, selected ? { backgroundColor: tint } : null]}
    >
      <Text className={compact ? "text-sm" : "text-base"}>{category.emoji ?? "📦"}</Text>
      <Text
        className={`${compact ? "text-xs" : "text-sm"} ${
          selected ? "text-white font-semibold" : "text-gray-700 font-medium"
        }`}
        numberOfLines={1}
      >
        {category.label}
      </Text>
    </Pressable>
  );
}
