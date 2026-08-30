import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import type { CheckIn, User } from "@/types/database";
import { getCheckInStatus } from "@/hooks/useCheckins";
import { MOODS, moodEmoji, PERIOD_LABELS } from "./checkinShared";

interface CheckinDetailModalProps {
  checkin: CheckIn | null;
  currentUserId: string;
  partner: User | null;
  currentUserName: string | null;
  queryKey: unknown[];
  onClose: () => void;
}

export function CheckinDetailModal({
  checkin,
  currentUserId,
  partner,
  currentUserName,
  queryKey,
  onClose,
}: CheckinDetailModalProps) {
  const [mood, setMood] = useState<number | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Resetta lo stato del form quando cambia il check-in selezionato
  useEffect(() => {
    setMood(null);
    setResponse("");
  }, [checkin?.id]);

  if (!checkin) return null;

  const isUser1 = checkin.user1_id === currentUserId;
  const status = getCheckInStatus(checkin, currentUserId);

  // Risposte mappate sullo slot corretto
  const myMood = isUser1 ? checkin.mood1 : checkin.mood2;
  const myResponse = isUser1 ? checkin.response1 : checkin.response2;
  const partnerMood = isUser1 ? checkin.mood2 : checkin.mood1;
  const partnerResponse = isUser1 ? checkin.response2 : checkin.response1;

  async function submit() {
    if (!checkin || !mood || !response.trim()) return;
    setLoading(true);
    try {
      const partnerHasAnswered = isUser1 ? !!checkin.response2 : !!checkin.response1;

      // Scrive nello slot dell'utente corrente (mood1/response1 vs mood2/response2).
      // Se anche il partner ha già risposto, il check-in viene rivelato.
      const update = isUser1
        ? { mood1: mood, response1: response.trim() }
        : { mood2: mood, response2: response.trim() };

      const { error } = await supabase
        .from("check_ins")
        .update({ ...update, revealed: partnerHasAnswered })
        .eq("id", checkin.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
      onClose();
    } catch {
      showAlert("Errore", "Impossibile salvare la risposta. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  const partnerName = partner?.name ?? "Il partner";
  const myName = currentUserName ?? "Tu";

  return (
    <Modal
      visible={!!checkin}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="py-1 px-2">
            <Text className="text-base text-gray-500">Chiudi</Text>
          </Pressable>
          <Text className="text-base font-semibold text-gray-900">Check-in</Text>
          <View className="w-14" />
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          {/* Prompt */}
          <View className="bg-blue-50 rounded-2xl px-4 py-4 mb-4">
            <Text className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">
              {PERIOD_LABELS[checkin.period_type]}
            </Text>
            <Text className="text-lg font-semibold text-gray-900 leading-relaxed">
              {checkin.prompt}
            </Text>
          </View>

          {status === "revealed" ? (
            // ─── Reveal: entrambe le risposte affiancate ───
            <View style={{ gap: 12 }}>
              <AnswerCard
                name={myName}
                mood={myMood}
                response={myResponse}
                accent="blue"
              />
              <AnswerCard
                name={partnerName}
                mood={partnerMood}
                response={partnerResponse}
                accent="gray"
              />
            </View>
          ) : status === "waiting_partner" ? (
            // ─── Hai risposto, si aspetta il partner ───
            <View>
              <AnswerCard name={myName} mood={myMood} response={myResponse} accent="blue" />
              <View className="items-center py-8 px-6 mt-2">
                <Text className="text-4xl mb-3">⏳</Text>
                <Text className="text-base font-semibold text-gray-700 text-center">
                  In attesa di {partnerName}
                </Text>
                <Text className="text-sm text-gray-400 text-center mt-1">
                  La sua risposta sarà visibile quando avrà completato il check-in.
                </Text>
              </View>
            </View>
          ) : (
            // ─── Manca la tua risposta: form ───
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Come ti senti?
              </Text>
              <View className="flex-row justify-between mb-6">
                {MOODS.map((m) => {
                  const selected = mood === m.value;
                  return (
                    <Pressable
                      key={m.value}
                      onPress={() => setMood(m.value)}
                      className={`items-center justify-center w-14 h-14 rounded-2xl border ${
                        selected ? "bg-blue-50 border-blue-400" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className="text-2xl">{m.emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                La tua risposta
              </Text>
              <TextInput
                className="text-base text-gray-800 min-h-28 leading-relaxed border border-gray-200 rounded-2xl px-4 py-3"
                placeholder="Scrivi cosa ne pensi..."
                placeholderTextColor="#9ca3af"
                value={response}
                onChangeText={setResponse}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text className="text-xs text-gray-400 text-right mt-1 mb-5">
                {response.length}/1000
              </Text>

              <Pressable
                onPress={submit}
                disabled={!mood || !response.trim() || loading}
                className={`py-3.5 rounded-2xl items-center ${
                  mood && response.trim() && !loading ? "bg-blue-500" : "bg-gray-200"
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    className={`text-base font-semibold ${
                      mood && response.trim() ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Invia risposta
                  </Text>
                )}
              </Pressable>

              <Text className="text-xs text-gray-400 text-center mt-3">
                La tua risposta resterà nascosta finché anche {partnerName} non avrà risposto.
              </Text>
            </View>
          )}

          <View className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Card che mostra la risposta di una persona (mood + testo)
function AnswerCard({
  name,
  mood,
  response,
  accent,
}: {
  name: string;
  mood: number | null;
  response: string | null;
  accent: "blue" | "gray";
}) {
  const isBlue = accent === "blue";
  return (
    <View
      className={`rounded-2xl px-4 py-4 border ${
        isBlue ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-200"
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`text-sm font-semibold ${isBlue ? "text-blue-600" : "text-gray-700"}`}>
          {name}
        </Text>
        <Text className="text-2xl">{moodEmoji(mood)}</Text>
      </View>
      <Text className="text-base text-gray-800 leading-relaxed">
        {response ?? "—"}
      </Text>
    </View>
  );
}
