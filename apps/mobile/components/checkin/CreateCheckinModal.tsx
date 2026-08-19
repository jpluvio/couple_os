import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
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
      Alert.alert("Something went wrong", "The check-in could not be created. Please try again.");
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="py-1 px-2">
            <Text className="text-base text-gray-500">Cancel</Text>
          </Pressable>
          <Text className="text-base font-semibold text-gray-900">New check-in</Text>
          {/* Spazio per bilanciare l'header */}
          <View className="w-16" />
        </View>

        {/* Serve un partner per creare un check-in */}
        {!partnerId ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-5xl mb-4">💞</Text>
            <Text className="text-lg font-semibold text-gray-700 text-center">
              You need a partner
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-1">
              Invite your partner to the couple to start a check-in together.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            {/* Filtro per periodo */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
                      selected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-600"}`}>
                      {PERIOD_LABELS[p]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Lista prompt disponibili */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Scegli una domanda
            </Text>

            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#0e82ea" />
              </View>
            ) : !prompts || prompts.length === 0 ? (
              <View className="py-10 items-center">
                <Text className="text-sm text-gray-400 text-center">
                  No questions available for this period.
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
                      className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 flex-row items-center justify-between"
                    >
                      <Text className="text-base text-gray-800 flex-1 pr-3 leading-relaxed">
                        {prompt.text}
                      </Text>
                      {busy ? (
                        <ActivityIndicator size="small" color="#0e82ea" />
                      ) : (
                        <Text className="text-blue-500 text-xl">＋</Text>
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
