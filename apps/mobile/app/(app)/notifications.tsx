import { View, Text, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification, NotificationType } from "@/types/database";

const TYPE_EMOJI: Record<NotificationType, string> = {
  post: "📋",
  event: "📅",
  expense: "💰",
  todo: "✅",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ora";
  if (min < 60) return `${min}m fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  return `${d}g fa`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, refetch, markRead, markAllRead } =
    useNotifications();

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => {
        if (!item.read) markRead(item.id);
      }}
      className={`flex-row items-start px-4 py-3 border-b border-gray-100 ${
        item.read ? "bg-white" : "bg-blue-50"
      }`}
    >
      <Text className="text-2xl mr-3">{TYPE_EMOJI[item.type as NotificationType] ?? "🔔"}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{item.title}</Text>
        <Text className="text-sm text-gray-600 mt-0.5">{item.body}</Text>
        <Text className="text-xs text-gray-400 mt-1">{timeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5" />}
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => router.back()} hitSlop={8} className="w-10">
          <Text className="text-2xl text-gray-700">‹</Text>
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Notifications</Text>
        <Pressable
          onPress={markAllRead}
          disabled={unreadCount === 0}
          hitSlop={8}
        >
          <Text
            className={`text-sm font-semibold ${
              unreadCount === 0 ? "text-gray-300" : "text-blue-500"
            }`}
          >
            Segna lette
          </Text>
        </Pressable>
      </View>

      <FlashList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        estimatedItemSize={80}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#0e82ea" />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-24 px-8">
              <Text className="text-5xl mb-4">🔔</Text>
              <Text className="text-lg font-semibold text-gray-700 text-center">
                No notifications
              </Text>
              <Text className="text-sm text-gray-400 text-center mt-1">
                Your partner's updates will show up here.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
