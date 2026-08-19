import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useBudgetOverview, useBudgetMutations } from "@/hooks/useBudget";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { BudgetLineRow } from "./BudgetLineRow";
import { CategoryPicker } from "./CategoryPicker";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatMonth,
  parseAmount,
  shiftPeriod,
  toPeriodKey,
} from "@/lib/format";
import type { BudgetLine } from "@/types/database";

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-row justify-between items-baseline">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className={`text-sm font-semibold ${tone ?? "text-gray-900"}`}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, total }: { title: string; total: number }) {
  return (
    <View className="flex-row justify-between items-baseline px-5 mt-4 mb-2">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</Text>
      <Text className="text-xs font-semibold text-gray-400">{formatCurrencyCompact(total)}</Text>
    </View>
  );
}

export function BudgetTab() {
  const router = useRouter();
  const [periodKey, setPeriodKey] = useState(() => toPeriodKey(new Date()));

  const { overview, isLoading, isFetching, refetch } = useBudgetOverview(periodKey);
  const { setLine, setIncome, copyFromPreviousMonth } = useBudgetMutations(periodKey);
  const { canWrite } = useHouseholdMembers();

  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [pickingCategory, setPickingCategory] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [rollover, setRollover] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState<string | null>(null);

  const lines = overview?.lines ?? [];
  const fixed = useMemo(() => lines.filter((l) => l.kind === "FIXED"), [lines]);
  const variable = useMemo(() => lines.filter((l) => l.kind === "VARIABLE"), [lines]);
  const planned = overview?.planned ?? 0;
  const spent = overview?.spent ?? 0;
  const isEmptyMonth = planned === 0 && spent === 0;

  function openEditor(line: BudgetLine) {
    if (!canWrite) return;
    setEditing(line);
    setNewCategoryId(line.category_id);
    setAmount(line.planned ? String(line.planned) : "");
    setRollover(line.rollover_enabled);
  }

  function openNewLine() {
    if (!canWrite) return;
    setEditing(null);
    setNewCategoryId(null);
    setAmount("");
    setRollover(false);
    setPickingCategory(true);
  }

  function closeEditor() {
    setEditing(null);
    setPickingCategory(false);
    setNewCategoryId(null);
    setAmount("");
  }

  async function save() {
    const categoryId = editing?.category_id ?? newCategoryId;
    if (!categoryId) {
      Alert.alert("Pick a category", "Choose which category this budget is for.");
      return;
    }
    const parsed = parseAmount(amount);
    if (parsed == null || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    try {
      await setLine.mutateAsync({ categoryId, amount: parsed, rollover });
      closeEditor();
    } catch (error) {
      Alert.alert("Could not save", (error as Error).message);
    }
  }

  function removeLine(line: BudgetLine) {
    if (!canWrite || line.status === "UNPLANNED") return;
    Alert.alert("Remove budget", `Remove the budget for ${line.label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setLine.mutate({ categoryId: line.category_id, amount: null }),
      },
    ]);
  }

  async function saveIncome() {
    const parsed = parseAmount(incomeDraft ?? "");
    setIncomeDraft(null);
    if (parsed == null || parsed < 0) return;
    try {
      await setIncome.mutateAsync(parsed);
    } catch (error) {
      Alert.alert("Could not save", (error as Error).message);
    }
  }

  return (
    <View className="flex-1">
      {/* Month navigation */}
      <View className="flex-row items-center justify-between mx-4 mb-3">
        <Pressable
          onPress={() => setPeriodKey(shiftPeriod(periodKey, -1))}
          accessibilityLabel="Previous month"
          className="w-9 h-9 rounded-full bg-white items-center justify-center"
        >
          <Text className="text-lg text-gray-500">‹</Text>
        </Pressable>

        <Text className="text-base font-semibold text-gray-900">{formatMonth(periodKey)}</Text>

        <View className="flex-row" style={{ gap: 8 }}>
          <Pressable
            onPress={() => router.push("/(app)/finance/recurring")}
            accessibilityLabel="Fixed expenses"
            className="w-9 h-9 rounded-full bg-white items-center justify-center"
          >
            <Text className="text-base">🔁</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(app)/finance/categories")}
            accessibilityLabel="Categories"
            className="w-9 h-9 rounded-full bg-white items-center justify-center"
          >
            <Text className="text-base">⚙️</Text>
          </Pressable>
          <Pressable
            onPress={() => setPeriodKey(shiftPeriod(periodKey, 1))}
            accessibilityLabel="Next month"
            className="w-9 h-9 rounded-full bg-white items-center justify-center"
          >
            <Text className="text-lg text-gray-500">›</Text>
          </Pressable>
        </View>
      </View>

      {/* Summary */}
      <View className="mx-4 mb-1 bg-white rounded-2xl px-4 py-3" style={{ gap: 4 }}>
        <Pressable
          onPress={() => canWrite && setIncomeDraft(String(overview?.expected_income ?? 0))}
          className="flex-row justify-between items-baseline"
        >
          <Text className="text-sm text-gray-500">Expected income</Text>
          <Text className="text-sm font-semibold text-gray-900">
            {formatCurrency(overview?.expected_income)}
          </Text>
        </Pressable>
        <SummaryRow label="Planned" value={formatCurrency(planned)} />
        <SummaryRow
          label="Spent"
          value={formatCurrency(spent)}
          tone={spent > planned && planned > 0 ? "text-red-500" : "text-emerald-600"}
        />

        <View className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
          <View
            className="h-full rounded-full"
            style={{
              width: `${planned > 0 ? Math.min(spent / planned, 1) * 100 : 0}%`,
              backgroundColor: spent > planned ? "#ef4444" : "#10b981",
            }}
          />
        </View>

        <SummaryRow
          label="Left to allocate"
          value={formatCurrency(overview?.available)}
          tone={(overview?.available ?? 0) < 0 ? "text-red-500" : "text-gray-900"}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#10b981" />
        }
      >
        {isLoading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : isEmptyMonth ? (
          <View className="items-center py-16 px-8">
            <Text className="text-5xl mb-4">📊</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">
              Nothing planned for {formatMonth(periodKey)}
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-1 mb-6">
              Set a monthly budget per category, or start from last month.
            </Text>
            <View className="flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={openNewLine}
                className="bg-emerald-500 px-5 py-3 rounded-2xl"
              >
                <Text className="text-white font-semibold text-sm">Create a budget</Text>
              </Pressable>
              <Pressable
                onPress={() => copyFromPreviousMonth.mutate(shiftPeriod(periodKey, -1))}
                className="bg-white border border-gray-200 px-5 py-3 rounded-2xl"
              >
                <Text className="text-gray-700 font-semibold text-sm">Copy last month</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {fixed.length > 0 && (
              <>
                <SectionHeader
                  title="Fixed"
                  total={fixed.reduce((sum, l) => sum + l.spent, 0)}
                />
                {fixed.map((line) => (
                  <BudgetLineRow
                    key={line.category_id}
                    line={line}
                    onPress={() => openEditor(line)}
                    onLongPress={() => removeLine(line)}
                  />
                ))}
              </>
            )}

            {variable.length > 0 && (
              <>
                <SectionHeader
                  title="Variable"
                  total={variable.reduce((sum, l) => sum + l.spent, 0)}
                />
                {variable.map((line) => (
                  <BudgetLineRow
                    key={line.category_id}
                    line={line}
                    onPress={() => openEditor(line)}
                    onLongPress={() => removeLine(line)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {canWrite && (
        <Pressable
          onPress={openNewLine}
          accessibilityLabel="Set a budget"
          className="absolute bottom-8 right-6 w-14 h-14 bg-emerald-500 rounded-full items-center justify-center"
          style={{
            shadowColor: "#10b981",
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>
            +
          </Text>
        </Pressable>
      )}

      {/* Budget line editor */}
      <Modal
        visible={editing != null || pickingCategory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={closeEditor} className="py-1 px-2">
              <Text className="text-base text-gray-500">Cancel</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">
              {editing ? editing.label : "New budget"}
            </Text>
            <Pressable
              onPress={save}
              disabled={!amount.trim() || setLine.isPending}
              className={`py-1.5 px-4 rounded-full ${
                amount.trim() && !setLine.isPending ? "bg-emerald-500" : "bg-gray-200"
              }`}
            >
              {setLine.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  className={`text-sm font-semibold ${
                    amount.trim() ? "text-white" : "text-gray-400"
                  }`}
                >
                  Save
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 20 }}
          >
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Monthly budget
              </Text>
              <TextInput
                className="text-3xl font-bold text-gray-900 border-b border-gray-100 pb-2"
                placeholder="0"
                placeholderTextColor="#d1d5db"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {!editing && (
              <CategoryPicker label="Category" value={newCategoryId} onChange={setNewCategoryId} />
            )}

            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-medium text-gray-800">Carry over what's left</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  When the month closes, the leftover (or the overspend) moves to next month.
                </Text>
              </View>
              <Switch
                value={rollover}
                onValueChange={setRollover}
                trackColor={{ true: "#10b981", false: "#e5e7eb" }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Expected income */}
      <Modal
        visible={incomeDraft != null}
        animationType="fade"
        transparent
        onRequestClose={() => setIncomeDraft(null)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="bg-white rounded-2xl px-5 py-5 w-full" style={{ gap: 14 }}>
            <Text className="text-base font-semibold text-gray-900">Expected income</Text>
            <Text className="text-xs text-gray-500">
              What the household expects to earn in {formatMonth(periodKey)}.
            </Text>
            <TextInput
              className="text-2xl font-bold text-gray-900 border-b border-gray-100 pb-2"
              placeholder="0"
              placeholderTextColor="#d1d5db"
              value={incomeDraft ?? ""}
              onChangeText={setIncomeDraft}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View className="flex-row justify-end" style={{ gap: 12 }}>
              <Pressable onPress={() => setIncomeDraft(null)} className="py-2 px-3">
                <Text className="text-sm text-gray-500">Cancel</Text>
              </Pressable>
              <Pressable onPress={saveIncome} className="bg-emerald-500 py-2 px-4 rounded-full">
                <Text className="text-sm font-semibold text-white">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
