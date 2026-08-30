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
import { Button } from "@/components/kit";
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from "react-native-reanimated";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTableSubscription } from "@/lib/realtime";
import { useCouple } from "@/hooks/useCouple";
import type { PantryCategory } from "@/types/database";

type ShoppingItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  checked: boolean;
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

function ShoppingRow({
  item,
  qKey,
  onLongPress,
}: {
  item: ShoppingItem;
  qKey: unknown[];
  onLongPress: () => void;
}) {
  const queryClient = useQueryClient();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  async function toggle() {
    scale.value = withTiming(0.93, { duration: 70 }, () => {
      scale.value = withTiming(1, { duration: 70 });
    });
    queryClient.setQueryData(qKey, (old: ShoppingItem[] | undefined) =>
      old?.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i))
    );
    await supabase.from("shopping_items").update({ checked: !item.checked }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: qKey });
  }

  return (
    <Pressable onPress={toggle} onLongPress={onLongPress}>
      <Animated.View
        style={animStyle}
        className={`bg-card mx-4 mb-2 rounded-card px-4 py-3 flex-row items-center ${item.checked ? "opacity-50" : ""}`}
      >
        <View
          className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
            item.checked ? "bg-accent border-accent" : "border-line"
          }`}
        >
          {item.checked && <Text className="text-white text-xs font-bold">✓</Text>}
        </View>
        <View className="flex-1">
          <Text className={`text-base text-ink ${item.checked ? "line-through" : ""}`} numberOfLines={1}>
            {item.name}
          </Text>
          {item.notes ? (
            <Text className="text-xs text-soft mt-0.5" numberOfLines={1}>{item.notes}</Text>
          ) : null}
        </View>
        {(item.quantity != null || item.unit) && (
          <Text className="text-sm text-muted ml-2">
            {item.quantity != null ? item.quantity : ""}{item.unit ? ` ${item.unit}` : ""}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function ShoppingTab() {
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";
  const qKey = ["shopping-items", coupleId];

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<PantryCategory>("PANTRY");
  const [loading, setLoading] = useState(false);

  const { data: items, isLoading, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("couple_id", coupleId)
        .order("checked", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ShoppingItem[];
    },
  });

  async function addItem() {
    if (!name.trim() || !coupleId) return;
    setLoading(true);
    try {
      await supabase.from("shopping_items").insert({
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit.trim() || null,
        notes: notes.trim() || null,
        category,
        couple_id: coupleId,
        checked: false,
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
    setNotes("");
    setCategory("PANTRY");
  }

  async function clearChecked() {
    const checked = (items ?? []).filter((i) => i.checked);
    if (checked.length === 0) return;
    showAlert(
      "Ho comprato",
      `${checked.length} ${checked.length === 1 ? "prodotto passa" : "prodotti passano"} in dispensa. ` +
        "Le scadenze le imposti dalla dispensa.",
      [
        {
          text: "Sposta in dispensa",
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc("stock_purchased_items", {
                p_scadenze: [],
              });
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: qKey });
              queryClient.invalidateQueries({ queryKey: ["pantry", coupleId] });
              queryClient.invalidateQueries({ queryKey: ["pantry-lite", coupleId] });
              const n = (data as unknown as number) ?? 0;
              showAlert("Fatto", `${n} in dispensa.`);
            } catch (err) {
              showAlert(
                "Non riuscito",
                "Impossibile spostare in dispensa. Se la migrazione 008 non è ancora applicata, questa funzione non è disponibile."
              );
              console.warn("[spesa] stock_purchased_items:", err);
            }
          },
        },
        { text: "Annulla", style: "cancel" },
      ]
    );
  }


  function handleLongPress(item: ShoppingItem) {
    showAlert(item.name, undefined, [
      {
        text: "🗑️ Elimina",
        style: "destructive",
        onPress: async () => {
          await supabase.from("shopping_items").delete().eq("id", item.id);
          queryClient.invalidateQueries({ queryKey: qKey });
        },
      },
      { text: "Annulla", style: "cancel" },
    ]);
  }

  const checkedCount = (items ?? []).filter((i) => i.checked).length;
  // Realtime: il partner aggiunge qualcosa e lo vedi senza ricaricare.
  useTableSubscription(
    coupleId ? `shopping-${coupleId}` : null,
    [{ table: "shopping_items", filter: `couple_id=eq.${coupleId}` }],
    () => queryClient.invalidateQueries({ queryKey: qKey })
  );

  const totalCount = items?.length ?? 0;

  return (
    <View className="flex-1">
      {/* Ciò che è spuntato è comprato: da qui entra in dispensa
          invece di essere cancellato. */}
      {checkedCount > 0 && (
        <View className="mx-6 mb-2 mt-1">
          <Button
            icon="cart"
            label={`Ho comprato ${checkedCount} ${checkedCount === 1 ? "prodotto" : "prodotti"}`}
            onPress={clearChecked}
          />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#a8562e" />
        }
      >
        {totalCount === 0 && !isLoading ? (
          <View className="items-center py-20 px-8">
            <Text className="text-center font-display text-[20px] text-ink">Lista della spesa vuota</Text>
            <Text className="mt-2 text-center text-[13.5px] text-soft">
              Aggiungi cosa devi comprare, o mandaci gli ingredienti di una ricetta.
            </Text>
          </View>
        ) : (
          (items ?? []).map((item) => (
            <ShoppingRow
              key={item.id}
              item={item}
              qKey={qKey}
              onLongPress={() => handleLongPress(item)}
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setShowAdd(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-accent rounded-full items-center justify-center"
        style={{ shadowColor: "#f97316", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
      >
        <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>+</Text>
      </Pressable>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { resetForm(); setShowAdd(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-card">
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-line">
            <Pressable onPress={() => { resetForm(); setShowAdd(false); }} className="py-1 px-2">
              <Text className="text-base text-muted">Annulla</Text>
            </Pressable>
            <Text className="text-base font-semibold text-ink">Aggiungi alla spesa</Text>
            <Pressable
              onPress={addItem}
              disabled={!name.trim() || loading}
              className={`py-1.5 px-4 rounded-full ${name.trim() && !loading ? "bg-accent" : "bg-line"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${name.trim() ? "text-white" : "text-soft"}`}>Aggiungi</Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            <TextInput
              className="text-base text-ink border-b border-line pb-3"
              placeholder="Cosa devi comprare?"
              placeholderTextColor="#a49a8e"
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={addItem}
            />

            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Quantità</Text>
                <TextInput
                  className="text-base text-ink bg-paper rounded-card px-3 py-2"
                  placeholder="es. 2"
                  placeholderTextColor="#a49a8e"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Unità</Text>
                <TextInput
                  className="text-base text-ink bg-paper rounded-card px-3 py-2"
                  placeholder="es. kg, L, pz"
                  placeholderTextColor="#a49a8e"
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Note</Text>
              <TextInput
                className="text-base text-ink bg-paper rounded-card px-3 py-2"
                placeholder="es. marca specifica, senza glutine..."
                placeholderTextColor="#a49a8e"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Categoria</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    className={`flex-row items-center px-3 py-2 rounded-card border ${
                      category === cat.value ? "bg-accent border-accent" : "bg-card border-line"
                    }`}
                    style={{ gap: 4 }}
                  >
                    <Text>{cat.emoji}</Text>
                    <Text className={`text-sm font-medium ${category === cat.value ? "text-white" : "text-ink"}`}>
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
