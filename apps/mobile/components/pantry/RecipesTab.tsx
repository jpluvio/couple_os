import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCouple } from "@/hooks/useCouple";
import { showAlert } from "@/lib/alert";
import { Card, Label, Icon, Badge, Button, Empty } from "@/components/kit";
import { SkeletonRowList } from "@/components/ui/Skeleton";
import type { RecipeIngredient } from "@/types/database";

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  ingredients?: RecipeIngredient[];
};

type PantryLite = { id: string; name: string; ingredient_id: string | null };

/** Stessa normalizzazione della `normalize_ingredient_name` in SQL. */
function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u").replace(/ç/g, "c").replace(/ñ/g, "n")
    .replace(/\s+/g, " ");
}

/**
 * Stessa regola di arrotondamento della RPC `add_recipe_to_shopping_list`.
 * Vive in due posti perché il server decide il dato e il client deve
 * mostrare in anticipo lo stesso numero: se divergessero, l'utente
 * vedrebbe una quantità e ne otterrebbe un'altra.
 */
function arrotonda(v: number, unit: string | null) {
  if (!unit) return Math.ceil(v);
  if (v >= 100) return Math.round(v / 10) * 10;
  if (v >= 10) return Math.round(v / 5) * 5;
  return Math.round(v * 2) / 2;
}

function formatQta(ing: RecipeIngredient, fattore: number) {
  if (ing.quantity_num == null) return ing.quantity_text ?? "q.b.";
  const v = arrotonda(ing.quantity_num * fattore, ing.unit);
  return ing.unit ? `${v} ${ing.unit}` : String(v);
}

