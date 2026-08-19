import { Tabs } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { TabBarIcon } from "@/components/ui/TabBarIcon";

export default function AppLayout() {
  const { session, loading } = useAuth();
  const { couple, loading: coupleLoading } = useCouple();
  const router = useRouter();

  if (loading || coupleLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0e82ea" />
      </View>
    );
  }

  // Signed in but not in a couple yet → onboarding
  if (session && !couple) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
          Create or join a couple
        </Text>
        <Text className="text-gray-500 text-center mb-8">
          Couple OS needs a partner to work.
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/onboarding")}
          className="bg-brand-500 px-8 py-4 rounded-2xl"
        >
          <Text className="text-white font-semibold text-base">Get started</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#f3f4f6",
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#0e82ea",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="board/index"
        options={{
          title: "Board",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="📅" color={color} />,
        }}
      />
      <Tabs.Screen
        name="todo/index"
        options={{
          title: "To-Do",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="✅" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pantry/index"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="🛒" color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance/index"
        options={{
          title: "Finance",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="💰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin/index"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="memories/index"
        options={{
          title: "Memories",
          tabBarIcon: ({ color }) => <TabBarIcon emoji="📸" color={color} />,
        }}
      />
      {/* Reachable from the bell and from Budget, not as tabs */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="finance/categories" options={{ href: null }} />
      <Tabs.Screen name="finance/recurring" options={{ href: null }} />
    </Tabs>
  );
}
