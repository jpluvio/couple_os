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
  RefreshControl,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCouple } from "@/hooks/useCouple";

type Ingredient = { id: string; name: string; quantity: string | null; recipe_id: string };
type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  couple_id: string;
  created_at: string;
  ingredients?: Ingredient[];
};

export function RecipesTab() {
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";
  const qKey = ["recipes", coupleId];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("");
  const [ingredientLines, setIngredientLines] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: recipes, isLoading, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*, ingredients:recipe_ingredients(*)")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recipe[];
    },
  });

  function parseIngredients(text: string): { name: string; quantity: string | null }[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Try to parse "quantity name" (e.g. "200g farina", "2 uova")
        const match = line.match(/^([\d.,]+\s*\w*)\s+(.+)$/);
        if (match) return { quantity: match[1].trim(), name: match[2].trim() };
        return { quantity: null, name: line };
      });
  }

  async function addRecipe() {
    if (!title.trim() || !coupleId) return;
    setLoading(true);
    try {
      const { data: recipe, error } = await supabase
        .from("recipes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          servings: servings ? parseInt(servings) : null,
          couple_id: coupleId,
        })
        .select()
        .single();
      if (error) throw error;

      const parsed = parseIngredients(ingredientLines);
      if (parsed.length > 0) {
        await supabase.from("recipe_ingredients").insert(
          parsed.map((ing) => ({ ...ing, recipe_id: recipe.id }))
        );
      }

      queryClient.invalidateQueries({ queryKey: qKey });
      resetForm();
      setShowAdd(false);
    } catch {
      Alert.alert("Errore", "Impossibile aggiungere la ricetta.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setServings("");
    setIngredientLines("");
  }

  function handleLongPress(recipe: Recipe) {
    Alert.alert(recipe.title, undefined, [
      {
        text: "🗑️ Elimina",
        style: "destructive",
        onPress: async () => {
          await supabase.from("recipes").delete().eq("id", recipe.id);
          queryClient.invalidateQueries({ queryKey: qKey });
        },
      },
      { text: "Annulla", style: "cancel" },
    ]);
  }

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />
        }
      >
        {(recipes ?? []).length === 0 && !isLoading ? (
          <View className="items-center py-20 px-8">
            <Text className="text-5xl mb-4">👨‍🍳</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">Nessuna ricetta ancora</Text>
            <Text className="text-sm text-gray-400 text-center mt-1">
              Salva le vostre ricette preferite!
            </Text>
          </View>
        ) : (
          (recipes ?? []).map((recipe) => {
            const expanded = expandedId === recipe.id;
            return (
              <Pressable
                key={recipe.id}
                onPress={() => setExpandedId(expanded ? null : recipe.id)}
                onLongPress={() => handleLongPress(recipe)}
                className="bg-white mx-4 mb-3 rounded-xl overflow-hidden"
              >
                <View className="px-4 py-3 flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                      {recipe.title}
                    </Text>
                    {recipe.description ? (
                      <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={expanded ? undefined : 1}>
                        {recipe.description}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    {recipe.servings != null && (
                      <View className="flex-row items-center bg-orange-50 px-2 py-1 rounded-lg" style={{ gap: 3 }}>
                        <Text className="text-xs">🍽️</Text>
                        <Text className="text-xs font-medium text-orange-600">{recipe.servings}</Text>
                      </View>
                    )}
                    <Text className="text-gray-400 text-lg">{expanded ? "▲" : "▼"}</Text>
                  </View>
                </View>

                {expanded && (recipe.ingredients ?? []).length > 0 && (
                  <View className="px-4 pb-4 border-t border-gray-50">
                    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">
                      Ingredienti
                    </Text>
                    {(recipe.ingredients ?? []).map((ing) => (
                      <View key={ing.id} className="flex-row items-center py-1" style={{ gap: 8 }}>
                        <View className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <Text className="text-sm text-gray-700 flex-1">
                          {ing.quantity ? (
                            <Text className="font-medium text-gray-900">{ing.quantity} </Text>
                          ) : null}
                          {ing.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })
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
            <Text className="text-base font-semibold text-gray-900">Nuova ricetta</Text>
            <Pressable
              onPress={addRecipe}
              disabled={!title.trim() || loading}
              className={`py-1.5 px-4 rounded-full ${title.trim() && !loading ? "bg-orange-500" : "bg-gray-200"}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`text-sm font-semibold ${title.trim() ? "text-white" : "text-gray-400"}`}>Salva</Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            <TextInput
              className="text-base text-gray-800 border-b border-gray-100 pb-3"
              placeholder="Nome ricetta"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Descrizione</Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="Breve descrizione o note..."
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Porzioni</Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder="es. 4"
                placeholderTextColor="#9ca3af"
                value={servings}
                onChangeText={setServings}
                keyboardType="numeric"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingredienti</Text>
              <Text className="text-xs text-gray-400 mb-2">Un ingrediente per riga, es. "200g farina" o "2 uova"</Text>
              <TextInput
                className="text-base text-gray-800 bg-gray-50 rounded-xl px-3 py-2"
                placeholder={"200g farina\n2 uova\n100ml latte"}
                placeholderTextColor="#9ca3af"
                value={ingredientLines}
                onChangeText={setIngredientLines}
                multiline
                numberOfLines={6}
                style={{ minHeight: 120, textAlignVertical: "top" }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
