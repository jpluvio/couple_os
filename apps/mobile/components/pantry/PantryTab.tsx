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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SkeletonRowList } from "@/components/ui/Skeleton";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { useCouple } from "@/hooks/useCouple";
import type { PantryCategory } from "@/types/database";

type PantryItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  expires_at: string | null;
  category: PantryCategory;
  couple_id: string;
  created_at: string;
};

const CATEGORIES: { value: PantryCategory; label: string; emoji: string }[] = [
  { value: "FRIDGE", label: "Frigo", emoji: "🧊" },
  { value: "FREEZER", label: "Freezer", emoji: "❄️" },
  { value: "PANTRY", label: "Dispensa", emoji: "🏠" },
  { value: "BATHROOM", label: "Bagno", emoji: "🚿" },
  { value: "OTHER", label: "Altro", emoji: "📦" },
];

function formatExpiry(dateStr: string): { label: string; color: string } {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: "Scaduto", color: "#ef4444" };
  if (diff === 0) return { label: "Scade oggi", color: "#f97316" };
  if (diff === 1) return { label: "Scade domani", color: "#f97316" };
  if (diff <= 5) return { label: `Scade in ${diff}gg`, color: "#f59e0b" };
  return {
    label: date.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
    color: "#9ca3af",
  };
}

export function PantryTab() {
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";
  const qKey = ["pantry-items", coupleId];

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [category, setCategory] = useState<PantryCategory>("PANTRY");
  const [loading, setLoading] = useState(false);

  const { data: items, isLoading, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("couple_id", coupleId)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as PantryItem[];
    },
  });

  async function addItem() {
    if (!name.trim() || !coupleId) return;
    setLoading(true);
    try {
      await supabase.from("pantry_items").insert({
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit.trim() || null,
        expires_at: expiresAt.trim() ? new Date(expiresAt.trim()).toISOString() : null,
        category,
        couple_id: coupleId,
      });
      queryClient.invalidateQueries({ queryKey: qKey });
      resetForm();
      setShowAdd(false);
    } catch {
      showAlert("Errore", "Impossibile aggiungere il prodotto.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setQuantity("");
    setUnit("");
    setExpiresAt("");
    setCategory("PANTRY");
  }

  async function deleteItem(id: string) {
    await supabase.from("pantry_items").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: qKey });
  }

  function handleLongPress(item: PantryItem) {
    showAlert(item.name, undefined, [
      { text: "🗑️ Elimina", style: "destructive", onPress: () => deleteItem(item.id) },
      { text: "Annulla", style: "cancel" },
    ]);
  }

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: (items ?? []).filter((i) => i.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />
        }
      >
        {isLoading && grouped.length === 0 ? (
          <SkeletonRowList count={5} />
        ) : grouped.length === 0 ? (
          <View className="items-center py-20 px-8">
            <Text className="text-5xl mb-4">🛒</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">Dispensa vuota</Text>
            <Text className="text-sm text-gray-400 text-center mt-1">
              Aggiungi i prodotti che hai in casa!
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.value} className="mb-4">
              <View className="px-4 pb-2 flex-row items-center" style={{ gap: 6 }}>
                <Text className="text-base">{group.emoji}</Text>
                <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {group.label}
                </Text>
                <Text className="text-xs text-gray-400">({group.items.length})</Text>
              </View>
              {group.items.map((item) => {
                const expiry = item.expires_at ? formatExpiry(item.expires_at) : null;
                return (
                  <SwipeToDelete
                    key={item.id}
                    onDelete={() => deleteItem(item.id)}
                    confirmTitle="Eliminare il prodotto?"
                    confirmMessage={item.name}
                  >
                  <Pressable
                    onLongPress={() => handleLongPress(item)}
                    className="bg-white mx-4 mb-2 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-base text-gray-800 flex-1" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      {(item.quantity != null || item.unit) && (
                        <Text className="text-sm text-gray-500">
                          {item.quantity != null ? item.quantity : ""}{item.unit ? ` ${item.unit}` : ""}
                        </Text>
                      )}
                      {expiry && (
                        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: expiry.color + "20" }}>
                          <Text className="text-xs font-medium" style={{ color: expiry.color }}>
                            {expiry.label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                  </SwipeToDelete>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setShowAdd(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-orange-500 rounded-full items-center justify-center"
        style={{ shadowColor: "#f97316", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
      >
        <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>+</Text>
      </Pressable>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { resetForm(); setShowAdd(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={() => { resetForm(); setShowAdd(false); }} className="py-1 px-2">
              <Text className="text-base text-gray-500">Annulla</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">Nuovo prodotto</Text>
            <Pressable
              onPress={addItem}
              disabled={!name.trim() || loading}
              className={`py-1.5 px-4 rounded-full ${name.trim() && !loading ? "bg-orange-500" : "bg-gray-200"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${name.trim() ? "text-white" : "text-gray-400"}`}>Aggiungi</Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            <TextInput
              className="text-base text-gray-800 border-b border-gray-100 pb-3"
              placeholder="Nome prodotto"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quantità</Text>
                <TextInput
                  className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                  placeholder="es. 2"
                  placeholderTextColor="#9ca3af"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Unità</Text>
                <TextInput
                  className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                  placeholder="es. kg, L, pz"
                  placeholderTextColor="#9ca3af"
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scadenza (AAAA-MM-GG)</Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="es. 2026-06-30"
                placeholderTextColor="#9ca3af"
                value={expiresAt}
                onChangeText={setExpiresAt}
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoria</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    className={`flex-row items-center px-3 py-2 rounded-xl border ${
                      category === cat.value ? "bg-orange-500 border-orange-500" : "bg-white border-gray-200"
                    }`}
                    style={{ gap: 4 }}
                  >
                    <Text>{cat.emoji}</Text>
                    <Text className={`text-sm font-medium ${category === cat.value ? "text-white" : "text-gray-700"}`}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
