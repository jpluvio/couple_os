import { Tabs } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/kit";

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "oggi/index",     title: "Oggi",   icon: "home" },
  { name: "calendar/index", title: "Agenda", icon: "calendar" },
  { name: "pantry/index",   title: "Casa",   icon: "house" },
  { name: "finance/index",  title: "Soldi",  icon: "money" },
  { name: "checkin/index",  title: "Noi",    icon: "heart" },
];

export default function AppLayout() {
  const { session, loading } = useAuth();
  const { couple, loading: coupleLoading } = useCouple();
  const router = useRouter();

  if (loading || coupleLoading) {
    return (
      <View className="flex-1 bg-paper items-center justify-center">
        <ActivityIndicator size="large" color="#a8562e" />
      </View>
    );
  }

  // Utente autenticato ma non in una coppia → onboarding
  if (session && !couple) {
    return (
      <View className="flex-1 bg-paper items-center justify-center px-8">
        <Text className="font-display text-[28px] text-ink mb-3 text-center">
          Crea o unisciti a una coppia
        </Text>
        <Text className="text-muted text-center mb-8">
          Per usare Couple OS hai bisogno di un partner.
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/onboarding")}
          className="bg-ink px-8 py-4 rounded-pill"
        >
          <Text className="text-paper font-semibold text-base">Inizia</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fffdfa",
          borderTopColor: "#ece4d9",
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#1a1714",
        tabBarInactiveTintColor: "#a49a8e",
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600", marginTop: 3 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <Icon name={t.icon} color={color} size={21} />,
          }}
        />
      ))}

      {/* Raggiungibili da dentro le schermate, non dalla barra:
          sette voci in fondo erano il doppio del praticabile. */}
      <Tabs.Screen name="board/index" options={{ href: null }} />
      <Tabs.Screen name="todo/index" options={{ href: null }} />
      <Tabs.Screen name="memories/index" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
