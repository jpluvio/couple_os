import { useState } from "react";
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { useRecurringExpenses, useRecurringMutations } from "@/hooks/useRecurringExpenses";
import { formatCurrency, formatShortDate, parseAmount } from "@/lib/format";

/**
 * Fixed expenses whose amount changes (the electricity bill) do not post
 * themselves: they land here, at the top of the expense list, and are
 * confirmed inline.
 */
export function PendingRecurringBanner() {
  const { pending } = useRecurringExpenses();
  const { confirm, skip } = useRecurringMutations();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (pending.length === 0) return null;

  return (
    <View className="mx-4 mb-3" style={{ gap: 8 }}>
      {pending.map((item) => {
        const draft = drafts[item.id] ?? String(item.amount);
        return (
          <View key={item.id} className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <Text className="text-sm font-semibold text-amber-900">
              {item.label} — confirm this month's amount
            </Text>
            <Text className="text-xs text-amber-700 mt-0.5">
              Due {item.pending_occurrence ? formatShortDate(item.pending_occurrence) : ""} · last
              time {formatCurrency(item.amount)}
            </Text>

            <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
              <TextInput
                className="flex-1 bg-white rounded-xl px-3 py-2 text-base text-gray-900"
                value={draft}
                onChangeText={(text) => setDrafts((d) => ({ ...d, [item.id]: text }))}
                keyboardType="decimal-pad"
                accessibilityLabel={`Amount for ${item.label}`}
              />
              <Pressable
                onPress={() => {
                  const parsed = parseAmount(draft);
                  if (parsed == null || parsed <= 0) {
                    Alert.alert("Invalid amount", "Enter an amount greater than zero.");
                    return;
                  }
                  confirm.mutate({ id: item.id, amount: parsed });
                }}
                className="bg-amber-500 rounded-xl px-4 py-2.5"
              >
                {confirm.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white text-sm font-semibold">Confirm</Text>
                )}
              </Pressable>
              <Pressable onPress={() => skip.mutate(item.id)} className="px-2 py-2.5">
                <Text className="text-amber-700 text-sm">Skip</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}
