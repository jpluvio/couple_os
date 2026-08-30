import { View, Text, Pressable} from "react-native";
import { showAlert } from "@/lib/alert";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
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

  async function deleteEvent() {
    await supabase.from("events").delete().eq("id", event.id);
    queryClient.invalidateQueries({ queryKey });
  }

  function handleLongPress() {
    if (!isOwn) return;
    showAlert(event.title, undefined, [
      { text: "🗑️ Elimina", style: "destructive", onPress: deleteEvent },
      { text: "Annulla", style: "cancel" },
    ]);
  }

  const card = (
    <Pressable
      onLongPress={handleLongPress}
      className="bg-card mx-4 mb-2 rounded-card px-4 py-3 flex-row items-center"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
    >
      <View className="w-1 self-stretch rounded-full mr-3" style={{ backgroundColor: event.color ?? dotColor }} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink">{event.title}</Text>
        {!event.all_day && (
          <Text className="text-xs text-soft mt-0.5">
            {formatTime(event.start_at)} – {formatTime(event.end_at)}
          </Text>
        )}
        {event.all_day && <Text className="text-xs text-soft mt-0.5">Tutto il giorno</Text>}
        {event.location ? <Text className="text-xs text-soft mt-0.5">📍 {event.location}</Text> : null}
      </View>
    </Pressable>
  );

  // Lo swipe elimina, quindi lo espone solo chi possiede l'evento:
  // sugli eventi del partner resterebbe un gesto che fallisce sulla RLS.
  if (!isOwn) return card;

  return (
    <SwipeToDelete onDelete={deleteEvent} confirmTitle="Eliminare l'evento?" confirmMessage={event.title}>
      {card}
    </SwipeToDelete>
  );
}
