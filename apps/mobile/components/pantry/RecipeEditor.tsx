import { useState } from "react";
import {
  View, Text, Modal, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCouple } from "@/hooks/useCouple";
import { showAlert } from "@/lib/alert";
import { Icon, Label, Button } from "@/components/kit";
import type { RecipeIngredient } from "@/types/database";

/**
 * Editor degli ingredienti a righe strutturate.
 *
 * Prima era una textarea con un parser a regex che catturava la quantità
 * come un blob unico ("200g"), lasciando numero e unità incollati: da lì
 * non si può riscalare per porzioni. Qui i tre campi sono separati fin
 * dall'inserimento, che è l'unico modo perché il dato nasca pulito.
 *
 * Chi non ha un numero (basilico q.b.) lascia la quantità vuota e scrive
 * nel campo libero: quella riga resta non scalabile, per scelta.
 */
type Riga = { key: string; qta: string; unita: string; nome: string; libero: string };

function rigaVuota(): Riga {
  return { key: Math.random().toString(36).slice(2), qta: "", unita: "", nome: "", libero: "" };
}

function daIngrediente(i: RecipeIngredient): Riga {
  return {
    key: i.id,
    qta: i.quantity_num != null ? String(i.quantity_num) : "",
    unita: i.unit ?? "",
    nome: i.name,
    libero: i.quantity_text ?? "",
  };
}

