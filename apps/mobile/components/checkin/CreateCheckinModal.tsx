import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import type { CheckinPeriod } from "@/types/database";
import { useCheckinPrompts, type CheckInPrompt } from "@/hooks/useCheckins";
import { PERIODS, PERIOD_LABELS } from "./checkinShared";

interface CreateCheckinModalProps {
  visible: boolean;
  onClose: () => void;
  coupleId: string;
  currentUserId: string;
  partnerId: string | null;
  queryKey: unknown[];
}

export function CreateCheckinModal({
  visible,
  onClose,
  coupleId,
  currentUserId,
  partnerId,
  queryKey,
}: CreateCheckinModalProps) {
  const [period, setPeriod] = useState<CheckinPeriod>("weekly");
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useCheckinPrompts(period);

  async function createFromPrompt(prompt: CheckInPrompt) {
    if (!partnerId) return;
    setCreatingId(prompt.id);
    try {
      const { error } = await supabase.from("check_ins").insert({
        prompt: prompt.text,
        period_type: prompt.period_type,
        user1_id: currentUserId,
        user2_id: partnerId,
        couple_id: coupleId,
        revealed: false,
        mood1: null,
        response1: null,
        mood2: null,
        response2: null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
      onClose();
    } catch {
      showAlert("Errore", "Impossibile creare il check-in. Riprova.");
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-card">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-line">
          <Pressable onPress={onClose} className="py-1 px-2">
            <Text className="text-base text-muted">Annulla</Text>
          </Pressable>
          <Text className="text-base font-semibold text-ink">Nuovo check-in</Text>
          {/* Spazio per bilanciare l'header */}
          <View className="w-16" />
        </View>

        {/* Serve un partner per creare un check-in */}
        {!partnerId ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-5xl mb-4">💞</Text>
            <Text className="text-lg font-semibold text-ink text-center">
              Serve un partner
            </Text>
            <Text className="text-sm text-soft text-center mt-1">
              Invita il tuo partner alla coppia per iniziare un check-in insieme.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            {/* Filtro per periodo */}
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Periodo
            </Text>
            <View className="flex-row mb-5" style={{ gap: 8 }}>
              {PERIODS.map((p) => {
                const selected = p === period;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-full border ${
                      selected ? "bg-accent border-accent" : "bg-card border-line"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${selected ? "text-white" : "text-muted"}`}>
                      {PERIOD_LABELS[p]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Lista prompt disponibili */}
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Scegli una domanda
            </Text>

            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#a8562e" />
              </View>
            ) : !prompts || prompts.length === 0 ? (
              <View className="py-10 items-center">
                <Text className="text-sm text-soft text-center">
                  Nessuna domanda disponibile per questo periodo.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {prompts.map((prompt) => {
                  const busy = creatingId === prompt.id;
                  return (
                    <Pressable
                      key={prompt.id}
                      onPress={() => createFromPrompt(prompt)}
                      disabled={!!creatingId}
                      className="bg-paper border border-line rounded-card px-4 py-4 flex-row items-center justify-between"
                    >
                      <Text className="text-base text-ink flex-1 pr-3 leading-relaxed">
                        {prompt.text}
                      </Text>
                      {busy ? (
                        <ActivityIndicator size="small" color="#a8562e" />
                      ) : (
                        <Text className="text-accent text-xl">＋</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View className="h-10" />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
