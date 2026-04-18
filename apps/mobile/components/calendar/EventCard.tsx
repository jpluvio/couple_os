import { View, Text, Pressable, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string | null;
  creator_id: string;
  couple_id: string;
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

interface EventCardProps {
  event: CalendarEvent;
  currentUserId: string;
  queryKey: unknown[];
  partnerColor: string;
}

export function EventCard({ event, currentUserId, queryKey, partnerColor }: EventCardProps) {
  const queryClient = useQueryClient();
  const isOwn = event.creator_id === currentUserId;
  const dotColor = isOwn ? "#0e82ea" : partnerColor;

  function handleLongPress() {
    if (!isOwn) return;
    Alert.alert(event.title, undefined, [
      {
        text: "🗑️ Elimina",
        style: "destructive",
        onPress: () =>
          Alert.alert("Elimina evento", "Sei sicuro?", [
            { text: "Annulla", style: "cancel" },
            {
              text: "Elimina",
              style: "destructive",
              onPress: async () => {
                await supabase.from("events").delete().eq("id", event.id);
                queryClient.invalidateQueries({ queryKey });
              },
            },
          ]),
      },
      { text: "Annulla", style: "cancel" },
    ]);
  }

  return (
    <Pressable
      onLongPress={handleLongPress}
      className="bg-white mx-4 mb-2 rounded-xl px-4 py-3 flex-row items-center"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
    >
      <View className="w-1 self-stretch rounded-full mr-3" style={{ backgroundColor: event.color ?? dotColor }} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800">{event.title}</Text>
        {!event.all_day && (
          <Text className="text-xs text-gray-400 mt-0.5">
            {formatTime(event.start_at)} – {formatTime(event.end_at)}
          </Text>
        )}
        {event.all_day && <Text className="text-xs text-gray-400 mt-0.5">Tutto il giorno</Text>}
        {event.location ? <Text className="text-xs text-gray-400 mt-0.5">📍 {event.location}</Text> : null}
      </View>
    </Pressable>
  );
}
