import { useState } from "react";
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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  RECURRENCE_FREQUENCIES,
  RECURRENCE_LABELS,
  type RecurrenceFrequency,
} from "@couple-os/shared";
import { useRecurringExpenses, useRecurringMutations } from "@/hooks/useRecurringExpenses";
import { useCategories } from "@/hooks/useCategories";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { RecurringCard } from "@/components/finance/RecurringCard";
import { CategoryPicker } from "@/components/finance/CategoryPicker";
import { parseAmount, todayISO } from "@/lib/format";
import type { RecurringExpense } from "@/types/database";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RecurringScreen() {
  const router = useRouter();
  const { recurring, isLoading } = useRecurringExpenses();
  const { create, update, remove } = useRecurringMutations();
  const { byId: categoriesById, active: activeCategories } = useCategories();
  const { canWrite } = useHouseholdMembers();

  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startDate, setStartDate] = useState(todayISO());
  const [variableAmount, setVariableAmount] = useState(false);

  function openCreate() {
    if (!canWrite) return;
    setEditing(null);
    setLabel("");
    setAmount("");
    setCategoryId(activeCategories.find((c) => c.kind === "FIXED")?.id ?? activeCategories[0]?.id ?? null);
    setFrequency("MONTHLY");
    setDayOfMonth("1");
    setDayOfWeek(1);
    setStartDate(todayISO());
    setVariableAmount(false);
    setOpen(true);
  }

  function openEdit(item: RecurringExpense) {
    if (!canWrite) return;
    setEditing(item);
    setLabel(item.label);
    setAmount(String(item.amount));
    setCategoryId(item.category_id);
    setFrequency(item.frequency);
    setDayOfMonth(item.day_of_month != null ? String(item.day_of_month) : "1");
    setDayOfWeek(item.day_of_week ?? 1);
    setStartDate(item.start_date);
    setVariableAmount(item.variable_amount);
    setOpen(true);
  }

  async function save() {
    const parsedAmount = parseAmount(amount);
    if (!label.trim()) {
      Alert.alert("A name is required", "Give this fixed expense a name.");
      return;
    }
    if (parsedAmount == null || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Pick a category", "Every fixed expense belongs to a category.");
      return;
    }

    const parsedDay = Number.parseInt(dayOfMonth, 10);
    const payload = {
      label: label.trim(),
      amount: parsedAmount,
      category_id: categoryId,
      frequency,
      day_of_month:
        frequency === "WEEKLY" ? null : Number.isFinite(parsedDay) ? parsedDay : 1,
      day_of_week: frequency === "WEEKLY" ? dayOfWeek : null,
      start_date: startDate,
      variable_amount: variableAmount,
      auto_post: !variableAmount,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
      } else {
        await create.mutateAsync({
          ...payload,
          day_of_month: payload.day_of_month ?? undefined,
          day_of_week: payload.day_of_week ?? undefined,
        });
      }
      setOpen(false);
    } catch (error) {
      Alert.alert("Could not save", (error as Error).message);
    }
  }

  function confirmDelete(item: RecurringExpense) {
    if (!canWrite) return;
    Alert.alert(item.label, "Pause it to stop future postings, or delete it entirely.", [
      { text: "Cancel", style: "cancel" },
      {
        text: item.active ? "Pause" : "Resume",
        onPress: () => update.mutate({ id: item.id, active: !item.active }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => remove.mutate(item.id),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Pressable onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-base text-gray-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-gray-900">Fixed expenses</Text>
        <Pressable onPress={openCreate} disabled={!canWrite} className="py-1 pl-3">
          <Text className={`text-base ${canWrite ? "text-emerald-600" : "text-gray-300"}`}>New</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : recurring.length === 0 ? (
          <View className="items-center py-16 px-8">
            <Text className="text-5xl mb-4">🔁</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">
              No fixed expenses yet
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-1 mb-6">
              Declare rent, bills and subscriptions once — they post themselves every period.
            </Text>
            <Pressable onPress={openCreate} className="bg-emerald-500 px-5 py-3 rounded-2xl">
              <Text className="text-white font-semibold text-sm">Add a fixed expense</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="h-2" />
            {recurring.map((item) => (
              <RecurringCard
                key={item.id}
                item={item}
                category={item.category_id ? categoriesById.get(item.category_id) : null}
                nextDue={item.pending_occurrence}
                onPress={() => openEdit(item)}
                onLongPress={() => confirmDelete(item)}
              />
            ))}
            <Text className="text-xs text-gray-400 px-6 text-center mt-4">
              Tap to edit, hold to pause or delete. Amounts that change every month are confirmed
              from the expense list instead of posting on their own.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={() => setOpen(false)} className="py-1 px-2">
              <Text className="text-base text-gray-500">Cancel</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">
              {editing ? "Edit fixed expense" : "New fixed expense"}
            </Text>
            <Pressable
              onPress={save}
              disabled={create.isPending || update.isPending}
              className="py-1.5 px-4 rounded-full bg-emerald-500"
            >
              {create.isPending || update.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 22, paddingBottom: 40 }}
          >
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Name
              </Text>
              <TextInput
                className="text-lg text-gray-900 border-b border-gray-100 pb-2"
                placeholder="e.g. Rent"
                placeholderTextColor="#d1d5db"
                value={label}
                onChangeText={setLabel}
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Amount
              </Text>
              <TextInput
                className="text-3xl font-bold text-gray-900 border-b border-gray-100 pb-2"
                placeholder="0.00"
                placeholderTextColor="#d1d5db"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <CategoryPicker label="Category" value={categoryId} onChange={setCategoryId} />

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                How often
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {RECURRENCE_FREQUENCIES.map((freq) => (
                  <Pressable
                    key={freq}
                    onPress={() => setFrequency(freq)}
                    className={`px-3 py-2 rounded-xl border ${
                      frequency === freq
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        frequency === freq ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {RECURRENCE_LABELS[freq]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {frequency === "WEEKLY" ? (
              <View>
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Day of the week
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {WEEKDAYS.map((name, index) => (
                    <Pressable
                      key={name}
                      onPress={() => setDayOfWeek(index)}
                      className={`px-3 py-2 rounded-xl border ${
                        dayOfWeek === index
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          dayOfWeek === index ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Day of the month
                </Text>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <TextInput
                    className="flex-1 text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                    placeholder="1"
                    placeholderTextColor="#9ca3af"
                    value={dayOfMonth}
                    onChangeText={setDayOfMonth}
                    keyboardType="number-pad"
                  />
                  <Pressable
                    onPress={() => setDayOfMonth("-1")}
                    className={`px-3 py-2 rounded-xl ${
                      dayOfMonth === "-1" ? "bg-emerald-500" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        dayOfMonth === "-1" ? "text-white font-semibold" : "text-gray-600"
                      }`}
                    >
                      Last day
                    </Text>
                  </Pressable>
                </View>
                <Text className="text-xs text-gray-400 mt-1.5">
                  A day the month is too short for falls on its last day.
                </Text>
              </View>
            )}

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Starts on
              </Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-medium text-gray-800">The amount changes</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  For bills like electricity: the date is certain, the amount is not. It waits for
                  you to confirm instead of posting itself.
                </Text>
              </View>
              <Switch
                value={variableAmount}
                onValueChange={setVariableAmount}
                trackColor={{ true: "#10b981", false: "#e5e7eb" }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
