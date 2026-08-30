import { useState } from "react";
import { View, Text, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { useCheckins } from "@/hooks/useCheckins";
import { CheckinCard } from "@/components/checkin/CheckinCard";
import { CreateCheckinModal } from "@/components/checkin/CreateCheckinModal";
import { CheckinDetailModal } from "@/components/checkin/CheckinDetailModal";
import { NotificationBell } from "@/components/ui/NotificationBell";
import type { CheckIn } from "@/types/database";

export default function CheckinScreen() {
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const { checkins, isLoading, refetch, queryKey } = useCheckins();

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<CheckIn | null>(null);

  if (!user || !couple) return null;

  const coupleId = couple.id;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* Header */}
      <View className="flex-row items-start justify-between px-4 pt-2 pb-3">
        <View>
          <Text className="text-2xl font-bold text-ink">Check-in</Text>
          <Text className="text-sm text-muted mt-0.5">Il rituale di coppia</Text>
        </View>
        <NotificationBell />
      </View>

      <FlashList
        data={checkins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CheckinCard
            checkin={item}
            currentUserId={user.id}
            onPress={() => setSelected(item)}
          />
        )}
        estimatedItemSize={140}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#a8562e" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-24 px-8">
              <Text className="text-5xl mb-4">💬</Text>
              <Text className="text-lg font-semibold text-ink text-center">
                Nessun check-in ancora
              </Text>
              <Text className="text-sm text-soft text-center mt-1">
                Inizia un check-in: rispondete entrambi e poi scoprite le vostre risposte.
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => setShowCreate(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-accent rounded-full items-center justify-center"
        style={{
          shadowColor: "#0e82ea",
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>+</Text>
      </Pressable>

      {/* Modale di creazione */}
      <CreateCheckinModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        coupleId={coupleId}
        currentUserId={user.id}
        partnerId={partner?.id ?? null}
        queryKey={queryKey}
      />

      {/* Modale di dettaglio / risposta / reveal */}
      <CheckinDetailModal
        checkin={selected}
        currentUserId={user.id}
        partner={partner}
        currentUserName={user.name ?? null}
        queryKey={queryKey}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}
