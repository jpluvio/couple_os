import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, type DateData } from "react-native-calendars";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { EventCard, type CalendarEvent } from "@/components/calendar/EventCard";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { PartnerColors } from "@/constants/theme";

const QUERY_KEY = (coupleId: string) => ["events", coupleId];

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const queryClient = useQueryClient();

  const today = toYMD(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [showCreate, setShowCreate] = useState(false);

  const coupleId = couple?.id ?? "";
  const qKey = QUERY_KEY(coupleId);

  const myColor = PartnerColors[0];
  const partnerColor = PartnerColors[1];

  const { data: events } = useQuery({
    queryKey: qKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("couple_id", coupleId)
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data as CalendarEvent[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`calendar-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `couple_id=eq.${coupleId}` },
        () => { queryClient.invalidateQueries({ queryKey: qKey }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId]);

  // Build marked dates for the calendar
  const markedDates: Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};

  (events ?? []).forEach((ev) => {
    const day = ev.start_at.slice(0, 10);
    if (!markedDates[day]) markedDates[day] = { dots: [] };
    const isOwn = ev.creator_id === user?.id;
    const dot = { key: ev.id, color: isOwn ? myColor : partnerColor };
    markedDates[day].dots = [...(markedDates[day].dots ?? []), dot];
  });

  if (selectedDay) {
    markedDates[selectedDay] = {
      ...markedDates[selectedDay],
      selected: true,
      selectedColor: "#0e82ea",
    };
  }

  const dayEvents = (events ?? []).filter((ev) => ev.start_at.slice(0, 10) === selectedDay);

  const displayDay = new Date(selectedDay + "T12:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (!user || !couple) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Calendario</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Calendar */}
        <View className="bg-white mx-4 rounded-2xl overflow-hidden mb-4"
          style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <Calendar
            current={today}
            onDayPress={(day: DateData) => setSelectedDay(day.dateString)}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              todayTextColor: "#0e82ea",
              arrowColor: "#0e82ea",
              selectedDayBackgroundColor: "#0e82ea",
              selectedDayTextColor: "#ffffff",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textMonthFontWeight: "600",
              monthTextColor: "#111827",
              textDayHeaderFontSize: 12,
              textDayHeaderFontWeight: "600",
              dayTextColor: "#1f2937",
              textDisabledColor: "#d1d5db",
              calendarBackground: "#ffffff",
            }}
          />
        </View>

        {/* Legend */}
        <View className="flex-row px-4 mb-3" style={{ gap: 16 }}>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: myColor }} />
            <Text className="text-xs text-gray-500">I miei eventi</Text>
          </View>
          {partner && (
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: partnerColor }} />
              <Text className="text-xs text-gray-500">{partner.name ?? "Partner"}</Text>
            </View>
          )}
        </View>

        {/* Selected day events */}
        <View className="px-4 mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-700 capitalize">{displayDay}</Text>
          <Pressable
            onPress={() => setShowCreate(true)}
            className="flex-row items-center bg-blue-500 px-3 py-1.5 rounded-full"
            style={{ gap: 4 }}
          >
            <Text className="text-white text-sm">+</Text>
            <Text className="text-white text-xs font-semibold">Evento</Text>
          </Pressable>
        </View>

        {dayEvents.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-gray-400 text-sm">Nessun evento questo giorno</Text>
          </View>
        ) : (
          dayEvents.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              currentUserId={user.id}
              queryKey={qKey}
              partnerColor={partnerColor}
            />
          ))
        )}

        <View className="h-20" />
      </ScrollView>

      <CreateEventModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        coupleId={coupleId}
        creatorId={user.id}
        initialDate={selectedDay}
        queryKey={qKey}
      />
    </SafeAreaView>
  );
}
