import { useState } from "react";
import { View, Text, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { useMemories, type MemoryWithAuthor } from "@/hooks/useMemories";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { CreateMemoryModal } from "@/components/memories/CreateMemoryModal";
import { MemoryDetailModal } from "@/components/memories/MemoryDetailModal";
import { NotificationBell } from "@/components/ui/NotificationBell";

export default function MemoriesScreen() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<MemoryWithAuthor | null>(null);

  const coupleId = couple?.id ?? "";
  const { data: memories, isLoading, refetch } = useMemories(coupleId);

  if (!user || !couple) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-start justify-between px-4 pt-2 pb-3">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Memories</Text>
          <Text className="text-sm text-gray-500 mt-0.5">The diary of your story</Text>
        </View>
        <NotificationBell />
      </View>

      <FlashList
        data={memories ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MemoryCard memory={item} onPress={() => setSelected(item)} />
        )}
        estimatedItemSize={300}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0e82ea" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-24 px-8">
              <Text className="text-5xl mb-4">📸</Text>
              <Text className="text-lg font-semibold text-gray-700 text-center">
                No memories yet
              </Text>
              <Text className="text-sm text-gray-400 text-center mt-1">
                Save your favourite moments together.
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => setShowCreate(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center"
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

      <CreateMemoryModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        coupleId={coupleId}
        authorId={user.id}
      />

      <MemoryDetailModal
        memory={selected}
        currentUserId={user.id}
        coupleId={coupleId}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}
