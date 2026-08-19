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
import { useCategories, useCategoryMutations } from "@/hooks/useCategories";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import type { ExpenseCategory, ExpenseKind } from "@/types/database";

const EMOJI_CHOICES = [
  "🏠", "💡", "📺", "🛡️", "🛒", "🍕", "🚗", "💊", "🎉", "👕", "🔧", "📦",
  "✈️", "🎓", "🐶", "🎁", "☕", "🏋️", "💇", "📱",
];

const COLOR_CHOICES = [
  "#10b981", "#0ea5e9", "#8b5cf6", "#ef4444", "#f59e0b",
  "#ec4899", "#14b8a6", "#f97316", "#3b82f6", "#64748b",
];

export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, isLoading } = useCategories();
  const { create, update, archive, remove } = useCategoryMutations();
  const { canWrite } = useHouseholdMembers();

  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState<string>("📦");
  const [color, setColor] = useState<string>("#10b981");
  const [kind, setKind] = useState<ExpenseKind>("VARIABLE");
  const [showArchived, setShowArchived] = useState(false);

  const visible = categories.filter((c) => showArchived || !c.archived);
  const fixed = visible.filter((c) => c.kind === "FIXED");
  const variable = visible.filter((c) => c.kind === "VARIABLE");

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setLabel("");
    setEmoji("📦");
    setColor("#10b981");
    setKind("VARIABLE");
  }

  function openEdit(category: ExpenseCategory) {
    if (!canWrite) return;
    setEditing(category);
    setCreating(false);
    setLabel(category.label);
    setEmoji(category.emoji ?? "📦");
    setColor(category.color ?? "#10b981");
    setKind(category.kind);
  }

  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function save() {
    if (!label.trim()) {
      Alert.alert("A name is required", "Give the category a name.");
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, label: label.trim(), emoji, color, kind });
      } else {
        await create.mutateAsync({ label: label.trim(), emoji, color, kind });
      }
      close();
    } catch (error) {
      Alert.alert("Could not save", (error as Error).message);
    }
  }

  function confirmArchive(category: ExpenseCategory) {
    if (!canWrite) return;
    if (category.archived) {
      archive.mutate({ id: category.id, archived: false });
      return;
    }
    Alert.alert(
      category.label,
      "Archiving hides the category from the pickers and keeps every past expense on it. Deleting is only possible when nothing uses it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => archive.mutate({ id: category.id, archived: true }),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await remove.mutateAsync(category.id);
            } catch (error) {
              Alert.alert("Cannot delete this category", (error as Error).message);
            }
          },
        },
      ]
    );
  }

  function Section({ title, items }: { title: string; items: ExpenseCategory[] }) {
    if (items.length === 0) return null;
    return (
      <>
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 mt-4 mb-2">
          {title}
        </Text>
        {items.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => openEdit(category)}
            onLongPress={() => confirmArchive(category)}
            className="bg-white mx-4 mb-2 rounded-xl px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1" style={{ gap: 10 }}>
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${category.color ?? "#10b981"}22` }}
              >
                <Text className="text-lg">{category.emoji ?? "📦"}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-800">{category.label}</Text>
                {category.archived ? (
                  <Text className="text-xs text-gray-400 mt-0.5">Archived</Text>
                ) : null}
              </View>
            </View>
            <Text className="text-gray-300 text-lg">›</Text>
          </Pressable>
        ))}
      </>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Pressable onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-base text-gray-500">‹ Back</Text>
        </Pressable>
        <Text className="text-base font-semibold text-gray-900">Categories</Text>
        <Pressable onPress={openCreate} disabled={!canWrite} className="py-1 pl-3">
          <Text className={`text-base ${canWrite ? "text-emerald-600" : "text-gray-300"}`}>New</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <>
            <Section title="Fixed" items={fixed} />
            <Section title="Variable" items={variable} />

            <Pressable
              onPress={() => setShowArchived((v) => !v)}
              className="mx-4 mt-6 py-3 items-center"
            >
              <Text className="text-sm text-gray-500">
                {showArchived ? "Hide archived" : "Show archived"}
              </Text>
            </Pressable>

            <Text className="text-xs text-gray-400 px-6 text-center mt-2">
              Tap to edit, hold to archive. A category with expenses on it can be archived but
              never deleted, so your history stays intact.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal
        visible={creating || editing != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={close} className="py-1 px-2">
              <Text className="text-base text-gray-500">Cancel</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">
              {editing ? "Edit category" : "New category"}
            </Text>
            <Pressable
              onPress={save}
              disabled={!label.trim() || create.isPending || update.isPending}
              className={`py-1.5 px-4 rounded-full ${
                label.trim() ? "bg-emerald-500" : "bg-gray-200"
              }`}
            >
              {create.isPending || update.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  className={`text-sm font-semibold ${
                    label.trim() ? "text-white" : "text-gray-400"
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
            contentContainerStyle={{ gap: 22 }}
          >
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Name
              </Text>
              <TextInput
                className="text-lg text-gray-900 border-b border-gray-100 pb-2"
                placeholder="e.g. Holidays"
                placeholderTextColor="#d1d5db"
                value={label}
                onChangeText={setLabel}
                autoFocus
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Icon
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {EMOJI_CHOICES.map((choice) => (
                  <Pressable
                    key={choice}
                    onPress={() => setEmoji(choice)}
                    className={`w-11 h-11 rounded-xl items-center justify-center border ${
                      emoji === choice ? "border-emerald-500 bg-emerald-50" : "border-gray-200"
                    }`}
                  >
                    <Text className="text-lg">{choice}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Colour
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {COLOR_CHOICES.map((choice) => (
                  <Pressable
                    key={choice}
                    onPress={() => setColor(choice)}
                    accessibilityLabel={`Colour ${choice}`}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: choice }}
                  >
                    {color === choice ? <Text className="text-white text-base">✓</Text> : null}
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-medium text-gray-800">Fixed cost</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  Rent, bills, subscriptions — the part of the budget you cannot compress.
                </Text>
              </View>
              <Switch
                value={kind === "FIXED"}
                onValueChange={(on) => setKind(on ? "FIXED" : "VARIABLE")}
                trackColor={{ true: "#10b981", false: "#e5e7eb" }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
