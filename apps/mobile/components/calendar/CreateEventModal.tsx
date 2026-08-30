import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

const EVENT_COLORS = ["#0e82ea", "#ec4899", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  coupleId: string;
  creatorId: string;
  initialDate: string; // YYYY-MM-DD
  queryKey: unknown[];
}

function toDateTimeLocal(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}

export function CreateEventModal({
  visible,
  onClose,
  coupleId,
  creatorId,
  initialDate,
  queryKey,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function submit() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const start_at = allDay
        ? `${initialDate}T00:00:00.000Z`
        : toDateTimeLocal(initialDate, startTime);
      const end_at = allDay
        ? `${initialDate}T23:59:59.000Z`
        : toDateTimeLocal(initialDate, endTime);

      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        all_day: allDay,
        start_at,
        end_at,
        color,
        couple_id: coupleId,
        creator_id: creatorId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
      handleClose();
    } catch {
      showAlert("Errore", "Impossibile creare l'evento. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTitle("");
    setDescription("");
    setLocation("");
    setAllDay(false);
    setStartTime("09:00");
    setEndTime("10:00");
    setColor(EVENT_COLORS[0]);
    onClose();
  }

  const displayDate = new Date(initialDate + "T12:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-card"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-line">
          <Pressable onPress={handleClose} className="py-1 px-2">
            <Text className="text-base text-muted">Annulla</Text>
          </Pressable>
          <Text className="text-base font-semibold text-ink">Nuovo evento</Text>
          <Pressable
            onPress={submit}
            disabled={!title.trim() || loading}
            className={`py-1.5 px-4 rounded-full ${title.trim() && !loading ? "bg-accent" : "bg-line"}`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className={`text-sm font-semibold ${title.trim() ? "text-white" : "text-soft"}`}>
                Salva
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          {/* Date display */}
          <Text className="text-sm text-accent font-medium mb-4 capitalize">{displayDate}</Text>

          {/* Title */}
          <TextInput
            className="text-xl font-semibold text-ink mb-4 border-b border-line pb-3"
            placeholder="Titolo evento"
            placeholderTextColor="#a49a8e"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          {/* All day toggle */}
          <View className="flex-row items-center justify-between py-3 border-b border-line mb-3">
            <Text className="text-base text-ink">Tutto il giorno</Text>
            <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: "#0e82ea" }} />
          </View>

          {/* Time pickers */}
          {!allDay && (
            <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Inizio</Text>
                <TextInput
                  className="bg-paper rounded-card px-3 py-2.5 text-base text-ink"
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-muted mb-1">Fine</Text>
                <TextInput
                  className="bg-paper rounded-card px-3 py-2.5 text-base text-ink"
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="10:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
          )}

          {/* Location */}
          <TextInput
            className="bg-paper rounded-card px-3 py-3 text-base text-ink mb-3"
            placeholder="📍 Luogo (opzionale)"
            placeholderTextColor="#a49a8e"
            value={location}
            onChangeText={setLocation}
          />

          {/* Description */}
          <TextInput
            className="bg-paper rounded-card px-3 py-3 text-base text-ink mb-4 min-h-20"
            placeholder="Note (opzionale)"
            placeholderTextColor="#a49a8e"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          {/* Color picker */}
          <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Colore
          </Text>
          <View className="flex-row" style={{ gap: 10 }}>
            {EVENT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: c }}
              >
                {color === c && <Text className="text-white text-sm font-bold">✓</Text>}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