export function RecipeEditor({
  visible,
  onClose,
  recipe,
}: {
  visible: boolean;
  onClose: () => void;
  recipe?: {
    id: string;
    title: string;
    description: string | null;
    servings: number;
    instructions: string | null;
    ingredients?: RecipeIngredient[];
  } | null;
}) {
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";

  const [titolo, setTitolo] = useState(recipe?.title ?? "");
  const [descrizione, setDescrizione] = useState(recipe?.description ?? "");
  const [preparazione, setPreparazione] = useState(recipe?.instructions ?? "");
  const [porzioni, setPorzioni] = useState(recipe?.servings ?? 2);
  const [righe, setRighe] = useState<Riga[]>(
    recipe?.ingredients?.length
      ? [...recipe.ingredients].sort((a, b) => a.sort_order - b.sort_order).map(daIngrediente)
      : [rigaVuota(), rigaVuota(), rigaVuota()]
  );
  const [salvataggio, setSalvataggio] = useState(false);

  function aggiorna(key: string, campo: keyof Riga, valore: string) {
    setRighe((r) => r.map((x) => (x.key === key ? { ...x, [campo]: valore } : x)));
  }

  async function salva() {
    const nome = titolo.trim();
    if (!nome || !coupleId) return;

    const items = righe
      .filter((r) => r.nome.trim())
      .map((r) => {
        const num = parseFloat(r.qta.replace(",", "."));
        return {
          name: r.nome.trim(),
          quantity_num: Number.isFinite(num) && num > 0 ? num : null,
          unit: r.unita.trim() || null,
          quantity_text: r.libero.trim() || null,
        };
      });

    if (items.length === 0) {
      showAlert("Manca qualcosa", "Aggiungi almeno un ingrediente.");
      return;
    }

    setSalvataggio(true);
    try {
      let recipeId = recipe?.id;

      if (recipeId) {
        const { error } = await supabase
          .from("recipes")
          .update({
            title: nome,
            description: descrizione.trim() || null,
            servings: porzioni,
            instructions: preparazione.trim() || null,
          })
          .eq("id", recipeId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("recipes")
          .insert({
            title: nome,
            description: descrizione.trim() || null,
            servings: porzioni,
            instructions: preparazione.trim() || null,
            couple_id: coupleId,
          })
          .select("id")
          .single();
        if (error) throw error;
        recipeId = data.id;
      }

      const { error: errIng } = await supabase.rpc("save_recipe_ingredients", {
        p_recipe_id: recipeId!,
        p_items: items,
      });
      if (errIng) throw errIng;

      queryClient.invalidateQueries({ queryKey: ["recipes", coupleId] });
      onClose();
    } catch (err) {
      showAlert(
        "Non salvata",
        "Impossibile salvare la ricetta. Se la migrazione 008 non è ancora applicata, questa funzione non è disponibile."
      );
      console.warn("[ricette] salvataggio:", err);
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-card">
        <View className="flex-row items-center justify-between border-b border-line px-5 pb-3 pt-5">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-[15px] text-muted">Annulla</Text>
          </Pressable>
          <Text className="text-[15px] font-semibold text-ink">
            {recipe ? "Modifica ricetta" : "Nuova ricetta"}
          </Text>
          <Pressable
            onPress={salva}
            disabled={!titolo.trim() || salvataggio}
            className={`rounded-pill px-4 py-1.5 ${titolo.trim() && !salvataggio ? "bg-ink" : "bg-line"}`}
          >
            {salvataggio ? (
              <ActivityIndicator size="small" color="#faf7f2" />
            ) : (
              <Text className={`text-[13px] font-semibold ${titolo.trim() ? "text-paper" : "text-soft"}`}>
                Salva
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 22, paddingBottom: 60 }}>
          <View style={{ gap: 8 }}>
            <Label>Titolo</Label>
            <TextInput
              className="border-b border-line pb-2 font-display text-[24px] text-ink"
              placeholder="Pasta alla Norma"
              placeholderTextColor="#c7bdb1"
              value={titolo}
              onChangeText={setTitolo}
              autoFocus
            />
          </View>

          <View style={{ gap: 8 }}>
            <Label>Note</Label>
            <TextInput
              className="rounded-card bg-paper px-3 py-2.5 text-[15px] text-ink"
              placeholder="Facoltative"
              placeholderTextColor="#a49a8e"
              value={descrizione}
              onChangeText={setDescrizione}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Label>Porzioni della ricetta base</Label>
            <View className="flex-row items-center justify-between rounded-pill border border-line bg-paper px-3 py-2.5">
              <Text className="text-[13.5px] text-muted">Le quantità qui sotto sono per</Text>
              <View className="flex-row items-center" style={{ gap: 16 }}>
                <Pressable
                  accessibilityLabel="Una porzione in meno"
                  onPress={() => setPorzioni(Math.max(1, porzioni - 1))}
                  className="h-8 w-8 items-center justify-center rounded-full border border-line bg-card"
                >
                  <Icon name="minus" size={14} color="#a8562e" width={2} />
                </Pressable>
                <Text className="min-w-[24px] text-center font-display text-[21px] text-ink">{porzioni}</Text>
                <Pressable
                  accessibilityLabel="Una porzione in più"
                  onPress={() => setPorzioni(Math.min(12, porzioni + 1))}
                  className="h-8 w-8 items-center justify-center rounded-full bg-accent"
                >
                  <Icon name="plus" size={14} color="#ffffff" width={2} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Label>Ingredienti</Label>
            <Text className="-mt-1 text-[12.5px] leading-[18px] text-soft">
              Quantità e unità separate: è quello che permette di ricalcolare le dosi.
              {"\n"}Senza numero (basilico q.b.) lascia la quantità vuota.
            </Text>

            {righe.map((r) => (
              <View key={r.key} className="flex-row items-center" style={{ gap: 7 }}>
                <TextInput
                  className="w-[58px] rounded-card bg-paper px-2 py-2.5 text-center text-[15px] text-ink"
                  placeholder="200"
                  placeholderTextColor="#c7bdb1"
                  keyboardType="decimal-pad"
                  value={r.qta}
                  onChangeText={(v) => aggiorna(r.key, "qta", v)}
                />
                <TextInput
                  className="w-[52px] rounded-card bg-paper px-2 py-2.5 text-center text-[15px] text-ink"
                  placeholder="g"
                  placeholderTextColor="#c7bdb1"
                  value={r.unita}
                  onChangeText={(v) => aggiorna(r.key, "unita", v)}
                />
                <TextInput
                  className="flex-1 rounded-card bg-paper px-3 py-2.5 text-[15px] text-ink"
                  placeholder="Ingrediente"
                  placeholderTextColor="#a49a8e"
                  value={r.nome}
                  onChangeText={(v) => aggiorna(r.key, "nome", v)}
                />
                <Pressable
                  accessibilityLabel="Togli la riga"
                  onPress={() => setRighe((x) => (x.length > 1 ? x.filter((y) => y.key !== r.key) : x))}
                  className="h-9 w-9 items-center justify-center"
                >
                  <Icon name="close" size={16} color="#a49a8e" />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() => setRighe((r) => [...r, rigaVuota()])}
              className="mt-1 flex-row items-center justify-center rounded-pill border border-line bg-paper py-2.5"
              style={{ gap: 7 }}
            >
              <Icon name="plus" size={15} color="#a8562e" width={2} />
              <Text className="text-[13.5px] font-semibold text-accent">Aggiungi ingrediente</Text>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Label>Preparazione</Label>
            <Text className="-mt-1 text-[12.5px] text-soft">Un passo per riga: l'app li numera da sola.</Text>
            <TextInput
              className="rounded-card bg-paper px-3 py-3 text-[15px] leading-[22px] text-ink"
              placeholder={"Taglia le melanzane a cubetti e falle friggere.\nScalda il sugo con l'aglio.\nUnisci la pasta e manteca."}
              placeholderTextColor="#a49a8e"
              value={preparazione}
              onChangeText={setPreparazione}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 130 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