export function RecipesTab() {
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";

  const [aperta, setAperta] = useState<string | null>(null);
  const [porzioni, setPorzioni] = useState<Record<string, number>>({});
  const [escluse, setEscluse] = useState<Record<string, boolean>>({});
  const [invio, setInvio] = useState(false);

  const { data: recipes, isLoading, refetch } = useQuery({
    queryKey: ["recipes", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, description, servings, ingredients:recipe_ingredients(*)")
        .eq("couple_id", coupleId)
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as Recipe[];
    },
  });

  // Serve solo a mostrare in anticipo cosa verrà escluso: la decisione
  // vera la prende la RPC, che vede la dispensa aggiornata.
  const { data: dispensa } = useQuery({
    queryKey: ["pantry-lite", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("pantry_items").select("id, name, ingredient_id").eq("couple_id", coupleId);
      return (data ?? []) as PantryLite[];
    },
  });

  function inDispensa(ing: RecipeIngredient) {
    if (!dispensa) return false;
    return dispensa.some((p) =>
      ing.ingredient_id && p.ingredient_id
        ? p.ingredient_id === ing.ingredient_id
        : norm(p.name) === norm(ing.name)
    );
  }

  async function aggiungiAllaLista(r: Recipe) {
    const scelte = porzioni[r.id] ?? r.servings;
    const escluseIds = (r.ingredients ?? [])
      .filter((i) => escluse[i.id])
      .map((i) => i.id);

    setInvio(true);
    try {
      const { data, error } = await supabase.rpc("add_recipe_to_shopping_list", {
        p_recipe_id: r.id,
        p_servings: scelte,
        p_escludi_in_dispensa: true,
        p_escludi_ids: escluseIds,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["shopping", coupleId] });
      const n = (data as unknown as number) ?? 0;
      showAlert(
        n === 0 ? "Niente da aggiungere" : "Aggiunti alla lista",
        n === 0
          ? "Hai già tutto in dispensa."
          : `${n} ${n === 1 ? "ingrediente aggiunto" : "ingredienti aggiunti"} per ${scelte} porzioni.`
      );
    } catch (err) {
      showAlert(
        "Non riuscito",
        "Impossibile aggiungere alla lista. Se la migrazione 008 non è ancora applicata, questa funzione non è disponibile."
      );
      console.warn("[ricette] add_recipe_to_shopping_list:", err);
    } finally {
      setInvio(false);
    }
  }

  if (isLoading && !recipes) return <SkeletonRowList count={4} />;

  if (!recipes || recipes.length === 0) {
    return <Empty title="Nessuna ricetta" hint="Salvane una e potrai mandarne gli ingredienti nella lista della spesa." />;
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#a8562e" />}
    >
      {recipes.map((r) => {
        const on = aperta === r.id;
        const scelte = porzioni[r.id] ?? r.servings;
        const fattore = scelte / Math.max(r.servings, 1);
        const ingredienti = [...(r.ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        const daAggiungere = ingredienti.filter(
          (i) => !escluse[i.id] && !inDispensa(i) && i.quantity_num != null
        ).length;

        return (
          <Card key={r.id}>
            <Pressable onPress={() => setAperta(on ? null : r.id)} className="flex-row items-start justify-between" style={{ gap: 12 }}>
              <View className="flex-1" style={{ gap: 2 }}>
                <Text className="font-display text-[23px] leading-[26px] text-ink">{r.title}</Text>
                <Text className="text-[13px] text-muted">
                  {r.description ? `${r.description} · ` : ""}Ricetta base per {r.servings}
                </Text>
              </View>
              <Icon name={on ? "chevronUp" : "chevronDown"} size={20} color="#a49a8e" />
            </Pressable>

            {on && (
              <View className="mt-4">
                {/* Porzioni */}
                <View className="flex-row items-center justify-between rounded-pill border border-line bg-paper px-3 py-2.5">
                  <Text className="text-[14px] text-muted">Porzioni</Text>
                  <View className="flex-row items-center" style={{ gap: 16 }}>
                    <Pressable
                      accessibilityLabel="Una porzione in meno"
                      onPress={() => setPorzioni({ ...porzioni, [r.id]: Math.max(1, scelte - 1) })}
                      className="h-8 w-8 items-center justify-center rounded-full border border-line bg-card"
                    >
                      <Icon name="minus" size={14} color="#a8562e" width={2} />
                    </Pressable>
                    <Text className="min-w-[24px] text-center font-display text-[21px] text-ink">{scelte}</Text>
                    <Pressable
                      accessibilityLabel="Una porzione in più"
                      onPress={() => setPorzioni({ ...porzioni, [r.id]: Math.min(12, scelte + 1) })}
                      className="h-8 w-8 items-center justify-center rounded-full bg-accent"
                    >
                      <Icon name="plus" size={14} color="#ffffff" width={2} />
                    </Pressable>
                  </View>
                </View>

                <View className="mb-1 mt-4">
                  <Label>Ingredienti · ricalcolati per {scelte}</Label>
                </View>

                {ingredienti.map((i, idx) => {
                  const gia = inDispensa(i);
                  const fuori = escluse[i.id];
                  const nonScalabile = i.quantity_num == null;
                  const spento = gia || fuori || nonScalabile;
                  return (
                    <Pressable
                      key={i.id}
                      onPress={() => setEscluse({ ...escluse, [i.id]: !fuori })}
                      className={`flex-row items-center py-2.5 ${idx < ingredienti.length - 1 ? "border-b border-hair" : ""}`}
                      style={{ gap: 12 }}
                    >
                      <Text
                        className={`w-[64px] ${nonScalabile ? "text-[13px] text-soft" : "font-display text-[15px]"}`}
                        style={nonScalabile ? undefined : { color: spento ? "#a49a8e" : "#a8562e" }}
                      >
                        {formatQta(i, fattore)}
                      </Text>
                      <Text
                        className="flex-1 text-[14.5px]"
                        style={{
                          color: spento ? "#8a7f74" : "#1a1714",
                          textDecorationLine: fuori ? "line-through" : "none",
                        }}
                      >
                        {i.name}
                      </Text>
                      {nonScalabile ? <Badge text="non scalato" color="#a49a8e" />
                        : gia ? <Badge text="in dispensa" color="#166534" />
                        : fuori ? <Badge text="esclusa" color="#a49a8e" />
                        : null}
                    </Pressable>
                  );
                })}

                <View className="mt-4">
                  {invio ? (
                    <View className="items-center py-3.5"><ActivityIndicator color="#a8562e" /></View>
                  ) : (
                    <Button
                      icon="cart"
                      label={daAggiungere === 0 ? "Hai già tutto" : `Aggiungi ${daAggiungere} alla lista`}
                      disabled={daAggiungere === 0}
                      onPress={() => aggiungiAllaLista(r)}
                    />
                  )}
                </View>

                <Text className="mt-2.5 text-center text-[12px] leading-[18px] text-soft">
                  Quello che hai già in dispensa resta fuori.{"\n"}Tocca una riga per escluderla o rimetterla.
                </Text>
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}
