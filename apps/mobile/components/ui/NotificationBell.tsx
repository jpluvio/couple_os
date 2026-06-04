import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      onPress={() => router.push("/(app)/notifications")}
      hitSlop={8}
      className="w-10 h-10 items-center justify-center"
    >
      <Text className="text-2xl">🔔</Text>
      {unreadCount > 0 && (
        <View className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full items-center justify-center">
          <Text className="text-white text-[10px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
