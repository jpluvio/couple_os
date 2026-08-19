import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { CategoryChip } from "./CategoryChip";
import { useCategories } from "@/hooks/useCategories";

interface Props {
  value: string | null;
  onChange: (categoryId: string) => void;
  /** Single scrollable row (quick add) instead of a wrapping grid. */
  horizontal?: boolean;
  label?: string;
}

/**
 * The single category selector of the app. It replaced the three hardcoded
 * arrays that used to live in ExpensesTab, BudgetTab and packages/shared.
 */
export function CategoryPicker({ value, onChange, horizontal, label }: Props) {
  const { active, isLoading } = useCategories();

  if (isLoading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#10b981" />
      </View>
    );
  }

  if (active.length === 0) {
    return (
      <Text className="text-sm text-gray-400">
        No categories yet — add one from Budget › Categories.
      </Text>
    );
  }

  const chips = active.map((category) => (
    <CategoryChip
      key={category.id}
      category={category}
      selected={value === category.id}
      onPress={() => onChange(category.id)}
      compact={horizontal}
    />
  ));

  return (
    <View>
      {label ? (
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {label}
        </Text>
      ) : null}

      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {chips}
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {chips}
        </View>
      )}
    </View>
  );
}
